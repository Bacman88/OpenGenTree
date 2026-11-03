/**
 * OpenGenTree OGT-040: the variant dictionary of given names, surnames and
 * places, and how person matching uses it. Invented people only.
 */

import { describe, it, expect } from 'vitest';
import {
    VARIANTS, createVariantIndex, VariantEntry, CANDIDATE_SIMILARITY,
    adjustPlaceSimilarity, adjustSurnameSimilarity,
} from '../ogt/variants/index.js';
import { quickMatch, findMatches, givenNameSimilarity, stringSimilarity } from '../merge/matching.js';
import { StromData, Person, PersonId, PartnershipId, Gender } from '../types.js';

function P(id: string, first: string, last: string, o: Partial<Person> = {}): Person {
    return {
        id: id as PersonId, firstName: first, lastName: last,
        gender: (o.gender as Gender) ?? 'male', isPlaceholder: false,
        partnerships: [] as PartnershipId[], parentIds: [] as PersonId[], childIds: [] as PersonId[],
        ...o,
    };
}
function tree(persons: Person[]): StromData {
    return {
        persons: Object.fromEntries(persons.map(p => [p.id, p])) as StromData['persons'],
        partnerships: {} as StromData['partnerships'],
    } as StromData;
}

describe('the built-in dictionary', () => {
    it('builds without errors (no form in two groups, no rejected pair inside a group, every place has an id)', () => {
        expect(VARIANTS.errors).toEqual([]);
    });

    it('marks every starting alias as a candidate to verify, and the exclusions as rejected', () => {
        const statuses = new Set(VARIANTS.entries.map(e => e.status));
        expect(statuses.has('verified')).toBe(false);
        for (const e of VARIANTS.entries) expect(['candidate', 'rejected']).toContain(e.status);
        expect(VARIANTS.entries.filter(e => e.status === 'rejected')).toHaveLength(3);
    });
});

describe('surnames: three layers kept apart', () => {
    it('layer 1 — the same text after normalization is not an alias', () => {
        expect(VARIANTS.compare('surname', 'Kopeć', 'Kopec')).toEqual({ kind: 'same' });
        expect(VARIANTS.compare('surname', 'Kołodziejczyk', 'Kolodziejczyk')).toEqual({ kind: 'same' });
    });

    it('layer 2 — historical and regional aliases, as candidates', () => {
        for (const [a, b] of [['Pyrek', 'Pirrek'], ['König', 'Koenig'], ['Kopeć', 'Kopetsch'], ['Burejza', 'Burieza'], ['Maniura', 'Manjura'], ['Krus', 'Kruhs']]) {
            const rel = VARIANTS.compare('surname', a, b);
            expect(rel.kind, `${a} ~ ${b}`).toBe('alias');
            if (rel.kind === 'alias') expect(rel.status).toBe('candidate');
        }
    });

    it('records the exclusions as different surnames', () => {
        expect(VARIANTS.compare('surname', 'Franczyk', 'Urbanczyk').kind).toBe('rejected');
        expect(VARIANTS.compare('surname', 'Idzik', 'Biedzik').kind).toBe('rejected');
        expect(VARIANTS.compare('surname', 'Wachowski', 'Blachowski').kind).toBe('rejected');
        expect(adjustSurnameSimilarity('Blachowski', 'Wachowski', stringSimilarity('Blachowski', 'Wachowski'))).toBe(0);
    });

    it('says nothing about names it does not know', () => {
        expect(VARIANTS.compare('surname', 'Maniura', 'Potempa').kind).toBe('none');
        expect(VARIANTS.compare('surname', 'Eckert', 'Ekert').kind).toBe('none');
    });

    it('keeps Kociba as its own written form while relating it to Koczyba', () => {
        expect(VARIANTS.compare('surname', 'Kociba', 'Koczyba').kind).toBe('alias');
        expect(VARIANTS.formsOf('surname', 'Kociba')).toContain('Kociba');
    });
});

