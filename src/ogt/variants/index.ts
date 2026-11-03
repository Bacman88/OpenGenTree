/**
 * OpenGenTree variant dictionary (OGT-040): historical and regional variants
 * of given names, surnames and place names, for search and comparison.
 *
 * Three layers are kept apart on purpose:
 *   1. Text normalization — accents, case, ł, punctuation (Kopeć = Kopec,
 *      Kołodziejczyk = Kolodziejczyk). Strom already does this; here it only
 *      decides that two spellings are "the same text" (relation 'same').
 *   2. Aliases — this dictionary: Pyrek = Pyrrek, Strzebiń = Strzebin,
 *      König = Koenig. Each group has a status: 'verified' and 'candidate'
 *      groups are aliases (a candidate is to be verified, and counts less);
 *      'rejected' entries record names that must NOT be treated as one
 *      (Franczyk ≠ Urbanczyk).
 *   3. Genealogical matching (merge/matching.ts) — whether two people are one
 *      person. An alias only raises the score there; it is never proof on its
 *      own, and nothing is merged or rewritten because of it.
 *
 * The data never changes a tree: the original spelling of every name and
 * place stays as written. The dictionary is independent of any one tree and
 * grows without changes to Strom's data model; createVariantIndex() takes
 * further entries (later: the user's own aliases) next to the built-in ones.
 */

import surnameData from './surnames.json';
import placeData from './places.json';
import givenData from './given-names.json';

export type VariantType = 'surname' | 'place' | 'given';
export type VariantStatus = 'verified' | 'candidate' | 'rejected';

export interface VariantEntry {
    /** A place's location id (required for places: the same name can be another place). */
    id?: string;
    canonical: string;
    variants: string[];
    type: VariantType;
    status: VariantStatus;
    region?: string;
    source?: string;
    notes?: string;
}

/** How two written forms relate. */
export type VariantRelation =
    | { kind: 'same' }                                                   // equal after normalization (layer 1)
    | { kind: 'alias'; status: 'verified' | 'candidate'; entry: VariantEntry } // one group (layer 2)
    | { kind: 'rejected'; entry: VariantEntry }                          // recorded as different names
    | { kind: 'distinct'; a: VariantEntry; b: VariantEntry }             // two different known places
    | { kind: 'none' };                                                  // the dictionary says nothing

/** Similarity given to a 'candidate' alias: above any typo-level guess, below a sure match. */
export const CANDIDATE_SIMILARITY = 0.85;
/** Place bonus of a candidate alias: the lower place band of the matcher, not the full one. */
export const CANDIDATE_PLACE_SIMILARITY = 0.8;

const LETTER_FOLDS: Record<string, string> = {
    'ł': 'l', 'ß': 'ss', 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'đ': 'd', 'ð': 'd',
    'þ': 'th', 'ħ': 'h', 'ı': 'i', 'ŀ': 'l', 'ŧ': 't', 'ĸ': 'k', 'ŋ': 'n',
};

/** Layer 1: the same folding as merge/matching.ts normalizeName. */
export function foldVariant(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[łßøæœđðþħıŀŧĸŋ]/g, ch => LETTER_FOLDS[ch] ?? ch)
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .trim()
        .replace(/\s+/g, ' ');
}

/** A place string folded part by part, keeping its comma-separated structure. */
function foldPlaceParts(text: string): string[] {
    return text.split(',').map(foldVariant).filter(Boolean);
}

export interface VariantIndex {
    /** Problems found while building (duplicates, a rejected pair inside a group, a place without id). */
    readonly errors: string[];
    readonly entries: readonly VariantEntry[];
    compare(type: 'surname' | 'given', a: string, b: string): VariantRelation;
    /** The known location a place string names, by its longest known leading parts. */
    resolvePlace(text: string): VariantEntry | null;
    comparePlaces(a: string, b: string): VariantRelation;
    /** Every written form of the group a name belongs to (for search); [] when unknown. */
    formsOf(type: VariantType, text: string): string[];
}

