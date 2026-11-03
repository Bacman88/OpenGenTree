/**
 * OpenGenTree reference trees (OGT-050): a published tree (first: "Rodowód
 * Sołectwa Strzebiń") that a user adds to their trees read-only, compares
 * their own tree with (Strom's cross-tree matching, with the variant
 * dictionary of OGT-040), and copies when they want to edit.
 *
 * - The data lives on the server next to the app (samples/<id>.json with a
 *   manifest), never in the repository and never inside the app's page: it is
 *   fetched on demand. It is prepared by scripts/ogt/make-reference-tree.mjs.
 * - A reference tree is an ordinary Strom tree, locked with Strom's own tree
 *   lock, and recorded here (localStorage) as a reference tree. Its lock
 *   cannot be lifted: unlocking offers an editable copy or removal instead.
 * - Updates: the manifest is checked when the app starts. A newer version is
 *   downloaded completely, its size and SHA-256 checked against the manifest
 *   and parsed BEFORE it replaces the stored one; any failure keeps the old.
 *   The user's copies are never touched.
 */

import { TreeManager } from '../tree-manager.js';
import { DataManager } from '../data.js';
import { invalidateCache } from '../cross-tree.js';
import { getCurrentLanguage } from '../strings.js';
import { StromData, TreeId } from '../types.js';

export interface ReferenceDefinition {
    /** File name stem on the server: samples/<id>.json, samples/<id>.manifest.json. */
    id: string;
    /** Shown in the menu before the manifest is read. */
    name: string;
}

export interface ReferenceManifest {
    id: string;
    name: string;
    version: string;
    file: string;
    bytes: number;
    sha256: string;
    persons: number;
    partnerships: number;
}

export const REFERENCE_TREES: readonly ReferenceDefinition[] = [
    { id: 'rodowod-strzebin', name: 'Rodowód Sołectwa Strzebiń' },
];

const SAMPLES_PATH = 'samples/';
const STORE_KEY = 'ogt-reference-trees';
const UPDATE_DELAY_MS = 4000;

type RefRecord = { ref: string; version: string };

// ---------- texts ----------

type Texts = {
    menuDesc: string; loading: string; added: string; opened: string; failed: string; offline: string;
    lockedTitle: string; lockedBody: string; copy: string; remove: string; cancel: string;
    copySuffix: string; copied: string; removeConfirm: string; updated: string;
};
const TEXTS: Record<'pl' | 'en', Texts> = {
    pl: {
        menuDesc: 'Drzewo wzorcowe tylko do odczytu: porównuj z nim własne drzewo, możesz też zapisać edytowalną kopię',
        loading: 'Pobieranie drzewa wzorcowego…',
        added: 'Dodano drzewo wzorcowe (tylko do odczytu). Osoby z Twoich drzew będą z nim porównywane.',
        opened: 'Drzewo wzorcowe jest już na liście — otwarto je.',
        failed: 'Nie udało się pobrać drzewa wzorcowego. Spróbuj ponownie później.',
        offline: 'Brak połączenia — drzewa wzorcowego nie można teraz pobrać.',
        lockedTitle: 'Drzewo wzorcowe',
        lockedBody: 'To drzewo wzorcowe jest tylko do odczytu i nie można go odblokować. Możesz zapisać jego edytowalną kopię albo usunąć je ze swojej listy.',
        copy: 'Zapisz kopię do edycji', remove: 'Usuń z listy', cancel: 'Anuluj',
        copySuffix: ' (moja kopia)', copied: 'Zapisano edytowalną kopię drzewa.',
        removeConfirm: 'Usunąć drzewo wzorcowe z Twojej listy? Możesz je dodać ponownie z menu nowego drzewa.',
        updated: 'Zaktualizowano drzewo wzorcowe',
    },
    en: {
        menuDesc: 'A read-only reference tree: compare your own tree with it, or save an editable copy',
        loading: 'Downloading the reference tree…',
        added: 'Reference tree added (read-only). People in your trees will be compared with it.',
        opened: 'The reference tree is already in your list — opened it.',
        failed: 'The reference tree could not be downloaded. Please try again later.',
        offline: 'No connection — the reference tree cannot be downloaded now.',
        lockedTitle: 'Reference tree',
        lockedBody: 'This reference tree is read-only and cannot be unlocked. You can save an editable copy or remove it from your list.',
        copy: 'Save a copy to edit', remove: 'Remove from list', cancel: 'Cancel',
        copySuffix: ' (my copy)', copied: 'An editable copy of the tree was saved.',
        removeConfirm: 'Remove the reference tree from your list? You can add it again from the new-tree menu.',
        updated: 'Reference tree updated',
    },
};
const t = (): Texts => (getCurrentLanguage() === 'pl' ? TEXTS.pl : TEXTS.en);

