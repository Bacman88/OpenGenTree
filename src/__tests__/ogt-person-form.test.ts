/**
 * OpenGenTree OGT-041: the death fields follow the "Deceased" switch, but
 * written data is never hidden.
 */

import { describe, it, expect } from 'vitest';
import { deathFieldsVisible } from '../ogt/person-form.js';

describe('death fields in the person form', () => {
    it('are hidden for a living person with nothing written', () => {
        expect(deathFieldsVisible(false, ['', '', '', '', ''])).toBe(false);
        expect(deathFieldsVisible(false, ['  ', '', '', '', ''])).toBe(false);
    });

    it('show once the switch is on', () => {
        expect(deathFieldsVisible(true, ['', '', '', '', ''])).toBe(true);
    });

    it('stay shown whenever something is written, whatever the switch says', () => {
        expect(deathFieldsVisible(false, ['1880', '', '', '', ''])).toBe(true);
        expect(deathFieldsVisible(false, ['', 'Strzebiń', '', '', ''])).toBe(true);
        expect(deathFieldsVisible(false, ['', '', 'cholera', '', ''])).toBe(true);
    });
});
