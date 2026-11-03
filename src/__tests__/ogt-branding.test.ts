/**
 * OpenGenTree (OGT-011): the About dialog shows the fork's name in every
 * language and keeps the original author.
 */

import { describe, it, expect } from 'vitest';
import { getStringsForLang, setLanguage, SUPPORTED_LANGUAGES } from '../strings.js';
import { applyBrandStrings, BRAND_ABOUT } from '../ogt/branding.js';

describe('OpenGenTree brand texts', () => {
    it('names the app OpenGenTree in the About dialog of every language', () => {
        for (const { code } of SUPPORTED_LANGUAGES) {
            expect(getStringsForLang(code).about.title).toContain('OpenGenTree');
            expect(getStringsForLang(code).about.title).toBe(BRAND_ABOUT[code].title);
        }
    });

    it('says it is a fork of Strom and keeps the author', () => {
        for (const { code } of SUPPORTED_LANGUAGES) {
            const about = getStringsForLang(code).about;
            expect(about.createdBy).toContain('Strom');
            expect(about.authorName).toBe('Milan Víšek');
        }
    });

    it('holds after a language switch and when applied twice', () => {
        applyBrandStrings();
        setLanguage('pl');
        expect(getStringsForLang('pl').about.title).toBe('O aplikacji OpenGenTree');
        expect(getStringsForLang('pl').about.createdBy).toBe('Fork aplikacji Strom, autor oryginału:');
        setLanguage('en');
    });
});