export function createVariantIndex(entries: readonly VariantEntry[]): VariantIndex {
    const errors: string[] = [];
    const groups: Record<VariantType, Map<string, VariantEntry>> = { surname: new Map(), place: new Map(), given: new Map() };
    const rejected = new Map<string, VariantEntry>();
    const placeIds = new Set<string>();
    const pairKey = (type: string, a: string, b: string) => `${type}|${[a, b].sort().join('|')}`;
    const keyOf = (type: VariantType, form: string) => (type === 'place' ? foldPlaceParts(form).join(', ') : foldVariant(form));

    for (const entry of entries) {
        const forms = [entry.canonical, ...entry.variants];
        if (!['verified', 'candidate', 'rejected'].includes(entry.status)) errors.push(`${entry.canonical}: unknown status "${entry.status}"`);
        if (entry.status === 'rejected') {
            const keys = forms.map(f => keyOf(entry.type, f));
            for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) rejected.set(pairKey(entry.type, keys[i], keys[j]), entry);
            continue;
        }
        if (entry.type === 'place') {
            if (!entry.id) errors.push(`place ${entry.canonical}: no id`);
            else if (placeIds.has(entry.id)) errors.push(`place id ${entry.id}: used twice`);
            else placeIds.add(entry.id);
        }
        for (const form of forms) {
            const key = keyOf(entry.type, form);
            if (!key) { errors.push(`${entry.canonical}: empty form`); continue; }
            const other = groups[entry.type].get(key);
            if (other && other !== entry) errors.push(`${entry.type} "${form}" is in two groups: ${other.canonical}, ${entry.canonical}`);
            else groups[entry.type].set(key, entry);
        }
    }
    // A pair recorded as different must not sit in one alias group.
    for (const [key, entry] of rejected) {
        const [type, a, b] = key.split('|') as [VariantType, string, string];
        const ga = groups[type].get(a);
        if (ga && ga === groups[type].get(b)) errors.push(`rejected pair ${a} ≠ ${b} (${entry.canonical}) is inside the group ${ga.canonical}`);
    }

    function resolvePlace(text: string): VariantEntry | null {
        const parts = foldPlaceParts(text);
        for (let n = parts.length; n >= 1; n--) {
            const hit = groups.place.get(parts.slice(0, n).join(', '));
            if (hit) return hit;
        }
        return null;
    }

    return {
        errors,
        entries,
        compare(type, a, b) {
            const fa = foldVariant(a);
            const fb = foldVariant(b);
            if (!fa || !fb) return { kind: 'none' };
            if (fa === fb) return { kind: 'same' };
            const no = rejected.get(pairKey(type, fa, fb));
            if (no) return { kind: 'rejected', entry: no };
            const ga = groups[type].get(fa);
            if (ga && ga === groups[type].get(fb)) return { kind: 'alias', status: ga.status as 'verified' | 'candidate', entry: ga };
            return { kind: 'none' };
        },
        resolvePlace,
        comparePlaces(a, b) {
            const pa = foldPlaceParts(a).join(', ');
            const pb = foldPlaceParts(b).join(', ');
            if (!pa || !pb) return { kind: 'none' };
            if (pa === pb) return { kind: 'same' };
            const ea = resolvePlace(a);
            const eb = resolvePlace(b);
            if (!ea || !eb) return { kind: 'none' };
            if (ea === eb) return { kind: 'alias', status: ea.status as 'verified' | 'candidate', entry: ea };
            return { kind: 'distinct', a: ea, b: eb };
        },
        formsOf(type, text) {
            const entry = type === 'place' ? resolvePlace(text) : groups[type].get(foldVariant(text));
            return entry ? [entry.canonical, ...entry.variants] : [];
        },
    };
}

/** The built-in dictionary: surnames, places and given names of the starting set. */
export const VARIANTS: VariantIndex = createVariantIndex([
    ...(surnameData.entries as VariantEntry[]),
    ...(placeData.entries as VariantEntry[]),
    ...(givenData.entries as VariantEntry[]),
]);

// ---------- adapters for merge/matching.ts (layer 3 decides, these only adjust) ----------

/** A surname similarity adjusted by the dictionary: alias up, recorded difference to 0. */
export function adjustSurnameSimilarity(a: string, b: string, similarity: number, index: VariantIndex = VARIANTS): number {
    const rel = index.compare('surname', a, b);
    if (rel.kind === 'rejected') return 0;
    if (rel.kind === 'alias') return rel.status === 'verified' ? 1 : Math.max(similarity, CANDIDATE_SIMILARITY);
    return similarity;
}

/** A given-name similarity adjusted by the dictionary (the register groups are handled before). */
export function adjustGivenNameSimilarity(a: string, b: string, similarity: number, index: VariantIndex = VARIANTS): number {
    const rel = index.compare('given', a, b);
    if (rel.kind === 'rejected') return 0;
    if (rel.kind === 'alias') return rel.status === 'verified' ? 1 : Math.max(similarity, CANDIDATE_SIMILARITY);
    return similarity;
}

/** A place similarity: one known location up, two different known locations 0, else the text guess. */
export function adjustPlaceSimilarity(a: string, b: string, similarity: number, index: VariantIndex = VARIANTS): number {
    const rel = index.comparePlaces(a, b);
    if (rel.kind === 'distinct') return 0;
    if (rel.kind === 'alias') return rel.status === 'verified' ? 1 : Math.max(similarity, CANDIDATE_PLACE_SIMILARITY);
    return similarity;
}
