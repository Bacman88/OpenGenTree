/**
 * OpenGenTree OGT-060: the calendar next to date fields and the place
 * suggestions. Invented data only.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { pickerValueFor, textFromPicker, datePreview } from '../ogt/date-input.js';
import { buildPlaceCandidates, suggestPlaces } from '../ogt/place-suggest.js';
import { VARIANTS } from '../ogt/variants/index.js';
import { setLanguage } from '../strings.js';

describe('date fields: the calendar and the preview', () => {
    beforeEach(() => setLanguage('pl'));

    it('opens the calendar on a full exact date only', () => {
        expect(pickerValueFor('15.5.1880')).toBe('1880-05-15');
        expect(pickerValueFor('1880-05-15')).toBe('1880-05-15');
        expect(pickerValueFor('1880')).toBe('');
        expect(pickerValueFor('5.1880')).toBe('');
        expect(pickerValueFor('ok. 1880')).toBe('');
        expect(pickerValueFor('')).toBe('');
        expect(pickerValueFor('xyz')).toBe('');
    });

    it('writes the chosen date in the app format', () => {
        expect(textFromPicker('1880-05-15')).toBe('15.5.1880');
        expect(textFromPicker('0999-01-02')).toBe('2.1.999');
        expect(textFromPicker('')).toBe('');
    });

    it('a chosen date reads back to the same calendar day', () => {
        for (const v of ['1740-12-31', '1904-02-29', '2001-07-04']) expect(pickerValueFor(textFromPicker(v))).toBe(v);
    });

    it('shows how the text is understood', () => {
        expect(datePreview('15.5.1880')).toBe('15 maja 1880');
        expect(datePreview('1880')).toBe('');            // nothing new to say
        expect(datePreview('')).toBe('');
        expect(datePreview('31.2.1880')).toBe('');       // invalid: Strom's red border instead
    });
});

describe('place suggestions', () => {
    const tree = [
        { display: 'Strzebiń', count: 40 },
        { display: 'Strzybnica', count: 2 },
        { display: 'Łazy, Strzebiń', count: 12 },
        { display: 'Lubliniec', count: 5 },
    ];
    const candidates = buildPlaceCandidates(tree, VARIANTS.entries, [{ display: 'Strzebiń', count: 900 }, { display: 'Sierakowice', count: 30 }]);
    const names = (q: string) => suggestPlaces(q, candidates).map(s => s.display);

    it('matches without Polish letters and by the start of any word', () => {
        expect(names('Str')[0]).toBe('Strzebiń');
        expect(names('Str')).toContain('Strzybnica');
        expect(names('la')).toContain('Łazy, Strzebiń');
        expect(names('koszec')).toEqual(['Koszęcin']);
        expect(names('LUB')).toEqual(expect.arrayContaining(['Lubliniec', 'Lubsza Śl.']));
    });

    it('puts the open tree before the dictionary and the reference tree, most used first', () => {
        const s = suggestPlaces('s', candidates).map(x => [x.display, x.source]);
        expect(s[0]).toEqual(['Strzebiń', 'tree']);
        expect(s.findIndex(x => x[1] === 'dictionary')).toBeLessThan(s.findIndex(x => x[0] === 'Sierakowice'));
        expect(s).toContainEqual(['Sierakowice', 'reference']);
    });

    it('leads a historical spelling to the place and says which one matched', () => {
        expect(suggestPlaces('Koschen', candidates)).toEqual([{ display: 'Koszęcin', source: 'dictionary', via: 'Koschentin' }]);
        expect(suggestPlaces('guttent', candidates)[0]).toMatchObject({ display: 'Dobrodzień', via: 'Guttentag' });
    });

    it('keeps one entry per place, in the tree spelling', () => {
        expect(names('strzebin').filter(n => n === 'Strzebiń')).toHaveLength(1);
        expect(candidates.find(c => c.display === 'Strzebiń')!.source).toBe('tree');
    });

    it('suggests nothing for an empty field, an unknown name, or a name already typed in full', () => {
        expect(names('')).toEqual([]);
        expect(names('Zzz')).toEqual([]);
        expect(names('Koszecin')).toEqual([]);
    });

    it('shows at most eight', () => {
        const many = buildPlaceCandidates(Array.from({ length: 20 }, (_, i) => ({ display: `Wola ${i}`, count: i })), [], []);
        expect(suggestPlaces('wo', many)).toHaveLength(8);
        expect(suggestPlaces('wo', many)[0].display).toBe('Wola 19');
    });
});

describe('date preview with qualifiers and ranges', () => {
    beforeEach(() => setLanguage('pl'));
    it('names the month in Polish also after "ok." and in ranges', () => {
        expect(datePreview('ok. 3.4.1850')).toContain('3 kwietnia 1850');
        expect(datePreview('5.1880')).toBe('maj 1880');
    });
    it('in English names the month too', () => {
        setLanguage('en');
        expect(datePreview('1880-05-15')).toBe('15 May 1880');
    });
});
