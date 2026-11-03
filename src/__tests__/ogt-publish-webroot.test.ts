/**
 * OpenGenTree (OGT-010): scripts/ogt/publish-webroot.mjs puts the built app
 * into <site>/public_html, run from <site>/deploys/<commit>/ as on Joton.io.
 * Runs the real script on a throwaway directory tree.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, chmodSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const SCRIPT = resolve('scripts/ogt/publish-webroot.mjs');
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0;

let site: string;
let deploy: string;
let webroot: string;

function build(index = '<!doctype html><title>app v2</title>', htaccess = 'DirectoryIndex index.html\n'): void {
    mkdirSync(join(deploy, 'public'), { recursive: true });
    writeFileSync(join(deploy, 'public', 'index.html'), index);
    writeFileSync(join(deploy, 'public', '.htaccess'), htaccess);
}

function run(cwd = deploy, env: Record<string, string> = {}) {
    const { OGT_WEBROOT: _, ...base } = process.env;
    return spawnSync(process.execPath, [SCRIPT], { cwd, env: { ...base, ...env }, encoding: 'utf-8' });
}

beforeEach(() => {
    site = mkdtempSync(join(tmpdir(), 'ogt-site-'));
    deploy = join(site, 'deploys', '1c5e392cbdc0070a76c6420b4b6d1b383b5db82e');
    webroot = join(site, 'public_html');
    mkdirSync(deploy, { recursive: true });
    mkdirSync(webroot);
});

afterEach(() => {
    try { chmodSync(webroot, 0o755); } catch { /* already gone */ }
    rmSync(site, { recursive: true, force: true });
});

describe('publish-webroot', () => {
    it('copies index.html and .htaccess into ../../public_html with mode 644', () => {
        build();
        const r = run();
        expect(r.status, r.stderr).toBe(0);
        expect(readFileSync(join(webroot, 'index.html'), 'utf-8')).toContain('app v2');
        expect(readFileSync(join(webroot, '.htaccess'), 'utf-8')).toBe('DirectoryIndex index.html\n');
        expect(statSync(join(webroot, 'index.html')).mode & 0o777).toBe(0o644);
        expect(statSync(join(webroot, '.htaccess')).mode & 0o777).toBe(0o644);
        expect(r.stdout).toContain('published to');
    });

    it('replaces an older version and leaves no temporary files', () => {
        writeFileSync(join(webroot, 'index.html'), 'old');
        build();
        expect(run().status).toBe(0);
        expect(readFileSync(join(webroot, 'index.html'), 'utf-8')).toContain('app v2');
        expect(readdirSync(webroot).sort()).toEqual(['.htaccess', 'index.html']);
    });

    it('keeps everything else in the web root (Let\'s Encrypt challenge, other files)', () => {
        mkdirSync(join(webroot, '.well-known', 'acme-challenge'), { recursive: true });
        writeFileSync(join(webroot, '.well-known', 'acme-challenge', 'token'), 'x');
        writeFileSync(join(webroot, 'robots.txt'), 'User-agent: *\n');
        build();
        expect(run().status).toBe(0);
        expect(existsSync(join(webroot, '.well-known', 'acme-challenge', 'token'))).toBe(true);
        expect(readFileSync(join(webroot, 'robots.txt'), 'utf-8')).toBe('User-agent: *\n');
    });

    it('never copies anything but the two built files', () => {
        build();
        mkdirSync(join(deploy, 'src'));
        writeFileSync(join(deploy, 'src', 'main.ts'), 'secret');
        mkdirSync(join(deploy, 'node_modules'));
        writeFileSync(join(deploy, 'public', 'extra.txt'), 'not published');
        expect(run().status).toBe(0);
        expect(readdirSync(webroot).sort()).toEqual(['.htaccess', 'index.html']);
    });

    it('does not use deploys/current', () => {
        build();
        expect(run().status).toBe(0);
        expect(existsSync(join(site, 'deploys', 'current'))).toBe(false);
    });

    it('refuses to run outside <site>/deploys/<commit>/ without OGT_WEBROOT', () => {
        const elsewhere = join(site, 'elsewhere');
        mkdirSync(join(elsewhere, 'public'), { recursive: true });
        const r = run(elsewhere);
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('not run from');
    });

    it('fails when the web root is missing', () => {
        rmSync(webroot, { recursive: true });
        build();
        const r = run();
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('does not exist');
    });

    it('fails when the build output is missing', () => {
        const r = run();
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('npm run build:public');
    });

    it('publishes to OGT_WEBROOT when given', () => {
        const other = join(site, 'other-root');
        mkdirSync(other);
        build();
        expect(run(deploy, { OGT_WEBROOT: other }).status).toBe(0);
        expect(existsSync(join(other, 'index.html'))).toBe(true);
        expect(existsSync(join(webroot, 'index.html'))).toBe(false);
    });

    // Root ignores file permissions, so this case only runs as a normal user (CI).
    it.skipIf(isRoot)('stops with an error when the hosting does not allow writing, without changing permissions', () => {
        writeFileSync(join(webroot, 'index.html'), 'old');
        chmodSync(webroot, 0o555);
        build();
        const r = run();
        expect(r.status).toBe(1);
        expect(r.stderr).toContain('may not write');
        expect(statSync(webroot).mode & 0o777).toBe(0o555);
        expect(readFileSync(join(webroot, 'index.html'), 'utf-8')).toBe('old');
    });
});
