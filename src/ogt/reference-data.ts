/**
 * OpenGenTree reference tree data (OGT-050): preparing a published reference
 * tree (e.g. "Rodowód Sołectwa Strzebiń") from Strom data, and checking it
 * before it goes public.
 *
 * The published JSON is public data: anyone can download it, whatever the
 * app's edit lock says. So the preparation removes what must not go out
 * (causes of recent deaths), refuses to publish what looks like a living
 * person's data, and writes a review report of everything a person has to
 * read before publishing (notes, sources, events). Re-identification through
 * family links cannot be ruled out by any check — that stays a human review.
 *
 * Anonymised links ("Osoba prywatna") are kept: they hold the generations
 * together. They must carry nothing but their name, sex and relations.
 */

import { Person, Partnership, StromData } from '../types.js';
import { isLivingPerson, inferBirthUpperBounds } from '../privacy.js';

export interface PrepareOptions {
    /** Causes of death are removed for deaths in this year or later. */
    causeCutoffYear: number;
    /** Notes and sources mentioning a year from this one on are flagged for review. */
    reviewFromYear: number;
    /** The year living status is judged against (default: now). */
    currentYear?: number;
}

export const DEFAULT_PREPARE_OPTIONS: PrepareOptions = { causeCutoffYear: 1980, reviewFromYear: 1925 };

export interface ReviewItem {
    kind: 'person-note' | 'partnership-note' | 'event-note' | 'source';
    owner: string;
    text: string;
    flags: string[];
}

export interface PrepareReport {
    persons: number;
    partnerships: number;
    sources: number;
    personsWithNotes: number;
    bornFrom1950: number;
    privateLinks: number;
    removedCauses: { name: string; deathYear: number }[];
    /** Undated persons taken as deceased from their parents' birth years (listed for review). */
    deceasedByParents: string[];
    /** Blocking problems: the file must not be published while any remain. */
    problems: string[];
    /** Everything a person reads before publishing; flagged items first. */
    review: ReviewItem[];
}

/** Latest age at which a parent is assumed to have had a child. */
const MAX_PARENT_AGE = 60;
/** Age past which a person without a death record is taken as deceased (Strom uses 110; we use the stricter 120). */
const MAX_AGE = 120;

const PRIVATE_FIRST = /^osoba$/i;
const PRIVATE_LAST = /^prywatna$/i;

/** An anonymised link between generations ("Osoba prywatna"). */
export function isPrivateLink(p: Pick<Person, 'firstName' | 'lastName'>): boolean {
    return PRIVATE_FIRST.test((p.firstName ?? '').trim()) && PRIVATE_LAST.test((p.lastName ?? '').trim());
}

/** An empty stand-in record: no name at all, or only "?". */
function isNameless(p: Person): boolean {
    const n = `${p.firstName ?? ''} ${p.lastName ?? ''}`.replace(/[?\s]/g, '');
    return n === '';
}

const yearOf = (text?: string): number | null => {
    const m = text?.match(/\b(1[5-9]\d\d|20\d\d)\b/);
    return m ? +m[1] : null;
};

/** Fields a private link may carry: identity, sex and relations only. */
const PRIVATE_ALLOWED = new Set(['id', 'firstName', 'lastName', 'gender', 'isPlaceholder', 'partnerships', 'parentIds', 'childIds', 'isDeceased', 'primaryName']);
/** Fields of a union with a private link that may be filled. */
const PRIVATE_UNION_ALLOWED = new Set(['id', 'person1Id', 'person2Id', 'childIds', 'status', 'isPrimary', 'participants']);

const hasValue = (v: unknown): boolean =>
    v !== undefined && v !== null && v !== '' && v !== false && !(Array.isArray(v) && v.length === 0)
    && !(typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);

function nameOf(p: Person | undefined): string {
    if (!p) return '?';
    return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || '?';
}

/**
 * Prepare a copy of the data for publishing and report on it. The input is
 * not changed.
 */
