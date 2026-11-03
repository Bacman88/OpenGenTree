/**
 * OpenGenTree place suggestions (OGT-060): a suggestion list under every
 * place field, replacing the browser's datalist.
 *
 * - Sources, in this order: the places of the open tree (most used first),
 *   the variant dictionary (OGT-040), the reference tree when one was added.
 * - Matching ignores Polish letters and case ("la" → Łazy, "koszec" →
 *   Koszęcin) and looks at the start of the name and of each of its words.
 * - Historical variants lead to the place ("Koschentin" → Koszęcin, shown
 *   with the variant that matched).
 * - Only a suggestion: any text can be typed and is kept as written.
 *
 * Works on the page Strom builds (every `input[list="places-datalist"]`,
 * also those created later) without changing Strom's files.
 */

import { DataManager } from '../data.js';
import { TreeManager } from '../tree-manager.js';
import { placeList } from '../places.js';
import { getCurrentLanguage } from '../strings.js';
import { StromData, TreeId } from '../types.js';
import { VARIANTS, foldVariant, VariantEntry } from './variants/index.js';

export type PlaceSource = 'tree' | 'dictionary' | 'reference';

export interface PlaceCandidate {
    /** The text put into the field. */
    display: string;
    source: PlaceSource;
    /** Uses in its tree (dictionary: 0). */
    count: number;
    /** Historical spellings that also lead here. */
    variants?: string[];
}

export interface PlaceSuggestion {
    display: string;
    source: PlaceSource;
    /** The variant that matched, when the match was not on the name itself. */
    via?: string;
}

const SOURCE_ORDER: Record<PlaceSource, number> = { tree: 0, dictionary: 1, reference: 2 };

/** Candidates from the three sources, without duplicates (the first source's spelling wins). */
export function buildPlaceCandidates(
    tree: readonly { display: string; count: number }[],
    dictionary: readonly VariantEntry[],
    reference: readonly { display: string; count: number }[],
): PlaceCandidate[] {
    const out: PlaceCandidate[] = [];
    const seen = new Map<string, PlaceCandidate>();
    const add = (c: PlaceCandidate) => {
        const key = foldVariant(c.display);
        if (!key) return;
        const known = seen.get(key);
        if (known) {
            if (c.variants?.length) known.variants = [...new Set([...(known.variants ?? []), ...c.variants])];
            return;
        }
        seen.set(key, c);
        out.push(c);
    };
    for (const p of tree) add({ display: p.display, source: 'tree', count: p.count });
    for (const e of dictionary) {
        if (e.type !== 'place' || e.status === 'rejected') continue;
        add({ display: e.canonical, source: 'dictionary', count: 0, variants: e.variants });
    }
    for (const p of reference) add({ display: p.display, source: 'reference', count: p.count });
    return out;
}

/** Whether `q` (folded) starts the name or one of its words; 0 = start of name, 1 = start of a word, -1 = no. */
function matchRank(text: string, q: string): number {
    const f = foldVariant(text);
    if (!f || !q) return -1;
    if (f.startsWith(q)) return 0;
    if (!q.includes(' ') && f.split(' ').some(w => w.startsWith(q))) return 1;
    return -1;
}

/**
 * Suggestions for what was typed: by the name first, then by a historical
 * variant; within that, the open tree before the dictionary before the
 * reference tree, and the most used first. Nothing when the text already is
 * the one suggestion.
 */
export function suggestPlaces(query: string, candidates: readonly PlaceCandidate[], limit = 8): PlaceSuggestion[] {
    const q = foldVariant(query);
    if (!q) return [];
    const hits: { s: PlaceSuggestion; rank: number; order: number; count: number }[] = [];
    for (const c of candidates) {
        const byName = matchRank(c.display, q);
        if (byName >= 0) {
            hits.push({ s: { display: c.display, source: c.source }, rank: byName, order: SOURCE_ORDER[c.source], count: c.count });
            continue;
        }
        const via = c.variants?.find(v => matchRank(v, q) >= 0);
        if (via) hits.push({ s: { display: c.display, source: c.source, via }, rank: 2, order: SOURCE_ORDER[c.source], count: c.count });
    }
    hits.sort((a, b) => a.order - b.order || a.rank - b.rank || b.count - a.count || a.s.display.localeCompare(b.s.display));
    const result = hits.slice(0, limit).map(h => h.s);
    if (result.length === 1 && foldVariant(result[0].display) === q) return [];
    return result;
}

// ---------- data of the open tree and of the reference tree ----------

let referenceCache: { id: string; stamp: string; places: { display: string; count: number }[] } | null = null;

async function referencePlaces(): Promise<{ display: string; count: number }[]> {
    let ids: string[] = [];
    try { ids = Object.keys(JSON.parse(localStorage.getItem('ogt-reference-trees') || '{}')); } catch { /* none */ }
    const id = ids.find(i => TreeManager.getTreeMetadata(i as TreeId));
    if (!id || id === DataManager.getCurrentTreeId()) return [];
    const meta = TreeManager.getTreeMetadata(id as TreeId)!;
    if (referenceCache?.id === id && referenceCache.stamp === meta.lastModifiedAt) return referenceCache.places;
    const data = await TreeManager.getTreeData(id as TreeId);
    const places = data ? placeList(data as StromData).map(p => ({ display: p.display, count: p.count })) : [];
    referenceCache = { id, stamp: meta.lastModifiedAt, places };
    return places;
}

