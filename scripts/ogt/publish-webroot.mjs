/**
 * OpenGenTree (OGT-010): publish the built app into the website's web root.
 *
 * Why: on Joton.io (Enhance panel) a successful Git deploy does not make the
 * deploys/current link the panel's document root relies on, so
 * /deploys/current/public answers 403. A document root set to one deploy's
 * own public/ works, but its name changes with every commit. Instead the
 * build itself puts the app where the web server already looks: public_html.
 *
 * Run from the deploy directory after `npm run build:public` (Joton runs the
 * build script in /var/www/<site>/deploys/<commit>/), so the web root is
 * ../../public_html. deploys/current is never used.
 *
 * What it does, and nothing more:
 *   - copies public/index.html and public/.htaccess into the web root;
 *   - each file is written to a temporary name in the web root first, given
 *     mode 644, then renamed over the old one: rename within one directory is
 *     atomic, so a visitor gets the old file or the new one, never half of it;
 *   - other files in the web root stay untouched (no source, tests or
 *     node_modules go there, and nothing there is deleted — .well-known/ of
 *     Let's Encrypt included).
 *
 * It never changes permissions or owners of the web root itself: if the
 * build may not write there, it stops with exit code 1 and says so, rather
 * than working around the hosting's restrictions.
 *
 * OGT_WEBROOT=<dir> overrides the target (local tests, another layout).
 */

import { existsSync, statSync, accessSync, constants, readFileSync, writeFileSync, renameSync, chmodSync, rmSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';

const SOURCE_DIR = 'public';
const FILES = ['.htaccess', 'index.html']; // index.html last: the app switches when it lands
const FILE_MODE = 0o644;

function fail(message) {
    console.error(`✗ publish-webroot: ${message}`);
    process.exit(1);
}

// ---------- 1. where to publish ----------
const cwd = process.cwd();
let webroot;
if (process.env.OGT_WEBROOT) {
    webroot = resolve(process.env.OGT_WEBROOT);
} else {
    // Expect <site>/deploys/<commit>/ — refuse to guess anywhere else, so a
    // local build or another host never writes outside its own directory.
    if (basename(dirname(cwd)) !== 'deploys') {
        fail(`not run from <site>/deploys/<commit>/ (cwd: ${cwd}); set OGT_WEBROOT to publish elsewhere`);
    }
    webroot = resolve(cwd, '..', '..', 'public_html');
}

// ---------- 2. the target must exist and be writable as it is ----------
if (!existsSync(webroot) || !statSync(webroot).isDirectory()) {
    fail(`web root ${webroot} does not exist or is not a directory`);
}
try {
    accessSync(webroot, constants.W_OK | constants.X_OK);
} catch {
    fail(`the build may not write to ${webroot} (permission denied) — the hosting does not allow it; publishing stopped`);
}

// ---------- 3. the build output ----------
for (const name of FILES) {
    if (!existsSync(join(SOURCE_DIR, name))) fail(`${SOURCE_DIR}/${name} missing — run "npm run build:public" first`);
}

// ---------- 4. write temporaries, then rename over the live files ----------
const stamp = `${process.pid}-${Date.now()}`;
const temps = [];
try {
    for (const name of FILES) {
        const tmp = join(webroot, `.ogt-publish-${stamp}-${name.replace(/^\./, '')}`);
        writeFileSync(tmp, readFileSync(join(SOURCE_DIR, name)), { mode: FILE_MODE });
        chmodSync(tmp, FILE_MODE); // regardless of the build's umask
        temps.push([tmp, join(webroot, name)]);
    }
    for (const [tmp, live] of temps) renameSync(tmp, live);
} catch (err) {
    for (const [tmp] of temps) rmSync(tmp, { force: true });
    fail(`copying into ${webroot} failed: ${err.message}`);
}

// ---------- 5. check what is live now ----------
for (const name of FILES) {
    const live = join(webroot, name);
    const a = readFileSync(join(SOURCE_DIR, name));
    const b = readFileSync(live);
    if (!a.equals(b)) fail(`${live} differs from ${SOURCE_DIR}/${name} after publishing`);
    if ((statSync(live).mode & 0o777) !== FILE_MODE) fail(`${live} has mode ${(statSync(live).mode & 0o777).toString(8)}, expected 644`);
}

const kb = Math.round(statSync(join(webroot, 'index.html')).size / 1024);
console.log(`✓ published to ${webroot}: index.html (${kb} kB), .htaccess`);
