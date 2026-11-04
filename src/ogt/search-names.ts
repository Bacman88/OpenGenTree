/**
 * OpenGenTree (OGT-061): finding a person by surnames the record does not
 * carry, and saying who a person is when the name alone says nothing.
 *
 * Registers often name a woman by one surname only: the maiden name in a
 * baptism entry, the husband's in a death entry. A tree built from them has
 * "Marianna Ochmann" whose husband is Kilian Ulfik, or just "Franciszka",
 * wife of Franciszek Ulfik. The search should find both:
 *
 * - a woman also by each husband's surname (and its feminine form, through
 *   Strom's surname rules: Pietruszewski → Pietruszewska);
 * - a woman also by her father's surname (the maiden name, when she is
 *   written under her husband's);
 * - anyone without a surname by the father's.
 *
 * Nothing is written into the person: these are search keys only. The list
 * says why someone was found ("po mężu: Ulfik", "z domu: Ochmann") and, for a
 * person with no surname, who they are ("mąż: Franciszek Ulfik").
 */

import { Person, PersonId, StromData } from '../types.js';
import { getCurrentLanguage } from '../strings.js';
import { feminineFormIn } from '../surnames.js';
import { yearOf } from '../dates.js';

export interface DerivedSurnames {
    /** Surnames of the person's husbands (women only). */
    married: string[];
    /** The father's surname, for a woman or for someone with no surname. */
    maiden: string[];
}

const clean = (s?: string): string => (s ?? '').trim();
const key = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase().trim();

function partnersOf(person: Person, data: StromData): Person[] {
    const out: Person[] = [];
    for (const pid of person.partnerships ?? []) {
        const u = data.partnerships?.[pid];
        if (!u) continue;
        const otherId = u.person1Id === person.id ? u.person2Id : u.person1Id;
        const other = data.persons[otherId as PersonId];
        if (other && !other.isPlaceholder) out.push(other);
    }
    return out;
}

function fatherOf(person: Person, data: StromData): Person | null {
    for (const id of person.parentIds ?? []) {
        const p = data.persons[id];
        if (p && !p.isPlaceholder && p.gender === 'male') return p;
    }
    return null;
}

/** Surnames the person is known under through husbands and father, not written on the person. */
export function derivedSurnames(person: Person, data: StromData | null | undefined): DerivedSurnames {
    const result: DerivedSurnames = { married: [], maiden: [] };
    if (!data || person.isPlaceholder) return result;
    const own = new Set([clean(person.lastName), clean(person.marriedSurname)].filter(Boolean).map(key));
    const add = (list: string[], s?: string): void => {
        const v = clean(s);
        if (v && !own.has(key(v)) && !list.some(x => key(x) === key(v))) list.push(v);
    };
    if (person.gender === 'female') {
        for (const partner of partnersOf(person, data)) {
            if (partner.gender === 'male') add(result.married, partner.lastName);
        }
    }
    if (person.gender === 'female' || !clean(person.lastName)) {
        add(result.maiden, fatherOf(person, data)?.lastName);
    }
    return result;
}

/**
 * The surname a woman written without one is shown under: her last husband's,
 * in the feminine form the tree's rules give (Pietruszewski → Pietruszewska,
 * Ulfik → Ulfik). The last husband is the one married latest (by the union's
 * start year), else the last union recorded. '' for anyone with a surname or
 * a married surname written, a man, or a woman without a named husband.
 * Shown only: nothing is written into the person.
 */
export function lastHusbandSurname(person: Person, data: StromData | null | undefined): string {
    if (!data || person.isPlaceholder || person.gender !== 'female') return '';
    if (clean(person.lastName) || clean(person.marriedSurname)) return '';
    let best: { surname: string; year: number; order: number } | null = null;
    (person.partnerships ?? []).forEach((pid, order) => {
        const u = data.partnerships?.[pid];
        if (!u) return;
        const otherId = u.person1Id === person.id ? u.person2Id : u.person1Id;
        const husband = data.persons[otherId as PersonId];
        const surname = clean(husband?.lastName);
        if (!husband || husband.isPlaceholder || husband.gender !== 'male' || !surname) return;
        const year = yearOf(u.startDate) ?? -Infinity;
        if (!best || year > best.year || (year === best.year && order > best.order)) best = { surname, year, order };
    });
    if (!best) return '';
    const surname = (best as { surname: string }).surname;
    // Czech rules (Ulfik → Ulfiková) only in the Czech interface: Strom turns them
    // on for any tree with a Czech letter in a surname, which Silesian trees have.
    if (getCurrentLanguage() === 'cs') return feminineFormIn(surname, data) ?? surname;
    return polishFeminine(surname);
}

