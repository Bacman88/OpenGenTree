/**
 * OpenGenTree brand (OGT-011): the logo, the favicon and a light adjustment
 * of Strom's palette. Applied to the published page by prepare-public.mjs,
 * so Strom's index.html stays as upstream ships it.
 *
 * The palette keeps Strom's warm paper and its two-colour scheme; only the
 * brand pair moves: the green leans towards sea green, the copper towards
 * brick. Contrast (WCAG 2): white on --primary 6.6:1, --accent-text on
 * --surface-2 6.4:1; dark theme: ink on --primary 5.9:1, --accent-text on
 * --surface 5.1:1 — at least what Strom's own tokens promise.
 */

export const BRAND_NAME = 'OpenGenTree';

/**
 * The mark: a family tree — the ancestor at the root (accent colour), the
 * line rising and parting into three descendants (primary colour).
 * Coloured by CSS (.ogt-mark .st/.nd/.rt), so it follows the theme.
 */
const MARK_BODY =
    '<path class="st" d="M12 19.6V5.4M12 14.6C12 11 6.4 11.8 5.3 7.6M12 14.6C12 11 17.6 11.8 18.7 7.6"/>'
    + '<circle class="nd" cx="5.1" cy="6.6" r="2.7"/>'
    + '<circle class="nd" cx="12" cy="4.2" r="2.7"/>'
    + '<circle class="nd" cx="18.9" cy="6.6" r="2.7"/>'
    + '<circle class="rt" cx="12" cy="20" r="2.5"/>';

export function markSvg(className, size) {
    return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"`
        + ' stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
        + MARK_BODY + '</svg>';
}

/** The favicon: the same mark with the light theme's colours written in. */
export function faviconHref() {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">'
        + MARK_BODY
            .replace('class="st"', 'stroke="#2f6656"')
            .replaceAll('class="nd"', 'fill="#2f6656"')
            .replace('class="rt"', 'fill="#a85a3c"')
        + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Overrides after Strom's own styles: same selectors, later in the page. */
export const BRAND_CSS = `
/* OpenGenTree brand (scripts/ogt/brand.mjs) */
:root {
    --primary: #2f6656;
    --primary-dark: #234f43;
    --primary-soft: #e2eeea;
    --accent: #a85a3c;
    --accent-text: #8a4429;
}
[data-theme="dark"] {
    --primary: #6fa293;
    --primary-dark: #88b8aa;
    --primary-soft: #2e3f3a;
    --accent: #cf7f60;
    --accent-text: #d98a6c;
}
.ogt-mark .st { stroke: var(--primary); }
.ogt-mark .nd { fill: var(--primary); }
.ogt-mark .rt { fill: var(--accent); }
.app-logo { align-items: center; }
.app-logo .ogt-mark { flex-shrink: 0; margin-right: 6px; }
`;