describe('places: one location per group, by id', () => {
    it('resolves a place string by its longest known leading parts', () => {
        expect(VARIANTS.resolvePlace('Strzebiń, Lubliniec, Śląskie, Polska')?.id).toBe('strzebin');
        expect(VARIANTS.resolvePlace('Strzebin, Lublinitz')?.id).toBe('strzebin');
        expect(VARIANTS.resolvePlace('Strzebin O/S')?.id).toBe('strzebin');
        expect(VARIANTS.resolvePlace('Łazy, Strzebiń, Śląskie')?.id).toBe('strzebin-lazy');
        expect(VARIANTS.resolvePlace('Guttentag, Oberschlesien')?.id).toBe('dobrodzien');
    });

    it('does not guess places that share a common name or need identifying', () => {
        expect(VARIANTS.resolvePlace('Łazy')).toBeNull();
        expect(VARIANTS.resolvePlace('Lohna')).toBeNull();
    });

    it('keeps parts of a village apart from the village', () => {
        expect(VARIANTS.comparePlaces('Kolonia Strzebińska', 'Strzebiń').kind).toBe('distinct');
        expect(VARIANTS.comparePlaces('Bagno, Strzebiń', 'Strzebiń').kind).toBe('distinct');
        expect(VARIANTS.comparePlaces('Erdmannshain', 'Kolonia Strzebińska').kind).toBe('alias');
    });

    it('gives a candidate alias the lower place band and two different places 0', () => {
        expect(adjustPlaceSimilarity('Dobrodzień', 'Guttentag', 0)).toBe(0.8);
        expect(adjustPlaceSimilarity('Kolonia Strzebińska', 'Strzebiń', 0.9)).toBe(0);
        expect(adjustPlaceSimilarity('Kraków', 'Krakow', 1)).toBe(1);
    });
});

describe('given names', () => {
    it('relates Albert to Wojciech as a candidate, weaker than the register groups', () => {
        expect(givenNameSimilarity('Wojciech', 'Adalbert')).toBe(1);
        expect(givenNameSimilarity('Wojciech', 'Adalbertus')).toBe(1);
        expect(givenNameSimilarity('Albert', 'Wojciech')).toBe(CANDIDATE_SIMILARITY);
    });
});

describe('a dictionary built from other entries (later: the user\'s own)', () => {
    const e = (o: Partial<VariantEntry>): VariantEntry => ({ canonical: 'X', variants: [], type: 'surname', status: 'candidate', ...o });

    it('reports a form in two groups, a rejected pair inside a group and places without or with the same id', () => {
        const idx = createVariantIndex([
            e({ canonical: 'Nowak', variants: ['Nowack'] }),
            e({ canonical: 'Nowacki', variants: ['Nowack'] }),
            e({ canonical: 'Lis', variants: ['Liss'] }),
            e({ canonical: 'Lis', variants: ['Liss'], status: 'rejected' }),
            e({ canonical: 'Wieś', type: 'place' }),
            e({ canonical: 'Gród', type: 'place', id: 'a' }),
            e({ canonical: 'Gródek', type: 'place', id: 'a' }),
        ]);
        expect(idx.errors.some(m => m.includes('two groups'))).toBe(true);
        expect(idx.errors.some(m => m.includes('rejected pair'))).toBe(true);
        expect(idx.errors.some(m => m.includes('no id'))).toBe(true);
        expect(idx.errors.some(m => m.includes('used twice'))).toBe(true);
    });

    it('turns a verified alias into an equal surname', () => {
        const idx = createVariantIndex([e({ canonical: 'Szołtysek', variants: ['Scholtissek'], status: 'verified' })]);
        expect(adjustSurnameSimilarity('Szołtysek', 'Scholtissek', 0.2, idx)).toBe(1);
    });
});

describe('matching uses the dictionary as evidence, never as proof', () => {
    it('lets an alias surname with the same birth date match', () => {
        const r = quickMatch(P('a', 'Józef', 'Pyrek', { birthDate: '1850-03-04' }), P('b', 'Józef', 'Pirrek', { birthDate: '1850-03-04' }));
        expect(r.score).toBeGreaterThanOrEqual(50);
    });

    it('does not match on an alias surname alone', () => {
        const r = quickMatch(P('a', 'Jan', 'König'), P('b', 'Jan', 'Koenig'));
        expect(r.score).toBeLessThan(50);
    });

    it('keeps recorded different surnames apart even with the same name and date', () => {
        expect(quickMatch(P('a', 'Jan', 'Franczyk', { birthDate: '1880-01-01' }), P('b', 'Jan', 'Urbanczyk', { birthDate: '1880-01-01' })).score).toBe(0);
    });

    it('finds Maria König of Strzebiń in a German-spelled record of Strzebin, Lublinitz', () => {
        const existing = tree([P('e1', 'Maria', 'König', { gender: 'female', birthDate: '1890', birthPlace: 'Strzebiń' })]);
        const incoming = tree([P('i1', 'Marie', 'Koenig', { gender: 'female', birthDate: '1890', birthPlace: 'Strzebin, Lublinitz' })]);
        const m = findMatches(existing, incoming);
        expect(m).toHaveLength(1);
        expect(m[0].existingId).toBe('e1');
    });

    it('never rewrites the names or places it compares', () => {
        const incoming = tree([P('i1', 'Albert', 'Pirrek', { birthDate: '1850', birthPlace: 'Guttentag' })]);
        const before = JSON.stringify(incoming);
        findMatches(tree([P('e1', 'Wojciech', 'Pyrek', { birthDate: '1850', birthPlace: 'Dobrodzień' })]), incoming);
        expect(JSON.stringify(incoming)).toBe(before);
    });
});
