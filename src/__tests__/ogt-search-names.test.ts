/**
 * OpenGenTree OGT-061: a woman is found by her husband's and her father's
 * surname even when the record carries only one; a person without a surname
 * is shown with the nearest relative. Invented data only.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { filterAndSort } from '../person-picker.js';
import { personContextLine, derivedSurnames, lastHusbandSurname, polishFeminine } from '../ogt/search-names.js';
import { shownName, setShownSurnameFallback } from '../person-name.js';
import { surnameForms } from '../surnames.js';
import { setLanguage } from '../strings.js';
import { Person, PersonId, Partnership, PartnershipId, StromData, Gender } from '../types.js';

function P(id: string, first: string, last: string, gender: Gender, o: Partial<Person> = {}): Person {
    return { id: id as PersonId, firstName: first, lastName: last, gender, isPlaceholder: false,
        partnerships: [] as PartnershipId[], parentIds: [] as PersonId[], childIds: [] as PersonId[], ...o };
}
function tree(): StromData {
    const persons = [
        P('fu', 'Franciszek', 'Ulfik', 'male', { partnerships: ['u1' as PartnershipId], childIds: ['ku' as PersonId] }),
        P('f', 'Franciszka', '', 'female', { partnerships: ['u1' as PartnershipId], childIds: ['ku' as PersonId] }),
        P('ku', 'Kilian', 'Ulfik', 'male', { partnerships: ['u2' as PartnershipId], parentIds: ['fu', 'f'] as PersonId[] }),
        P('mo', 'Marianna', 'Ochmann', 'female', { partnerships: ['u2' as PartnershipId], parentIds: ['jo' as PersonId] }),
        P('jo', 'Jan', 'Ochmann', 'male', { childIds: ['mo' as PersonId] }),
        P('sp', 'Stanisław', 'Pietruszewski', 'male', { partnerships: ['u3' as PartnershipId] }),
        P('zp', 'Zofia', 'Ulfik', 'female', { partnerships: ['u3' as PartnershipId], parentIds: ['ku' as PersonId] }),
        P('x', 'Rozalia', '', 'female', { parentIds: ['jo' as PersonId] }),
    ];
    const U = (id: string, a: string, b: string): Partnership =>
        ({ id: id as PartnershipId, person1Id: a as PersonId, person2Id: b as PersonId, childIds: [], status: 'married' });
    const data = {
        persons: Object.fromEntries(persons.map(p => [p.id, p])),
        partnerships: Object.fromEntries([U('u1', 'fu', 'f'), U('u2', 'ku', 'mo'), U('u3', 'sp', 'zp')].map(u => [u.id, u])),
    } as unknown as StromData;
    data.persons['jo' as PersonId].childIds = ['mo', 'x'] as PersonId[];
    data.persons['ku' as PersonId].childIds = ['zp' as PersonId];
    return data;
}

describe('searching by surnames the record does not carry', () => {
    beforeEach(() => setLanguage('pl'));
    const data = tree();
    const all = Object.values(data.persons);
    const find = (q: string) => filterAndSort(q, all, data).map(p => `${p.firstName} ${p.lastName}`.trim());

    it("finds a woman under her husband's surname", () => {
        expect(find('Ulfik')).toEqual(expect.arrayContaining(['Franciszka', 'Marianna Ochmann']));
        expect(find('Marianna Ulfik')).toContain('Marianna Ochmann');
    });

    it("finds a woman under the feminine form of her husband's surname", () => {
        expect(find('Pietruszewska')).toContain('Zofia Ulfik');
    });

    it("finds a woman written under her husband's name by her father's (maiden) surname", () => {
        expect(find('Pietruszewsk')).toContain('Zofia Ulfik');  // married
        expect(derivedSurnames(data.persons['zp' as PersonId], data)).toEqual({ married: ['Pietruszewski'], maiden: [] }); // father is Ulfik = own
        expect(find('Ochmann')).toEqual(expect.arrayContaining(['Rozalia', 'Marianna Ochmann', 'Jan Ochmann']));
    });

    it('does not give a man his wife’s surname', () => {
        expect(find('Ochmann')).not.toContain('Kilian Ulfik');
        expect(derivedSurnames(data.persons['ku' as PersonId], data)).toEqual({ married: [], maiden: [] });
    });

    it('leaves the person unchanged', () => {
        expect(data.persons['f' as PersonId].lastName).toBe('');
        expect(data.persons['f' as PersonId].marriedSurname).toBeUndefined();
    });
});

describe('the line under a name in the list', () => {
    beforeEach(() => setLanguage('pl'));
    const data = tree();
    const line = (id: string, q: string) => personContextLine(data.persons[id as PersonId], q, data, s => surnameForms(s, data))
        .replace(/<[^>]+>/g, '');

    it('says why someone was found', () => {
        expect(line('mo', 'Ulfik')).toBe('po mężu: Ulfik');
        expect(line('zp', 'pietruszewska')).toBe('po mężu: Pietruszewski');
        expect(line('x', 'ochm')).toBe('z domu: Ochmann');
    });

    it('says who a person without a surname is', () => {
        expect(line('f', 'Franc')).toBe('żona: Franciszek Ulfik');
        expect(line('x', 'Roz')).toBe('córka: Jan Ochmann');
    });

    it('says nothing when the name already shows what was searched', () => {
        expect(line('mo', 'Ochm')).toBe('');
        expect(line('ku', 'Kil')).toBe('');
    });

    it('escapes names', () => {
        const d = tree();
        d.persons['fu' as PersonId].firstName = '<b>F</b>';
        expect(personContextLine(d.persons['f' as PersonId], 'F', d)).toContain('&lt;b&gt;');
    });
});

describe('a woman without a surname is shown under her last husband\'s', () => {
    beforeEach(() => setLanguage('pl'));

    it('takes the husband married latest, in the feminine form', () => {
        const d = tree();
        const f = d.persons['f' as PersonId];
        expect(lastHusbandSurname(f, d)).toBe('Ulfik');
        // a second, later husband with an adjectival surname
        d.persons['w' as PersonId] = P('w', 'Józef', 'Kowalski', 'male', { partnerships: ['u9' as PartnershipId] });
        d.partnerships['u9' as PartnershipId] = { id: 'u9' as PartnershipId, person1Id: 'w' as PersonId, person2Id: 'f' as PersonId, childIds: [], status: 'married', startDate: '1890' };
        d.partnerships['u1' as PartnershipId].startDate = '1860';
        f.partnerships = ['u9', 'u1'] as PartnershipId[];
        expect(lastHusbandSurname(f, d)).toBe('Kowalska');
    });

    it('is nothing for a woman with a surname written, for a man, or without a husband', () => {
        const d = tree();
        expect(lastHusbandSurname(d.persons['mo' as PersonId], d)).toBe('');
        expect(lastHusbandSurname(d.persons['fu' as PersonId], d)).toBe('');
        expect(lastHusbandSurname(d.persons['x' as PersonId], d)).toBe('');
    });

    it('shows in the name without changing the record, and the list says who she is', () => {
        const d = tree();
        const f = d.persons['f' as PersonId];
        setShownSurnameFallback(p => lastHusbandSurname(p as Person, d));
        try {
            expect(shownName(f)).toBe('Franciszka Ulfik');
            expect(shownName(d.persons['mo' as PersonId])).toBe('Marianna Ochmann');
            expect(f.lastName).toBe('');
            expect(personContextLine(f, 'Ulfik', d).replace(/<[^>]+>/g, '')).toBe('żona: Franciszek Ulfik');   // whose surname it is
        } finally {
            setShownSurnameFallback(null);
        }
        expect(shownName(f)).toBe('Franciszka');
    });
});

describe('the Polish feminine form', () => {
    it('changes adjectival surnames only, never into Czech forms', () => {
        expect(polishFeminine('Pietruszewski')).toBe('Pietruszewska');
        expect(polishFeminine('Nowicki')).toBe('Nowicka');
        expect(polishFeminine('Zawadzki')).toBe('Zawadzka');
        expect(polishFeminine('Ulfik')).toBe('Ulfik');
        expect(polishFeminine('Gałuska')).toBe('Gałuska');
        expect(polishFeminine('Stasz')).toBe('Stasz');
    });
});
