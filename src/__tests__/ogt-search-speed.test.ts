/**
 * OpenGenTree: the person search on a big tree (the reference tree has
 * ~6 700 people) must not re-scan the tree for every person. Invented data.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { filterAndSort } from '../person-picker.js';
import { setLanguage } from '../strings.js';
import { Person, PersonId, PartnershipId, StromData } from '../types.js';

const SURNAMES = ['Krus', 'Maniura', 'Świerc', 'Pyrek', 'Ochmann', 'Watoła', 'Szopa', 'Młynek'];
const FIRST = ['Jan', 'Józef', 'Marianna', 'Franciszek', 'Anna', 'Wawrzyniec', 'Agnieszka', 'Paweł'];

function bigTree(n: number): { data: StromData; persons: Person[] } {
    const persons: Person[] = Array.from({ length: n }, (_, i) => ({
        id: `p${i}` as PersonId, firstName: FIRST[i % 8], lastName: `${SURNAMES[(i * 7) % 8]}${i % 50 ? '' : 'ski'}`,
        gender: i % 2 ? 'female' : 'male', isPlaceholder: false,
        partnerships: [] as PartnershipId[], parentIds: [] as PersonId[], childIds: [] as PersonId[], birthDate: `${1700 + (i % 250)}`,
    }));
    return { data: { persons: Object.fromEntries(persons.map(p => [p.id, p])), partnerships: {} } as unknown as StromData, persons };
}

describe('person search on a big tree', () => {
    beforeAll(() => setLanguage('pl'));

    it('finds people and answers a keystroke quickly at 7 000 people', () => {
        const { data, persons } = bigTree(7000);
        const t0 = performance.now();
        for (const q of ['M', 'Ma', 'Mar', 'MariA', 'MariAfdfd']) filterAndSort(q, persons, data, true);
        const ms = (performance.now() - t0) / 5;
        expect(filterAndSort('MariAfdfd', persons, data, true)).toEqual([]);
        expect(filterAndSort('swierc', persons, data, true).length).toBeGreaterThan(0);
        expect(ms).toBeLessThan(400);   // was several seconds a keystroke in Chrome
    });
});