/** The Polish feminine form of an adjectival surname (Kowalski → Kowalska, Nowicki → Nowicka); others unchanged. */
export function polishFeminine(surname: string): string {
    const m = /^(.*(?:sk|ck|dzk))i$/i.exec(surname);
    return m ? `${m[1]}a` : surname;
}

// ---------- the line under a name in the person list ----------

/** Labels name the relative after the colon ("mąż: Feliks Kita"), not the person found. */
const TEXT = {
    pl: { married: 'po mężu', maiden: 'z domu', wife: 'żona', husband: 'mąż', partner: 'partner', father: 'ojciec', mother: 'matka', parent: 'rodzic' },
    cs: { married: 'po manželovi', maiden: 'rozená', wife: 'manželka', husband: 'manžel', partner: 'partner', father: 'otec', mother: 'matka', parent: 'rodič' },
    de: { married: 'verh.', maiden: 'geb.', wife: 'Ehefrau', husband: 'Ehemann', partner: 'Partner', father: 'Vater', mother: 'Mutter', parent: 'Elternteil' },
    en: { married: 'married name', maiden: 'née', wife: 'wife', husband: 'husband', partner: 'partner', father: 'father', mother: 'mother', parent: 'parent' },
};
const text = () => {
    const l = getCurrentLanguage();
    return l === 'pl' || l === 'cs' || l === 'de' ? TEXT[l] : TEXT.en;
};

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const full = (p: Person): string => `${clean(p.firstName)} ${clean(p.lastName)}`.trim();
/** Folding for matching query words (as the search does: case and diacritics). */
const fold = (s: string): string => key(s).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Who the person is, for the list: why they were found by a surname the name
 * does not show ("po mężu: <mark>Ulfik</mark>"), else, for someone without a
 * surname, the nearest relative ("mąż: Franciszek Ulfik", "ojciec: Jan Krus").
 * '' when the name says enough. `forms` gives every searchable form of a
 * surname (Strom's surnameForms), so "Pietruszewska" finds "Pietruszewski".
 */
export function personContextLine(
    person: Person,
    query: string,
    data: StromData | null | undefined,
    forms: (surname: string) => string[] = s => [s],
): string {
    if (!data || person.isPlaceholder) return '';
    const t = text();
    const words = fold(query).split(' ').filter(Boolean);
    const shown = [person.firstName, person.lastName, person.marriedSurname, lastHusbandSurname(person, data), ...(person.nameVariants ?? [])]
        .flatMap(n => (n ? [n, ...(n === person.firstName ? [] : forms(n))] : [])).map(fold);
    const hit = (surname: string): boolean =>
        words.some(w => !shown.some(s => s.includes(w)) && forms(surname).some(f => fold(f).includes(w)));

    const derived = derivedSurnames(person, data);
    for (const [label, list] of [[t.married, derived.married], [t.maiden, derived.maiden]] as const) {
        const found = list.find(hit);
        if (found) return `<div class="person-picker-match">${esc(label)}: <mark>${esc(found)}</mark></div>`;
    }

    // No surname written (one may be shown from the husband): name the husband or a parent.
    if (clean(person.lastName) || clean(person.marriedSurname)) return '';
    const partner = partnersOf(person, data).find(p => full(p));
    if (partner) {
        const label = partner.gender === 'male' ? t.husband : partner.gender === 'female' ? t.wife : t.partner;
        return `<div class="person-picker-match">${esc(label)}: ${esc(full(partner))}</div>`;
    }
    const parent = fatherOf(person, data) ?? (person.parentIds ?? []).map(id => data.persons[id]).find(p => p && !p.isPlaceholder && full(p));
    if (parent && full(parent)) {
        const label = parent.gender === 'male' ? t.father : parent.gender === 'female' ? t.mother : t.parent;
        return `<div class="person-picker-match">${esc(label)}: ${esc(full(parent))}</div>`;
    }
    return '';
}
