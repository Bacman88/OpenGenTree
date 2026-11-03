/**
 * Register forms of a given name in person matching (OpenGenTree, OGT-040A-01).
 * The same person kept in a Latin-register tree and in a Polish one must be
 * offered as a match; different names that merely look alike must not gain.
 * Invented data only.
 */

import { describe, it, expect } from 'vitest';
import { givenNameSimilarity, stringSimilarity, quickMatch, findMatches } from '../merge/matching.js';
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

describe('givenNameSimilarity', () => {
    it('is 1 for register forms of one name, where letters alone say little', () => {
        expect(stringSimilarity('Joannes', 'Jan')).toBeLessThan(0.5);
        expect(givenNameSimilarity('Joannes', 'Jan')).toBe(1);
        expect(givenNameSimilarity('Johann', 'Jan')).toBe(1);
        expect(givenNameSimilarity('Józef', 'Josephus')).toBe(1);
        expect(givenNameSimilarity('Wawrzyniec', 'Laurentius')).toBe(1);
    });

    it('keeps letter similarity for names no group joins', () => {
        expect(givenNameSimilarity('Bartosz', 'Bartosz')).toBe(1);
        expect(givenNameSimilarity('Maciej', 'Mateusz')).toBeLessThan(1);
        expect(givenNameSimilarity('Maciej', 'Mateusz')).toBeCloseTo(stringSimilarity('Maciej', 'Mateusz'), 5);
    });

    it('treats a missing name as no name', () => {
        expect(givenNameSimilarity('', 'Jan')).toBe(0);
        expect(givenNameSimilarity('', '')).toBe(0);
    });
});

describe('quickMatch across a Latin and a Polish tree', () => {
    it('matches Joannes and Jan of one surname and birth date', () => {
        const a = P('a1', 'Joannes', 'Maniura', { birthDate: '1850-03-04' });
        const b = P('b1', 'Jan', 'Maniura', { birthDate: '1850-03-04' });
        const r = quickMatch(a, b);
        expect(r.score).toBeGreaterThanOrEqual(50);
        expect(r.reasons).toContain('name');
        expect(r.reasons).toContain('birth');
    });

    it('still keeps namesakes with conflicting birth dates apart', () => {
        const a = P('a1', 'Josephus', 'Potempa', { birthDate: '1850-03-04' });
        const b = P('b1', 'Józef', 'Potempa', { birthDate: '1871-11-20' });
        expect(quickMatch(a, b).score).toBe(0);
    });

    it('does not join Józef with Józefa (different people, different genders)', () => {
        const a = P('a1', 'Józef', 'Potempa', { birthDate: '1850-03-04' });
        const b = P('b1', 'Józefa', 'Potempa', { birthDate: '1850-03-04', gender: 'female' });
        expect(quickMatch(a, b).score).toBe(0);
    });
});

describe('findMatches across a Latin and a Polish tree', () => {
    it('pairs Josephus Franciscus with Józef Franciszek', () => {
        const existing = tree([P('e1', 'Józef Franciszek', 'Maniura', { birthDate: '1888-05-12' })]);
        const incoming = tree([P('i1', 'Josephus Franciscus', 'Maniura', { birthDate: '1888-05-12' })]);
        const m = findMatches(existing, incoming);
        expect(m).toHaveLength(1);
        expect(m[0].existingId).toBe('e1');
        expect(m[0].incomingId).toBe('i1');
    });

    it('pairs Wawrzyniec with Laurentius on the first of several names', () => {
        const existing = tree([P('e1', 'Wawrzyniec', 'König', { birthDate: '1801' })]);
        const incoming = tree([P('i1', 'Laurentius Josephus', 'König', { birthDate: '1801' })]);
        const m = findMatches(existing, incoming);
        expect(m).toHaveLength(1);
    });
});
