/**
 * OpenGenTree (OGT-009): prepare the publish directory from Strom's build.
 *
 * Run after `npm run build` (which writes the single-file app strom.html).
 * Writes ONLY what the hosted app needs into public/:
 *
 *   public/index.html   the app (strom.html), served at /
 *   public/.htaccess    LiteSpeed/Apache: index file, no listings, headers
 *
 * Nothing else goes there: no TypeScript sources, node_modules, tests,
 * configs or future backend files. The whole app (JS, CSS, fonts, icons) is
 * inlined in strom.html by scripts/bundle.js, so one file is complete.
 *
 * AGPL-3.0 section 13: a modified version run over a network must offer ITS
 * source. The author's copyright, licence and the upstream link stay as they
 * are; the published page only adds the fork's source next to them and points
 * the About dialog's "Source code" link at the fork.
 *
 * Fails loudly (exit 1) when the build output is missing or when an upstream
 * change moved the strings this script relies on, so a broken page is never
 * published quietly.
 */

import { readFileSync, writeFileSync, rmSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import { BRAND_NAME, BRAND_CSS, markSvg, faviconHref } from './brand.mjs';

const SOURCE_URL = process.env.OGT_SOURCE_URL || 'https://github.com/Bacman88/OpenGenTree';
const BUILD_FILE = 'strom.html';
const OUT_DIR = 'public';

function fail(message) {
    console.error(`✗ prepare-public: ${message}`);
    process.exit(1);
}

// OpenGenTree's own version: one source, src/ogt/version.ts (the app reads it too).
const OGT_VERSION = (readFileSync('src/ogt/version.ts', 'utf-8').match(/OGT_VERSION\s*=\s*'(\d+\.\d+\.\d+[^']*)'/) || [])[1]
    || fail('OGT_VERSION not found in src/ogt/version.ts');
const SITE_URL = 'https://opengentree.smart-ant.pl/';

/** Replace exactly one occurrence; anything else means upstream changed. */
function replaceOnce(text, search, replacement, what) {
    const count = text.split(search).length - 1;
    if (count !== 1) fail(`${what}: expected 1 match of ${JSON.stringify(search)}, found ${count}`);
    return text.replace(search, () => replacement);
}

// ---------- 1. the build output ----------
if (!existsSync(BUILD_FILE)) fail(`${BUILD_FILE} not found — run "npm run build" first`);
let html = readFileSync(BUILD_FILE, 'utf-8');

if (html.includes('<script src="dist/bundle.js">')) fail(`${BUILD_FILE} still loads dist/bundle.js — the bundle was not inlined`);
for (const required of ['Milan Víšek', 'AGPL-3.0-or-later', 'id="about-source"']) {
    if (!html.includes(required)) fail(`${BUILD_FILE} lacks ${JSON.stringify(required)} (author/licence notice must stay)`);
}

// ---------- 2. AGPL source offer for the fork ----------
html = replaceOnce(
    html,
    '    Source code: https://github.com/ACiDekCZ/strom\n',
    '    Source code: https://github.com/ACiDekCZ/strom\n'
    + `    Modified version (OpenGenTree), source code: ${SOURCE_URL}\n`,
    'licence header',
);
html = replaceOnce(
    html,
    'id="about-source" href="https://github.com/ACiDekCZ/strom"',
    `id="about-source" href="${SOURCE_URL}"`,
    'About dialog source link',
);

// ---------- 2b. OpenGenTree brand (OGT-011): name, logo, favicon, palette ----------
// The author's notice stays; the About dialog says it is a fork of Strom
// (texts: src/ogt/branding.ts). Only the published copy changes.
html = replaceOnce(html, '<title>Strom</title>', `<title>${BRAND_NAME}</title>`, 'page title');
html = html.replace(/<link rel="icon" type="image\/svg\+xml" href="[^"]*">/, () =>
    `<link rel="icon" type="image/svg+xml" href="${faviconHref()}">`);
