/**
 * OpenGenTree date fields (OGT-060): a calendar button next to every date
 * field, and a line under it saying how the date was understood.
 *
 * Strom's date fields are text on purpose: genealogy needs partial and
 * approximate dates ("1880", "5.1880", "ok. 1880", "przed 1900"), which a
 * browser date input cannot hold. So the text field stays, and the calendar
 * is an extra way in: it opens the browser's own date picker and writes the
 * chosen full date in the app's format (15.5.1880 in Polish). The preview
 * ("15 maja 1880") catches day/month mix-ups; an invalid date keeps Strom's
 * red border.
 *
 * Works on the page Strom builds (every `input.flex-date`, also those created
 * later, e.g. in the relations panel) without changing Strom's files.
 */

import { normalizeDateInput, parseFlexDate, formatDateForInput, formatFlexDate } from '../dates.js';
import { getCurrentLanguage } from '../strings.js';

/** The picker's value (YYYY-MM-DD) for a field's text, when it is one full, exact date; else ''. */
export function pickerValueFor(text: string): string {
    const canonical = normalizeDateInput(text);
    if (!canonical) return '';
    const d = parseFlexDate(canonical);
    if (!d || d.qualifier || d.end || d.period || d.day === undefined || d.month === undefined) return '';
    return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

/** The field's text for a date chosen in the picker (YYYY-MM-DD), in the app's input format. */
export function textFromPicker(value: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return '';
    const canonical = normalizeDateInput(`${+m[1]}-${+m[2]}-${+m[3]}`);
    return canonical ? formatDateForInput(canonical) : '';
}

/** Polish month names in the genitive, as a day is written: "15 maja 1880". */
const PL_MONTH_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

/** How the field's text is understood ("15 maja 1880"); '' when empty, invalid or saying nothing new. */
export function datePreview(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return '';
    const canonical = normalizeDateInput(trimmed);
    if (!canonical) return '';
    let shown = formatFlexDate(canonical);
    // Strom writes Polish days with numbers (15.5.1880); the month in words is what catches a day/month mix-up.
    if (getCurrentLanguage() === 'pl') {
        shown = shown.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{1,4})\b/g, (all, d, m, y) => (+m >= 1 && +m <= 12 ? `${+d} ${PL_MONTH_GEN[+m - 1]} ${y}` : all));
    }
    return shown && shown !== trimmed ? shown : '';
}

const ENHANCED = 'ogtDate';

function label(): string {
    return getCurrentLanguage() === 'pl' ? 'Wybierz datę z kalendarza' : 'Pick the date from a calendar';
}

const CALENDAR_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

const STYLE = `
.ogt-date-wrap { position: relative; display: block; }
.ogt-date-wrap > input.flex-date { padding-right: 38px; width: 100%; box-sizing: border-box; }
.ogt-date-btn {
    position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    width: 30px; height: 30px; padding: 0; border: none; border-radius: var(--r-sm, 6px);
    background: transparent; color: var(--text-faint, #746c5c); cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
}
.ogt-date-wrap > .ogt-date-btn { min-width: 0; min-height: 0; box-shadow: none; }
.ogt-date-btn svg { width: 16px; height: 16px; min-width: 16px; flex: none; display: block; }
.ogt-date-btn:hover, .ogt-date-btn:focus-visible { color: var(--primary, #2f6656); background: var(--primary-soft, #e2eeea); }
.ogt-date-native { position: absolute; right: 0; bottom: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; border: 0; padding: 0; }
.ogt-date-wrap.ogt-readonly .ogt-date-btn { display: none; }
.ogt-date-preview { margin-top: 3px; font-size: 12px; color: var(--text-faint, #746c5c); min-height: 0; }
.ogt-date-preview:empty { display: none; }
`;

function enhance(input: HTMLInputElement): void {
    if (input.dataset[ENHANCED]) return;
    input.dataset[ENHANCED] = '1';

    const wrap = document.createElement('span');
    wrap.className = 'ogt-date-wrap';
    input.parentNode!.insertBefore(wrap, input);
    wrap.appendChild(input);

    const native = document.createElement('input');
    native.type = 'date';
    native.className = 'ogt-date-native';
    native.tabIndex = -1;
    native.setAttribute('aria-hidden', 'true');
    native.min = '0100-01-01';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ogt-date-btn';
    btn.innerHTML = CALENDAR_ICON;
    wrap.append(btn, native);

    const preview = document.createElement('div');
    preview.className = 'ogt-date-preview';
    preview.setAttribute('aria-live', 'polite');
    wrap.after(preview);

    const refresh = () => {
        wrap.classList.toggle('ogt-readonly', input.readOnly || input.disabled);
        btn.title = label();
        btn.setAttribute('aria-label', label());
        preview.textContent = datePreview(input.value);
    };
    input.addEventListener('input', refresh);
    input.addEventListener('change', refresh);
    input.addEventListener('focus', refresh);

    btn.addEventListener('click', () => {
        if (input.readOnly || input.disabled) return;
        native.value = pickerValueFor(input.value);
        native.max = new Date().toISOString().slice(0, 10);
        try {
            (native as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        } catch {
            native.focus();
        }
    });
    native.addEventListener('change', () => {
        const text = textFromPicker(native.value);
        if (!text) return;
        input.value = text;
        // Strom's own handlers (validation, "Deceased" auto-tick, summaries) listen to these.
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
    });
    refresh();
}

function enhanceAll(root: ParentNode = document): void {
    root.querySelectorAll<HTMLInputElement>('input.flex-date').forEach(enhance);
}

/** Previews of fields Strom filled without events (a dialog opening on a person). */
function refreshAll(): void {
    document.querySelectorAll<HTMLInputElement>('input.flex-date').forEach(input => {
        const preview = input.closest('.ogt-date-wrap')?.nextElementSibling;
        if (preview?.classList.contains('ogt-date-preview')) preview.textContent = datePreview(input.value);
        const wrap = input.closest('.ogt-date-wrap');
        wrap?.classList.toggle('ogt-readonly', input.readOnly || input.disabled);
        const btn = wrap?.querySelector('.ogt-date-btn');
        if (btn && btn.getAttribute('aria-label') !== label()) { btn.setAttribute('aria-label', label()); btn.setAttribute('title', label()); }
    });
}

export function installDateInputs(): void {
    const style = document.createElement('style');
    style.id = 'ogt-date-input';
    style.textContent = STYLE;
    document.head.appendChild(style);
    enhanceAll();
    // Fields made later (the relations panel re-renders its rows).
    new MutationObserver(records => {
        for (const r of records) {
            r.addedNodes.forEach(n => {
                if (n instanceof HTMLInputElement && n.classList.contains('flex-date')) enhance(n);
                else if (n instanceof HTMLElement) enhanceAll(n);
            });
        }
    }).observe(document.body, { childList: true, subtree: true });
    // A dialog opening shows values set without events: refresh once it is open.
    const watch = new MutationObserver(() => requestAnimationFrame(refreshAll));
    document.querySelectorAll('.modal-overlay').forEach(m => watch.observe(m, { attributes: true, attributeFilter: ['class'] }));
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installDateInputs);
    else installDateInputs();
}