export function prepareReferenceData(input: StromData, options: PrepareOptions = DEFAULT_PREPARE_OPTIONS): { data: StromData; report: PrepareReport } {
    const data: StromData = JSON.parse(JSON.stringify(input));
    const persons = Object.values(data.persons) as Person[];
    const unions = Object.values(data.partnerships) as Partnership[];
    const currentYear = options.currentYear ?? new Date().getFullYear();
    const problems: string[] = [];
    const removedCauses: PrepareReport['removedCauses'] = [];

    // 1. Causes of recent deaths: the person, and their death/burial events.
    for (const p of persons) {
        const deathYear = yearOf(p.deathDate)
            ?? yearOf(p.events?.find(e => e.type === 'death' || e.type === 'burial')?.date);
        if (deathYear === null || deathYear < options.causeCutoffYear) continue;
        let removed = false;
        if (p.deathCause) { delete p.deathCause; removed = true; }
        for (const e of p.events ?? []) {
            if ((e.type === 'death' || e.type === 'burial') && e.cause) { delete e.cause; removed = true; }
        }
        if (removed) removedCauses.push({ name: nameOf(p), deathYear });
    }

    // 2. Private links: kept, but nothing beyond name, sex and relations.
    const privateIds = new Set(persons.filter(isPrivateLink).map(p => p.id));
    for (const p of persons) {
        if (!privateIds.has(p.id)) continue;
        for (const [key, value] of Object.entries(p)) {
            if (!PRIVATE_ALLOWED.has(key) && hasValue(value)) problems.push(`Osoba prywatna ${p.id}: pole „${key}” nie jest puste`);
        }
    }
    for (const u of unions) {
        if (!privateIds.has(u.person1Id) && !privateIds.has(u.person2Id)) continue;
        for (const [key, value] of Object.entries(u)) {
            if (!PRIVATE_UNION_ALLOWED.has(key) && hasValue(value)) problems.push(`Związek ${u.id} z osobą prywatną: pole „${key}” nie jest puste`);
        }
    }

    // 3. Possibly living, by Strom's own rule (private links and empty stand-ins
    //    aside). Strom infers an undated person's age from their children and
    //    marriages; a child of the 1860s with no name and no date has neither,
    //    so the parents decide too: no one is born more than 60 years after a
    //    parent's own birth. Such persons are listed for review, not blocked.
    const bounds = inferBirthUpperBounds(data);
    const deceasedByParents: string[] = [];
    for (const p of persons) {
        if (privateIds.has(p.id) || p.isPlaceholder || isNameless(p)) continue;
        if (!isLivingPerson(p, currentYear, bounds)) continue;
        const parentYears = (p.parentIds ?? []).map(id => yearOf(data.persons[id]?.birthDate)).filter((y): y is number => y !== null);
        const latestBirth = parentYears.length ? Math.max(...parentYears) + MAX_PARENT_AGE : null;
        if (latestBirth !== null && latestBirth + MAX_AGE < currentYear) {
            deceasedByParents.push(`${nameOf(p)} (${p.id}): rodzice ur. ${parentYears.join(', ')}`);
            continue;
        }
        problems.push(`Możliwie żyjąca: ${nameOf(p)} (${p.id}), ur. ${p.birthDate ?? '—'}`);
    }

    // 4. Review report: notes, event notes, union notes, sources.
    const relativesOfPrivate = new Set<string>();
    for (const id of privateIds) {
        const p = data.persons[id];
        for (const r of [...(p.parentIds ?? []), ...(p.childIds ?? [])]) relativesOfPrivate.add(r);
        for (const u of unions) {
            if (u.person1Id === id) relativesOfPrivate.add(u.person2Id);
            if (u.person2Id === id) relativesOfPrivate.add(u.person1Id);
        }
    }
    const review: ReviewItem[] = [];
    const flagsFor = (text: string, about: Person | undefined): string[] => {
        const flags: string[] = [];
        const years = [...text.matchAll(/\b(1[89]\d\d|20\d\d)\b/g)].map(m => +m[1]).filter(y => y >= options.reviewFromYear);
        if (years.length) flags.push(`lata ≥ ${options.reviewFromYear}: ${[...new Set(years)].slice(0, 6).join(', ')}`);
        if (about && relativesOfPrivate.has(about.id)) flags.push('bliski krewny osoby prywatnej');
        const born = yearOf(about?.birthDate);
        if (born !== null && born >= 1900) flags.push(`osoba ur. ${born}`);
        return flags;
    };
    for (const p of persons) {
        if (p.notes?.trim()) review.push({ kind: 'person-note', owner: `${nameOf(p)} (${p.id})`, text: p.notes.trim(), flags: flagsFor(p.notes, p) });
        for (const e of p.events ?? []) {
            if (e.note?.trim()) review.push({ kind: 'event-note', owner: `${nameOf(p)} (${p.id}) — ${e.type}`, text: e.note.trim(), flags: flagsFor(e.note, p) });
        }
    }
    for (const u of unions) {
        const a = data.persons[u.person1Id];
        const b = data.persons[u.person2Id];
        const text = u.note?.trim();
        if (text) {
            const flags = [...new Set([...flagsFor(text, a), ...flagsFor(text, b)])];
            review.push({ kind: 'partnership-note', owner: `${nameOf(a)} + ${nameOf(b)} (${u.id})`, text, flags });
        }
    }
    for (const s of Object.values(data.sources ?? {})) {
        const text = [s.title, s.note, s.transcript, ...(s.excerpts ?? []).map(x => (x as { text?: string }).text ?? '')]
            .filter(Boolean).join('\n').trim();
        const flags = flagsFor(text, undefined);
        if (flags.length) review.push({ kind: 'source', owner: `${s.title ?? s.id} (${s.id})`, text, flags });
    }
    review.sort((x, y) => (y.flags.length > 0 ? 1 : 0) - (x.flags.length > 0 ? 1 : 0));

    const report: PrepareReport = {
        persons: persons.length,
        partnerships: unions.length,
        sources: Object.keys(data.sources ?? {}).length,
        personsWithNotes: persons.filter(p => p.notes?.trim()).length,
        bornFrom1950: persons.filter(p => (yearOf(p.birthDate) ?? 0) >= 1950).length,
        privateLinks: privateIds.size,
        removedCauses,
        deceasedByParents,
        problems,
        review,
    };
    return { data, report };
}

