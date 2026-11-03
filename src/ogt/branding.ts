/**
 * OpenGenTree brand texts (OGT-011).
 *
 * The About dialog names the app OpenGenTree and says it is a fork of Strom,
 * keeping the original author's name (strings.about.authorName stays
 * "Milan Víšek"). The packs of every language are adjusted once, when this
 * module loads, so a later language switch shows them too. The logo, the
 * favicon and the colours are applied to the published page by
 * scripts/ogt/prepare-public.mjs.
 */

import { getStringsForLang, Language, SUPPORTED_LANGUAGES } from '../strings.js';

export const BRAND_NAME = 'OpenGenTree';

/** About-dialog texts per language: its title and the line before the author's name. */
export const BRAND_ABOUT: Record<Language, { title: string; createdBy: string }> = {
    en: { title: `About ${BRAND_NAME}`, createdBy: 'A fork of Strom, originally created by' },
    cs: { title: `O aplikaci ${BRAND_NAME}`, createdBy: 'Fork aplikace Strom, původní autor:' },
    de: { title: `Über ${BRAND_NAME}`, createdBy: 'Ein Fork von Strom, ursprünglich erstellt von' },
    pl: { title: `O aplikacji ${BRAND_NAME}`, createdBy: 'Fork aplikacji Strom, autor oryginału:' },
};

/** Put the brand texts into every language pack. Idempotent. */
export function applyBrandStrings(): void {
    for (const { code } of SUPPORTED_LANGUAGES) {
        const pack = getStringsForLang(code);
        const brand = BRAND_ABOUT[code];
        if (!pack || !brand) continue;
        pack.about.title = brand.title;
        pack.about.createdBy = brand.createdBy;
    }
}

applyBrandStrings();
