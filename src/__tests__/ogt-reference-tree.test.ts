/**
 * OpenGenTree OGT-050: preparing a reference tree for publishing, and the
 * checks an update must pass before it replaces the stored tree.
 * Invented data only.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { prepareReferenceData, reviewMarkdown, isPrivateLink } from '../ogt/reference-data.js';
import { verifyTreeBytes, compareVersions, ReferenceManifest } from '../ogt/reference-tree.js';
import { StromData, Person, Partnership, PersonId, PartnershipId, Gender } from '../types.js';

function P(id: string, first: string, last: string, o: Partial<Person> = {}): Person {
    return {
        id: id as PersonId, firstName: first, lastName: last, gender: (o.gender as Gender) ?? 'male',
        isPlaceholder: false, partnerships: [] as PartnershipId[], parentIds: [] as PersonId[], childIds: [] as PersonId[], ...o,
    };
}
function U(id: string, a: string, b: string, children: string[] = [], o: Partial<Partnership> = {}): Partnership {
    return { id: id as PartnershipId, person1Id: a as PersonId, person2Id: b as PersonId, childIds: children as PersonId[], status: 'married', ...o };
}
function tree(persons: Person[], unions: Partnership[] = []): StromData {
    return {
        persons: Object.fromEntries(persons.map(p => [p.id, p])) as StromData['persons'],
        partnerships: Object.fromEntries(unions.map(u => [u.id, u])) as StromData['partnerships'],
    } as StromData;
}
const OPTS = { causeCutoffYear: 1980, reviewFromYear: 1925, currentYear: 2026 };

describe('preparing a reference tree', () => {
    it('removes the cause of deaths from 1980 on and keeps older ones', () => {
        const input = tree([
            P('a', 'Jan', 'Krus', { birthDate: '1910', deathDate: '1985-03-01', deathCause: 'zawał', isDeceased: true }),
            P('b', 'Józef', 'Krus', { birthDate: '1880', deathDate: '1950-05-10', deathCause: 'gruźlica', isDeceased: true }),
            P('c', 'Anna', 'Krus', { gender: 'female', birthDate: '1915', isDeceased: true,
                events: [{ id: 'e1', type: 'death', date: '1990', cause: 'udar' }] as Person['events'] }),
        ]);
        const { data, report } = prepareReferenceData(input, OPTS);
        expect(data.persons['a' as PersonId].deathCause).toBeUndefined();
        expect(data.persons['b' as PersonId].deathCause).toBe('gruźlica');
        expect(data.persons['c' as PersonId].events![0].cause).toBeUndefined();
        expect(report.removedCauses.map(r => r.name).sort()).toEqual(['Anna Krus', 'Jan Krus']);
        expect(input.persons['a' as PersonId].deathCause).toBe('zawał'); // the input is not changed
    });

    it('keeps private links and accepts them when they carry nothing but name, sex and relations', () => {
        const input = tree([
            P('p', 'Osoba', 'prywatna', { childIds: ['k' as PersonId], parentIds: ['f' as PersonId] }),
            P('f', 'Franciszek', 'Maniura', { birthDate: '1900', deathDate: '1970', childIds: ['p' as PersonId] }),
            P('k', 'Osoba', 'prywatna', { parentIds: ['p' as PersonId] }),
        ]);
        const { data, report } = prepareReferenceData(input, OPTS);
        expect(report.privateLinks).toBe(2);
        expect(report.problems).toEqual([]);
        expect(Object.keys(data.persons)).toHaveLength(3);
        expect(isPrivateLink({ firstName: 'Osoba', lastName: 'prywatna' })).toBe(true);
    });

    it('blocks a private link that still carries data, also through its union', () => {
        const input = tree(
            [P('p', 'Osoba', 'prywatna', { birthPlace: 'Strzebiń' }), P('q', 'Osoba', 'prywatna'), P('m', 'Maria', 'Pyrek', { birthDate: '1890', deathDate: '1960' })],
            [U('u', 'q', 'm', [], { startDate: '1985-06-01', startPlace: 'Koszęcin' })],
        );
        const { report } = prepareReferenceData(input, OPTS);
        expect(report.problems.some(p => p.includes('birthPlace'))).toBe(true);
        expect(report.problems.some(p => p.includes('Związek u') && p.includes('startDate'))).toBe(true);
    });

    it('blocks a possibly living person, but not empty stand-ins', () => {
        const input = tree([P('l', 'Karolina', 'Watoła', { gender: 'female', birthDate: '1990' }), P('x', '?', '')]);
        const { report } = prepareReferenceData(input, OPTS);
        expect(report.problems).toHaveLength(1);
        expect(report.problems[0]).toContain('Karolina Watoła');
    });

    it('takes an undated child of 19th-century parents as deceased, and says so', () => {
        const input = tree([
            P('f', 'Franciszek', 'Ochmann', { birthDate: '1836', isDeceased: true, childIds: ['c' as PersonId] }),
            P('m', 'Marianna', 'Młynek', { gender: 'female', birthDate: '1837', isDeceased: true, childIds: ['c' as PersonId] }),
            P('c', '?', 'Ochmann', { gender: 'unknown', parentIds: ['f', 'm'] as PersonId[] }),
        ]);
        const { report } = prepareReferenceData(input, OPTS);
        expect(report.problems).toEqual([]);
        expect(report.deceasedByParents[0]).toContain('Ochmann');
    });

    it('flags notes for review: recent years and relatives of private links', () => {
        const input = tree([
            P('p', 'Osoba', 'prywatna', { parentIds: ['f' as PersonId] }),
            P('f', 'Franciszek', 'Maniura', { birthDate: '1900', deathDate: '1970', childIds: ['p' as PersonId], notes: 'Pracował w kopalni do 1965.' }),
            P('g', 'Wojciech', 'Krus', { birthDate: '1820', deathDate: '1880', notes: 'Gospodarz w Strzebiniu.' }),
        ]);
        const { report } = prepareReferenceData(input, OPTS);
        const franciszek = report.review.find(r => r.owner.startsWith('Franciszek'))!;
        expect(franciszek.flags.join(' ')).toContain('1965');
        expect(franciszek.flags.join(' ')).toContain('bliski krewny osoby prywatnej');
        expect(report.review.find(r => r.owner.startsWith('Wojciech'))!.flags).toEqual([]);
        expect(report.review[0].flags.length).toBeGreaterThan(0); // flagged first
        const md = reviewMarkdown(report, 'Test');
        expect(md).toContain('Oznaczone do sprawdzenia (1)');
        expect(md).toContain('> Pracował w kopalni do 1965.');
    });
});

describe('an update must be complete and verified before it replaces the tree', () => {
    const data = tree([P('a', 'Jan', 'Krus'), P('b', 'Anna', 'Krus', { gender: 'female' })]);
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    const sha = createHash('sha256').update(bytes).digest('hex');
    const manifest: ReferenceManifest = { id: 'r', name: 'R', version: '2026-12-01', file: 'r.json', bytes: bytes.byteLength, sha256: sha, persons: 2, partnerships: 0 };
    const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

    it('accepts the file the manifest describes', () => {
        expect(Object.keys(verifyTreeBytes(manifest, ab, sha).persons)).toHaveLength(2);
    });

    it('rejects a cut-off download, a changed file and a wrong person count', () => {
        expect(() => verifyTreeBytes(manifest, ab.slice(0, 10), sha)).toThrow(/size/);
        expect(() => verifyTreeBytes(manifest, ab, '0'.repeat(64))).toThrow(/SHA-256/);
        expect(() => verifyTreeBytes({ ...manifest, persons: 3 }, ab, sha)).toThrow(/persons/);
    });

    it('orders versions by date and number', () => {
        expect(compareVersions('2026-12-01', '2026-11-03')).toBeGreaterThan(0);
        expect(compareVersions('2026-11-03', '2026-11-03')).toBe(0);
        expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    });
});