/** The review report as Markdown, for a person to read before publishing. */
export function reviewMarkdown(report: PrepareReport, title: string): string {
    const flagged = report.review.filter(r => r.flags.length);
    const rest = report.review.filter(r => !r.flags.length);
    const kindName: Record<ReviewItem['kind'], string> = {
        'person-note': 'Notatka osoby', 'event-note': 'Notatka wydarzenia', 'partnership-note': 'Notatka związku', source: 'Źródło',
    };
    const item = (r: ReviewItem) => `### ${kindName[r.kind]}: ${r.owner}\n\n${r.flags.length ? `**Do sprawdzenia:** ${r.flags.join('; ')}\n\n` : ''}${r.text.split('\n').map(l => `> ${l}`).join('\n')}\n`;
    return [
        `# ${title} — przegląd przed publikacją`,
        '',
        'Plik JSON drzewa wzorcowego będzie publiczny. Przeczytaj poniższe teksty i usuń z drzewa (w MyHeritage, przed eksportem GEDCOM) wszystko, co dotyczy osób żyjących albo jest zbyt osobiste. Powiązania rodzinne mogą pozwolić rozpoznać osoby zanonimizowane — tego żadna kontrola automatyczna nie wykluczy.',
        '',
        `- Osoby: ${report.persons}, związki: ${report.partnerships}, źródła: ${report.sources}`,
        `- Osoby prywatne (łączniki): ${report.privateLinks}`,
        `- Osoby z notatkami: ${report.personsWithNotes}; urodzone od 1950: ${report.bornFrom1950}`,
        `- Usunięte przyczyny zgonu: ${report.removedCauses.length}`,
        `- Problemy blokujące publikację: ${report.problems.length}`,
        '',
        ...(report.problems.length ? ['## Problemy blokujące', '', ...report.problems.map(p => `- ${p}`), ''] : []),
        `## Uznane za zmarłe na podstawie dat rodziców (${report.deceasedByParents.length})`, '',
        ...(report.deceasedByParents.length ? report.deceasedByParents.map(d => `- ${d}`) : ['- brak']),
        '',
        '## Usunięte przyczyny zgonu', '',
        ...(report.removedCauses.length ? report.removedCauses.map(c => `- ${c.name} (zm. ${c.deathYear})`) : ['- brak']),
        '',
        `## Oznaczone do sprawdzenia (${flagged.length})`, '',
        ...flagged.map(item),
        `## Pozostałe notatki (${rest.length})`, '',
        ...rest.map(item),
    ].join('\n');
}