// ---------- the record of reference trees ----------

function readRecords(): Record<string, RefRecord> {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
}
function writeRecords(records: Record<string, RefRecord>): void {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(records)); } catch { /* storage unavailable: lock still holds */ }
}
/** Drop records of trees no longer in the index (deleted elsewhere). */
function pruneRecords(): Record<string, RefRecord> {
    const records = readRecords();
    let changed = false;
    for (const id of Object.keys(records)) {
        if (!TreeManager.getTreeMetadata(id as TreeId)) { delete records[id]; changed = true; }
    }
    if (changed) writeRecords(records);
    return records;
}

export function isReferenceTree(id: string): boolean {
    return !!readRecords()[id];
}
function treeOfReference(refId: string): TreeId | null {
    const records = pruneRecords();
    const hit = Object.entries(records).find(([, r]) => r.ref === refId);
    return hit ? hit[0] as TreeId : null;
}

// ---------- download and verify ----------

/** Compare two manifest versions ('2026-11-03', '2026-11-03b', '1.2.0'): >0 when a is newer. */
export function compareVersions(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true });
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function fetchManifest(def: ReferenceDefinition): Promise<ReferenceManifest> {
    const res = await fetch(`${SAMPLES_PATH}${def.id}.manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    const m = await res.json() as ReferenceManifest;
    if (!m || m.id !== def.id || typeof m.version !== 'string' || typeof m.file !== 'string'
        || typeof m.sha256 !== 'string' || typeof m.bytes !== 'number' || typeof m.persons !== 'number') {
        throw new Error('manifest malformed');
    }
    if (m.file.includes('/') || m.file.includes('..')) throw new Error('manifest file name not allowed');
    return m;
}

/**
 * Download the tree of a manifest completely and check it: byte count and
 * SHA-256 as the manifest says, parsed as Strom data with the stated number
 * of people. Throws on any mismatch; nothing is stored here.
 */
export async function fetchVerifiedTree(manifest: ReferenceManifest): Promise<StromData> {
    const res = await fetch(`${SAMPLES_PATH}${manifest.file}`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`tree ${res.status}`);
    const bytes = await res.arrayBuffer();
    return verifyTreeBytes(manifest, bytes, await sha256Hex(bytes));
}

/** The checks of fetchVerifiedTree on bytes already read (pure, for testing). */
export function verifyTreeBytes(manifest: ReferenceManifest, bytes: ArrayBuffer, sha256: string): StromData {
    if (bytes.byteLength !== manifest.bytes) throw new Error(`size ${bytes.byteLength} ≠ ${manifest.bytes}`);
    if (sha256 !== manifest.sha256) throw new Error('SHA-256 does not match the manifest');
    const data = JSON.parse(new TextDecoder().decode(bytes)) as StromData;
    if (!data || typeof data.persons !== 'object' || typeof data.partnerships !== 'object') throw new Error('not Strom data');
    const count = Object.keys(data.persons).length;
    if (count !== manifest.persons) throw new Error(`persons ${count} ≠ ${manifest.persons}`);
    return data;
}

// ---------- the app's UI, reached at call time ----------

type UiLike = {
    showToast?(message: string, duration?: number): void;
    updateTreeSwitcher?(): void;
    updateTreeManagerList?(): Promise<void> | void;
    refreshSearch?(): void;
    updateUrlTreeParam?(id: string): void;
    closeNewTreeMenu?(): void;
    closeMobileMenu?(): void;
};
function ui(): UiLike {
    return ((window as unknown as { Strom?: { UI?: UiLike } }).Strom?.UI) ?? {};
}
function toast(message: string, duration = 4000): void {
    ui().showToast?.(message, duration);
}
function refreshTreeUi(id: TreeId): void {
    const u = ui();
    u.updateTreeSwitcher?.();
    void u.updateTreeManagerList?.();
    u.refreshSearch?.();
    u.updateUrlTreeParam?.(id);
    window.dispatchEvent(new CustomEvent('strom:data-changed'));
}

// ---------- lock that stays ----------

let originalToggle: ((id: TreeId) => boolean) | null = null;

/** Lock a tree through Strom's own lock (bypassing the reference guard). */
function lockTree(id: TreeId): void {
    const meta = TreeManager.getTreeMetadata(id);
    if (meta && !meta.isLocked) (originalToggle ?? TreeManager.toggleTreeLock.bind(TreeManager))(id);
}

function guardLock(): void {
    if (originalToggle) return;
    originalToggle = TreeManager.toggleTreeLock.bind(TreeManager);
    TreeManager.toggleTreeLock = (id: TreeId): boolean => {
        if (isReferenceTree(id) && TreeManager.getTreeMetadata(id)?.isLocked) {
            showLockedDialog(id);
            return false;
        }
        return originalToggle!(id);
    };
}

// ---------- actions ----------

/** Add a reference tree (or open it when already there). */
export async function openReferenceTree(def: ReferenceDefinition = REFERENCE_TREES[0]): Promise<void> {
    ui().closeNewTreeMenu?.();
    ui().closeMobileMenu?.();
    const existing = treeOfReference(def.id);
    if (existing) {
        await DataManager.switchTree(existing);
        refreshTreeUi(existing);
        toast(t().opened);
        return;
    }
    if (DataManager.isReadOnly()) return;
    toast(t().loading, 8000);
    let manifest: ReferenceManifest;
    let data: StromData;
    try {
        manifest = await fetchManifest(def);
        data = await fetchVerifiedTree(manifest);
    } catch (err) {
        console.warn('OpenGenTree: reference tree not loaded', err);
        toast(navigator.onLine === false ? t().offline : t().failed, 6000);
        return;
    }
    const id = await DataManager.importAsNewTree(data, manifest.name);
    lockTree(id);
    writeRecords({ ...pruneRecords(), [id]: { ref: def.id, version: manifest.version } });
    invalidateCache();
    refreshTreeUi(id);
    toast(t().added, 6000);
}

/** Save an ordinary, editable copy of a reference tree and open it. */
export async function copyReferenceTree(id: TreeId): Promise<TreeId | null> {
    const meta = TreeManager.getTreeMetadata(id);
    if (!meta) return null;
    const copyId = await TreeManager.duplicateTree(id, meta.name + t().copySuffix);
    if (!copyId) return null;
    // A duplicate starts unlocked; make sure, whatever a later Strom does.
    if (TreeManager.getTreeMetadata(copyId)?.isLocked) originalToggle?.(copyId);
    invalidateCache();
    await DataManager.switchTree(copyId);
    refreshTreeUi(copyId);
    toast(t().copied);
    return copyId;
}

async function removeReferenceTree(id: TreeId): Promise<void> {
    if (!window.confirm(t().removeConfirm)) return;
    const wasActive = DataManager.getCurrentTreeId() === id;
    await TreeManager.deleteTree(id);
    const records = readRecords();
    delete records[id];
    writeRecords(records);
    invalidateCache();
    if (wasActive) {
        const next = TreeManager.getVisibleTrees()[0] ?? TreeManager.getTrees()[0];
        if (next) { await DataManager.switchTree(next.id); refreshTreeUi(next.id); return; }
    }
    ui().updateTreeSwitcher?.();
    void ui().updateTreeManagerList?.();
}

/** Look for newer versions of the reference trees on the server; replace only verified data. */
export async function checkReferenceUpdates(): Promise<void> {
    const records = pruneRecords();
    for (const [treeId, record] of Object.entries(records)) {
        const def = REFERENCE_TREES.find(d => d.id === record.ref);
        if (!def) continue;
        try {
            const manifest = await fetchManifest(def);
            if (compareVersions(manifest.version, record.version) <= 0) continue;
            const data = await fetchVerifiedTree(manifest);   // throws before anything is stored
            const id = treeId as TreeId;
            TreeManager.saveTreeData(id, data);
            await TreeManager.flush(id);
            writeRecords({ ...readRecords(), [id]: { ref: def.id, version: manifest.version } });
            invalidateCache();
            if (DataManager.getCurrentTreeId() === id) { await DataManager.switchTree(id); refreshTreeUi(id); }
            toast(`${t().updated}: ${manifest.name} (${manifest.version})`, 5000);
        } catch (err) {
            console.warn('OpenGenTree: reference tree update skipped', err);
        }
    }
}

// ---------- dialog shown instead of unlocking ----------

function showLockedDialog(id: TreeId): void {
    document.getElementById('ogt-reference-dialog')?.remove();
    const x = t();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'ogt-reference-dialog';
    overlay.innerHTML = `
        <div class="modal modal--sm" role="dialog" aria-modal="true" aria-labelledby="ogt-reference-title">
            <div class="modal-header"><h2 id="ogt-reference-title"></h2>
                <button class="close-btn" type="button" aria-label="${x.cancel}">&times;</button></div>
            <p class="ogt-reference-body"></p>
            <div class="buttons">
                <button type="button" class="secondary" data-act="remove"></button>
                <button type="button" class="primary" data-act="copy"></button>
            </div>
        </div>`;
    overlay.querySelector('#ogt-reference-title')!.textContent = x.lockedTitle;
    overlay.querySelector('.ogt-reference-body')!.textContent = x.lockedBody;
    overlay.querySelector('[data-act="copy"]')!.textContent = x.copy;
    overlay.querySelector('[data-act="remove"]')!.textContent = x.remove;
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.close-btn')!.addEventListener('click', close);
    overlay.querySelector('[data-act="copy"]')!.addEventListener('click', () => { close(); void copyReferenceTree(id); });
    overlay.querySelector('[data-act="remove"]')!.addEventListener('click', () => { close(); void removeReferenceTree(id); });
    document.body.appendChild(overlay);
    (overlay.querySelector('[data-act="copy"]') as HTMLButtonElement).focus();
}

// ---------- menu entries ----------

function menuButton(def: ReferenceDefinition): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-option ogt-reference-option';
    btn.innerHTML = '<span class="option-text"><span class="option-title"></span><span class="option-desc"></span></span>';
    btn.querySelector('.option-title')!.textContent = def.name;
    btn.addEventListener('click', () => void openReferenceTree(def));
    return btn;
}

function installMenu(): void {
    const options = document.querySelector('#new-tree-menu-modal .menu-options');
    if (options && !options.querySelector('.ogt-reference-option')) {
        const demo = [...options.querySelectorAll('.menu-option')].find(b => b.getAttribute('onclick')?.includes('loadDemoTree'));
        for (const def of REFERENCE_TREES) {
            const btn = menuButton(def);
            if (demo) demo.after(btn); else options.appendChild(btn);
        }
    }
    // The description follows the UI language: set it each time the menu opens.
    const menu = document.getElementById('new-tree-menu-modal');
    if (menu) {
        const setDesc = () => menu.querySelectorAll('.ogt-reference-option .option-desc').forEach(el => { el.textContent = t().menuDesc; });
        setDesc();
        new MutationObserver(setDesc).observe(menu, { attributes: true, attributeFilter: ['class'] });
    }
    // The empty start screen: a link next to "Try a sample tree".
    document.querySelectorAll<HTMLButtonElement>('button.link[onclick*="loadDemoTree"]').forEach(demoLink => {
        if (demoLink.parentElement?.querySelector('.ogt-reference-link')) return;
        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'link ogt-reference-link';
        link.textContent = `${REFERENCE_TREES[0].name} →`;
        link.addEventListener('click', () => void openReferenceTree(REFERENCE_TREES[0]));
        demoLink.after(link);
    });
}

/**
 * Run once the app has read its trees: Strom marks the page `html.app-loading`
 * until the startup tree is read (main.ts). Before that the tree index is
 * empty, and pruning would forget every reference tree.
 */
function whenAppReady(run: () => void): void {
    const html = document.documentElement;
    if (!html.classList.contains('app-loading')) { run(); return; }
    const watch = new MutationObserver(() => {
        if (html.classList.contains('app-loading')) return;
        watch.disconnect();
        run();
    });
    watch.observe(html, { attributes: true, attributeFilter: ['class'] });
}

export function installReferenceTrees(): void {
    guardLock();
    installMenu();
    whenAppReady(() => {
        pruneRecords();
        if (Object.keys(readRecords()).length) setTimeout(() => void checkReferenceUpdates(), UPDATE_DELAY_MS);
    });
}

if (typeof document !== 'undefined' && typeof localStorage !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installReferenceTrees);
    else installReferenceTrees();
}
