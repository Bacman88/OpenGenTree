/**
 * OpenGenTree brand texts (OGT-011, OGT-012).
 *
 * The About dialog names the app OpenGenTree with its own version, says it
 * is a fork of Strom (with Strom's version and site) and keeps the original
 * author's name (strings.about.authorName stays "Milan Víšek"). The "support"
 * line still offers the coffee for Strom's author, worded so it is clear
 * whom it supports. The packs of every language are adjusted once, when this
 * module loads, so a later language switch shows them too.
 *
 * Strom fills the dialog's version and "What's new" link each time it opens
 * (ui/misc.ts, showAboutDialog); a small observer puts OpenGenTree's back
 * right after, so no Strom file needs changing. The logo, the favicon, the
 * site link and the colours are applied to the published page by
 * scripts/ogt/prepare-public.mjs.
 */

import { getStringsForLang, Language, SUPPORTED_LANGUAGES } from '../strings.js';
import { APP_VERSION } from '../types.js';
import { OGT_VERSION } from './version.js';

export const BRAND_NAME = 'OpenGenTree';
export const OGT_SITE_URL = 'https://opengentree.smart-ant.pl/';
export const OGT_CHANGELOG_URL = 'https://github.com/Bacman88/OpenGenTree/blob/main/docs/ogt/CHANGELOG.md';

type BrandTexts = { title: string; createdBy: string; support: string };

/** About-dialog texts per language, for a given Strom version. */
export function brandAboutTexts(stromVersion: string): Record<Language, BrandTexts> {
    const strom = `Strom ${stromVersion} (stromapp.info)`;
    return {
        en: {
            title: `About ${BRAND_NAME}`,
            createdBy: `A fork of ${strom}, originally created by`,
            support: `${BRAND_NAME} is built on Strom, a free and open-source app. You can support its author.`,
        },
        cs: {
            title: `O aplikaci ${BRAND_NAME}`,
            createdBy: `Fork aplikace ${strom}, původní autor:`,
            support: `${BRAND_NAME} vychází z bezplatné open-source aplikace Strom. Jejího autora můžete podpořit.`,
        },
        de: {
            title: `Über ${BRAND_NAME}`,
            createdBy: `Ein Fork von ${strom}, ursprünglich erstellt von`,
            support: `${BRAND_NAME} basiert auf Strom, einer kostenlosen Open-Source-App. Wer möchte, kann ihren Autor unterstützen.`,
        },
        pl: {
            title: `O aplikacji ${BRAND_NAME}`,
            createdBy: `Fork aplikacji ${strom}, autor oryginału:`,
            support: `${BRAND_NAME} bazuje na bezpłatnej aplikacji open source Strom. Możesz wesprzeć jej autora.`,
        },
    };
}

/** The texts for the Strom version this build is based on. */
export const BRAND_ABOUT = brandAboutTexts(APP_VERSION);

/** Put the brand texts into every language pack. Idempotent. */
export function applyBrandStrings(): void {
    for (const { code } of SUPPORTED_LANGUAGES) {
        const pack = getStringsForLang(code);
        const brand = BRAND_ABOUT[code];
        if (!pack || !brand) continue;
        pack.about.title = brand.title;
        pack.about.createdBy = brand.createdBy;
        pack.about.support = brand.support;
    }
}

/** The parts of the About dialog this module corrects (a DOM subset, for testing). */
interface AboutRoot {
    querySelector(selector: string): { textContent: string | null; getAttribute?(n: string): string | null; setAttribute?(n: string, v: string): void } | null;
}

/**
 * Put OpenGenTree's version and changelog into the About dialog. Only writes
 * what differs, so it can run on every change of the dialog without looping.
 */
export function brandAboutDialog(root: AboutRoot): void {
    const version = root.querySelector('#about-version');
    if (version && version.textContent !== OGT_VERSION) version.textContent = OGT_VERSION;

    const changelog = root.querySelector('#about-changelog');
    if (changelog?.getAttribute && changelog.setAttribute && changelog.getAttribute('href') !== OGT_CHANGELOG_URL) {
        changelog.setAttribute('href', OGT_CHANGELOG_URL);
        changelog.setAttribute('target', '_blank');
        changelog.setAttribute('rel', 'noopener noreferrer');
    }
}

function watchAboutDialog(): void {
    const modal = document.getElementById('about-modal');
    if (!modal) return;
    brandAboutDialog(modal);
    new MutationObserver(() => brandAboutDialog(modal)).observe(modal, {
        subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['href'],
    });
}

applyBrandStrings();
if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAboutDialog);
    else watchAboutDialog();
}
