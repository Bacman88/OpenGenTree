/**
 * OpenGenTree (OGT-011, OGT-012): the About dialog shows the fork's name and
 * version in every language, names Strom with its version and keeps the
 * original author.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { getStringsForLang, setLanguage, SUPPORTED_LANGUAGES } from '../strings.js';
import { APP_VERSION } from '../types.js';
import { applyBrandStrings, brandAboutDialog, brandAboutTexts, BRAND_ABOUT, OGT_CHANGELOG_URL } from '../ogt/branding.js';
import { OGT_VERSION } from '../ogt/version.js';

/** A stand-in for the dialog's elements: text and attributes only. */
function fakeElement(text: string, attrs: Record<string, string> = {}) {
    return {
        textContent: text as string | null,
        attrs: { ...attrs },
        getAttribute(n: string) { return this.attrs[n] ?? null; },
        setAttribute(n: string, v: string) { this.attrs[n] = v; },
    };
}

describe('OpenGenTree brand texts', () => {
    it('names the app OpenGenTree in the About dialog of every language', () => {
        for (const { code } of SUPPORTED_LANGUAGES) {
            expect(getStringsForLang(code).about.title).toContain('OpenGenTree');
            expect(getStringsForLang(code).about.title).toBe(BRAND_ABOUT[code].title);
        }
    });

    it('says it is a fork of Strom with its version and site, and keeps the author', () => {
        for (const { code } of SUPPORTED_LANGUAGES) {
            const about = getStringsForLang(code).about;
            expect(about.createdBy).toContain(`Strom ${APP_VERSION} (stromapp.info)`);
            expect(about.authorName).toBe('Milan Víšek');
        }
    });

    it('words the support line as support for Strom\'s author', () => {
        for (const { code } of SUPPORTED_LANGUAGES) {
            const support = getStringsForLang(code).about.support;
            expect(support).toContain('OpenGenTree');
            expect(support).toContain('Strom');
        }
        expect(getStringsForLang('pl').about.support).toBe('OpenGenTree bazuje na bezpłatnej aplikacji open source Strom. Możesz wesprzeć jej autora.');
    });

    it('follows the Strom version it is given', () => {
        expect(brandAboutTexts('9.9.9').pl.createdBy).toBe('Fork aplikacji Strom 9.9.9 (stromapp.info), autor oryginału:');
    });

    it('holds after a language switch and when applied twice', () => {
        applyBrandStrings();
        setLanguage('pl');
        expect(getStringsForLang('pl').about.title).toBe('O aplikacji OpenGenTree');
        setLanguage('en');
    });
});

describe('OpenGenTree version in the About dialog', () => {
    it('starts at 0.1.0 and is a semantic version', () => {
        expect(OGT_VERSION).toBe('0.1.0');
        expect(OGT_VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('replaces Strom\'s version and changelog link with OpenGenTree\'s', () => {
        const version = fakeElement(APP_VERSION);
        const changelog = fakeElement('Co nowego ↗', { href: 'https://github.com/ACiDekCZ/strom/blob/main/CHANGELOG.pl.md#3212', target: '_blank' });
        const root = { querySelector: (s: string) => (s === '#about-version' ? version : s === '#about-changelog' ? changelog : null) };
        brandAboutDialog(root);
        expect(version.textContent).toBe(OGT_VERSION);
        expect(changelog.attrs.href).toBe(OGT_CHANGELOG_URL);
        expect(changelog.attrs.rel).toBe('noopener noreferrer');
        expect(changelog.textContent).toBe('Co nowego ↗');
    });

    it('writes nothing when the dialog already shows OpenGenTree\'s values', () => {
        let writes = 0;
        const version = { get textContent() { return OGT_VERSION; }, set textContent(_v: string | null) { writes++; } };
        const changelog = fakeElement('x', { href: OGT_CHANGELOG_URL });
        const set = changelog.setAttribute.bind(changelog);
        changelog.setAttribute = (n: string, v: string) => { writes++; set(n, v); };
        brandAboutDialog({ querySelector: (s: string) => (s === '#about-version' ? version : s === '#about-changelog' ? changelog : null) });
        expect(writes).toBe(0);
    });

    it('has a changelog entry for this version', () => {
        expect(readFileSync('docs/ogt/CHANGELOG.md', 'utf-8')).toContain(`## ${OGT_VERSION}`);
    });
});