if (!html.includes(faviconHref())) fail('favicon: Strom\'s <link rel="icon"> not found');
html = replaceOnce(
    html,
    'data-i18n-title="about.title">Strom<span class="wordmark-dot" aria-hidden="true"></span>',
    `data-i18n-title="about.title">${markSvg('ogt-mark', 24)}${BRAND_NAME}`,
    'toolbar wordmark',
);
{
    // Phone toolbar: the tree icon that opens the About dialog.
    const icon = html.match(/(<button type="button" class="toolbar-tree-icon"[^>]*>)<svg[^>]*>[\s\S]*?<\/svg>(<\/button>)/g) || [];
    if (icon.length !== 1) fail(`phone toolbar icon: expected 1 match, found ${icon.length}`);
    html = html.replace(icon[0], () => icon[0].replace(/<svg[^>]*>[\s\S]*?<\/svg>/, markSvg('ogt-mark', 26)));
}
{
    const about = html.match(/<svg class="about-logo"[^>]*>[\s\S]*?<\/svg>/g) || [];
    if (about.length !== 1) fail(`About dialog logo: expected 1 match, found ${about.length}`);
    html = html.replace(about[0], () => markSvg('about-logo ogt-mark', 34));
}
html = replaceOnce(
    html,
    '<span class="about-title">Strom <span id="about-version">',
    `<span class="about-title">${BRAND_NAME} <span id="about-version">`,
    'About dialog title',
);
// OGT-012: the fork's version in the static page (the app keeps it there too,
// src/ogt/branding.ts) and our site as the dialog's first link; Strom and
// stromapp.info are named in the "fork of" line instead.
{
    const stamped = html.match(/<span id="about-version">[^<]*<\/span>/g) || [];
    if (stamped.length !== 1) fail(`About dialog version: expected 1 match, found ${stamped.length}`);
    html = html.replace(stamped[0], () => `<span id="about-version">${OGT_VERSION}</span>`);
}
html = replaceOnce(
    html,
    '<a href="https://stromapp.info" target="_blank" rel="noopener">stromapp.info</a>',
    `<a href="${SITE_URL}" target="_blank" rel="noopener">${new URL(SITE_URL).host}</a>`,
    'About dialog site link',
);
{
    // The page's own </head> is the first one; later ones live in the
    // inlined script (export templates) and must stay as they are.
    const at = html.indexOf('</head>');
    if (at < 0 || !/^<\/head>\s*<body/.test(html.slice(at, at + 40))) fail('</head> of the page not found before <body>');
    html = html.slice(0, at) + `<style id="ogt-brand">${BRAND_CSS}</style>\n` + html.slice(at);
}

// ---------- 3. every local reference must exist in public/ ----------
// The app is one file: any relative src/href would 404 on the server.
// Markup only: the inlined script and style bodies hold strings that look
// like attributes but are not loaded by the page.
const markup = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
const LOCAL_REF = /\s(?:src|href)="(?!https?:|data:|blob:|mailto:|tel:|javascript:|#|\/\/)([^"]*)"/g;
const localRefs = [...new Set([...markup.matchAll(LOCAL_REF)].map(m => m[1]))];
if (localRefs.length) fail(`local files referenced but not published: ${localRefs.join(', ')}`);

// ---------- 4. write public/ from scratch ----------
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(join(OUT_DIR, 'index.html'), html);

writeFileSync(join(OUT_DIR, '.htaccess'), [
    '# OpenGenTree — generated by scripts/ogt/prepare-public.mjs (do not edit here)',
    'DirectoryIndex index.html',
    'Options -Indexes',
    'AddDefaultCharset UTF-8',
    '',
    '<IfModule mod_headers.c>',
    '    # One file is the whole app: always revalidate, so a new release shows at once.',
    '    <FilesMatch "\\.html$">',
    '        Header set Cache-Control "no-cache"',
    '    </FilesMatch>',
    '    Header always set X-Content-Type-Options "nosniff"',
    '    Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    '</IfModule>',
    '',
].join('\n'));

const kb = Math.round(statSync(join(OUT_DIR, 'index.html')).size / 1024);
console.log(`✓ ${OUT_DIR}/index.html (${kb} kB), ${OUT_DIR}/.htaccess — source offer: ${SOURCE_URL}`);
