/**
 * OpenGenTree (OGT-050): prepare a reference tree for publishing.
 *
 *   node scripts/ogt/make-reference-tree.mjs <file.ged> [--out reference-out]
 *        [--id rodowod-strzebin] [--name "Rodowód Sołectwa Strzebiń"]
 *        [--version 2026-11-03] [--cause-cutoff 1980] [--review-from 1925]
 *        [--focus auto|<person id>]
 *
 * Reads the GEDCOM with Strom's own parser (the same rules as the app's
 * import), removes causes of recent deaths, checks privacy, and writes into
 * the output directory (kept out of git):
 *
 *   <id>.json            the tree (Strom data) — to upload to public_html/samples/
 *   <id>.manifest.json   version, size, SHA-256, person count — to upload too
 *   <id>.review.md       what to read before publishing (not to upload)
 *
 * Exits 1 without writing the tree when a blocking problem is found (a
 * private link carrying data, a possibly living person). The review report is
 * written either way. The data itself never goes into the repository.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';
import { buildSync } from 'esbuild';

function fail(message) {
    console.error(`✗ make-reference-tree: ${message}`);
    process.exit(1);
}

// ---------- arguments ----------
const args = process.argv.slice(2);
const input = args.find(a => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
if (!input) fail('usage: node scripts/ogt/make-reference-tree.mjs <file.ged> [--out dir] [--id id] [--name name] [--version v]');
const outDir = resolve(opt('out', 'reference-out'));
const id = opt('id', 'rodowod-strzebin');
const name = opt('name', 'Rodowód Sołectwa Strzebiń');
const version = opt('version', new Date().toISOString().slice(0, 10));
const causeCutoffYear = +opt('cause-cutoff', '1980');
const reviewFromYear = +opt('review-from', '1925');
const focusArg = opt('focus', 'auto');
if (!/^[a-z0-9-]+$/.test(id)) fail(`--id must be lower-case letters, digits and dashes: ${id}`);

// ---------- Strom's parser and our checks, bundled like scripts/bundle.js does ----------
const bundled = buildSync({
    stdin: {
        contents: `
            export { decodeGedcomFile, parseGedcom, convertToStrom } from './src/ged-parser.ts';
            export { prepareReferenceData, reviewMarkdown, pickFocusPerson } from './src/ogt/reference-data.ts';
            export { STROM_DATA_VERSION } from './src/types.ts';
        `,
        resolveDir: process.cwd(),
        loader: 'ts',
    },
    bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'error',
    define: { __APP_VERSION__: '"0.0.0"', __RELEASE_NOTES__: 'null' },
});
const lib = await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

// ---------- read and convert ----------
const buf = readFileSync(input);
const text = lib.decodeGedcomFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const converted = lib.convertToStrom(lib.parseGedcom(text));
const source = converted.data ?? converted;
if (!source?.persons || !Object.keys(source.persons).length) fail('no persons read from the GEDCOM');

const { data, report } = lib.prepareReferenceData(source, { causeCutoffYear, reviewFromYear });
data.version = lib.STROM_DATA_VERSION;

// ---------- write ----------
mkdirSync(outDir, { recursive: true });
const reviewPath = join(outDir, `${id}.review.md`);
writeFileSync(reviewPath, lib.reviewMarkdown(report, name));

console.log(`Osoby: ${report.persons}, związki: ${report.partnerships}, źródła: ${report.sources}`);
console.log(`Osoby prywatne (łączniki): ${report.privateLinks}; z notatkami: ${report.personsWithNotes}; ur. od 1950: ${report.bornFrom1950}`);
console.log(`Usunięte przyczyny zgonu (zgon od ${causeCutoffYear}): ${report.removedCauses.length}`);
console.log(`Do przeglądu: ${report.review.filter(r => r.flags.length).length} oznaczonych, ${report.review.length} razem → ${reviewPath}`);

if (report.problems.length) {
    console.error(`Problemy blokujące (${report.problems.length}):`);
    for (const p of report.problems.slice(0, 30)) console.error(`  - ${p}`);
    fail('tree not written — fix the GEDCOM and run again (details in the review report)');
}

// The person the tree opens on: the ancestor linked to the most people, unless given.
let focus = null;
if (focusArg === 'auto') {
    focus = lib.pickFocusPerson(data);
} else if (data.persons[focusArg]) {
    const p = data.persons[focusArg];
    focus = { id: focusArg, name: `${p.firstName} ${p.lastName}`.trim(), descendants: null };
} else {
    fail(`--focus: no person with id ${focusArg}`);
}
if (focus) console.log(`Osoba startowa: ${focus.name}${focus.descendants !== null ? ` (${focus.descendants} potomków)` : ''}`);

const json = JSON.stringify(data);
const sha256 = createHash('sha256').update(json).digest('hex');
const treeFile = `${id}.json`;
writeFileSync(join(outDir, treeFile), json);
const manifest = {
    id, name, version, created: new Date().toISOString(),
    file: treeFile, bytes: Buffer.byteLength(json), sha256,
    persons: report.persons, partnerships: report.partnerships,
    stromDataVersion: data.version,
    ...(focus ? { focus: focus.id, focusName: focus.name } : {}),
};
writeFileSync(join(outDir, `${id}.manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
console.log(`✓ ${join(outDir, treeFile)} (${Math.round(manifest.bytes / 1024)} kB), manifest ${version}, SHA-256 ${sha256.slice(0, 12)}…`);
