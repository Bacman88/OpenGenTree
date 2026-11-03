import { describe, it, expect } from 'vitest';
import { sameGivenName, givenNameKey } from '../given-names.js';

describe('sameGivenName', () => {
    it('takes the Latin, German and Czech register forms of a name as one name', () => {
        expect(sameGivenName('Wenceslaus', 'Václav')).toBe(true);
        expect(sameGivenName('Wenzel', 'Wenceslaus')).toBe(true);
        expect(sameGivenName('Catharina', 'Kateřina')).toBe(true);
        expect(sameGivenName('Katharina', 'Catharina')).toBe(true);
        expect(sameGivenName('Joannes', 'Jan')).toBe(true);
        expect(sameGivenName('Johann', 'Jan')).toBe(true);
        expect(sameGivenName('Matthäus', 'Matouš')).toBe(true);
        expect(sameGivenName('Josephus', 'Josef')).toBe(true);
    });

    it('compares without accents and case, several names word by word', () => {
        expect(sameGivenName('KATEŘINA', 'katerina')).toBe(true);
        expect(sameGivenName('Joannes Nepomucenus', 'Jan Nepomucenus')).toBe(true);
        expect(sameGivenName('Joannes Nepomucenus', 'Jan')).toBe(false);
    });

    it('takes the Polish form as the same name (Silesian registers)', () => {
        expect(sameGivenName('Józef', 'Josephus')).toBe(true);
        expect(sameGivenName('Józef', 'Josef')).toBe(true);
        expect(sameGivenName('Franciszek', 'Franz')).toBe(true);
        expect(sameGivenName('Wojciech', 'Adalbertus')).toBe(true);
        expect(sameGivenName('Wawrzyniec', 'Laurentius')).toBe(true);
        expect(sameGivenName('Marcin', 'Martinus')).toBe(true);
        expect(sameGivenName('Małgorzata', 'Margaretha')).toBe(true);
        expect(sameGivenName('Jadwiga', 'Hedwig')).toBe(true);
        expect(sameGivenName('Józef Franciszek', 'Josephus Franciscus')).toBe(true);
    });

    it('folds ł like an accent', () => {
        expect(sameGivenName('Łukasz', 'Lucas')).toBe(true);
        expect(sameGivenName('Paweł', 'Paulus')).toBe(true);
        expect(sameGivenName('Michał', 'Michael')).toBe(true);
        expect(sameGivenName('Łucja', 'Lucia')).toBe(true);
    });

    it('gives one key per name', () => {
        expect(givenNameKey('Józef')).toBe('josef');
        expect(givenNameKey('Joannes Nepomucenus')).toBe('jan nepomucenus');
        expect(givenNameKey('Bartosz')).toBe('bartosz');
    });

    it('keeps different names different', () => {
        expect(sameGivenName('Václav', 'Vojtěch')).toBe(false);
        expect(sameGivenName('Matěj', 'Matouš')).toBe(false);
        expect(sameGivenName('Marie', 'Magdalena')).toBe(false);
        expect(sameGivenName('Jan', 'Johana')).toBe(false);
        expect(sameGivenName('Józef', 'Józefa')).toBe(false);
        expect(sameGivenName('Franciszek', 'Franciszka')).toBe(false);
        expect(sameGivenName('Maciej', 'Mateusz')).toBe(false);
    });
});