let candidates: PlaceCandidate[] = [];
async function refreshCandidates(): Promise<void> {
    const tree = placeList(DataManager.getData()).map(p => ({ display: p.display, count: p.count }));
    candidates = buildPlaceCandidates(tree, VARIANTS.entries, []);
    const ref = await referencePlaces().catch(() => []);
    if (ref.length) candidates = buildPlaceCandidates(tree, VARIANTS.entries, ref);
}

// ---------- the list under the field ----------

const STYLE = `
.ogt-place-list {
    position: fixed; z-index: 100000; margin: 0; padding: 4px 0; list-style: none;
    background: var(--surface, #fffdf8); color: var(--text, #2b2822);
    border: 1px solid var(--sp-frame, #d0c6b2); border-radius: var(--r-md, 8px);
    box-shadow: 0 8px 24px rgba(0,0,0,.14); max-height: 280px; overflow-y: auto; font-size: 14px;
}
.ogt-place-list[hidden] { display: none; }
.ogt-place-list li { padding: 7px 12px; cursor: pointer; display: flex; gap: 8px; align-items: baseline; justify-content: space-between; }
.ogt-place-list li[aria-selected="true"], .ogt-place-list li:hover { background: var(--primary-soft, #e2eeea); }
.ogt-place-list .ogt-place-meta { font-size: 12px; color: var(--text-faint, #746c5c); white-space: nowrap; }
`;

const TEXT = {
    pl: { dictionary: 'słownik', reference: 'Rodowód', via: (v: string) => `zapis: ${v}` },
    en: { dictionary: 'dictionary', reference: 'reference', via: (v: string) => `written: ${v}` },
};
const text = () => (getCurrentLanguage() === 'pl' ? TEXT.pl : TEXT.en);

let list: HTMLUListElement;
let active: HTMLInputElement | null = null;
let items: PlaceSuggestion[] = [];
let selected = -1;
let choosing = false;

function place(): void {
    if (!active) return;
    const r = active.getBoundingClientRect();
    list.style.left = `${r.left}px`;
    list.style.top = `${r.bottom + 2}px`;
    list.style.width = `${Math.max(r.width, 220)}px`;
}

function close(): void {
    list.hidden = true;
    items = [];
    selected = -1;
    active?.setAttribute('aria-expanded', 'false');
}

function render(): void {
    if (!active || !items.length) { close(); return; }
    const x = text();
    list.innerHTML = '';
    items.forEach((s, i) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === selected));
        const name = document.createElement('span');
        name.textContent = s.display;
        li.appendChild(name);
        const meta = [s.via ? x.via(s.via) : '', s.source === 'dictionary' ? x.dictionary : s.source === 'reference' ? x.reference : '']
            .filter(Boolean).join(' · ');
        if (meta) {
            const m = document.createElement('span');
            m.className = 'ogt-place-meta';
            m.textContent = meta;
            li.appendChild(m);
        }
        li.addEventListener('mousedown', e => { e.preventDefault(); choose(i); });
        list.appendChild(li);
    });
    list.hidden = false;
    active.setAttribute('aria-expanded', 'true');
    place();
}

function choose(i: number): void {
    const input = active;
    const s = items[i];
    if (!input || !s) return;
    input.value = s.display;
    close();
    choosing = true;   // our own events must not open the list again
    try {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
        choosing = false;
    }
}

function update(): void {
    if (!active || active.readOnly || active.disabled) { close(); return; }
    items = suggestPlaces(active.value, candidates);
    selected = -1;
    render();
}

function enhance(input: HTMLInputElement): void {
    if (input.dataset.ogtPlace) return;
    input.dataset.ogtPlace = '1';
    input.removeAttribute('list');   // our list replaces the browser's
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.addEventListener('focus', () => {
        active = input;
        void refreshCandidates().then(() => { if (active === input && input.value) update(); });
    });
    input.addEventListener('input', () => { if (active === input && !choosing) update(); });
    input.addEventListener('blur', () => { if (active === input) { close(); active = null; } });
}

/**
 * Keys while the list is open. Captured on the document so it runs before
 * Strom's own handlers on the field (Enter moves to the next field or saves,
 * Escape closes the dialog) — those only see the key when the list is closed.
 */
function onKeydown(e: KeyboardEvent): void {
    if (!active || e.target !== active || list.hidden) return;
    const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (e.key === 'ArrowDown') { selected = Math.min(items.length - 1, selected + 1); render(); stop(); }
    else if (e.key === 'ArrowUp') { selected = Math.max(0, selected - 1); render(); stop(); }
    else if (e.key === 'Enter' && selected >= 0) { choose(selected); stop(); }
    else if (e.key === 'Escape') { close(); stop(); }
    else if (e.key === 'Tab') close();
}

function enhanceAll(root: ParentNode = document): void {
    root.querySelectorAll<HTMLInputElement>('input[list="places-datalist"]').forEach(enhance);
}

export function installPlaceSuggestions(): void {
    const style = document.createElement('style');
    style.id = 'ogt-place-suggest';
    style.textContent = STYLE;
    document.head.appendChild(style);
    list = document.createElement('ul');
    list.className = 'ogt-place-list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    document.body.appendChild(list);
    enhanceAll();
    new MutationObserver(records => {
        for (const r of records) {
            r.addedNodes.forEach(n => {
                if (n instanceof HTMLInputElement && n.getAttribute('list') === 'places-datalist') enhance(n);
                else if (n instanceof HTMLElement && n !== list) enhanceAll(n);
            });
        }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('keydown', onKeydown, true);
    window.addEventListener('resize', place);
    document.addEventListener('scroll', place, true);
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPlaceSuggestions);
    else installPlaceSuggestions();
}
