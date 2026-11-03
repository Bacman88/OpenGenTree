/**
 * OpenGenTree person form (OGT-041): the "Deceased" switch comes first in the
 * "Death and other events" section, and the death fields (date, place,
 * details, the death's sources) appear once it is on.
 *
 * Data is never hidden: a person with a death date or place written shows
 * the fields whatever the switch says. Strom ticks the switch itself for a
 * person born long ago or once a death field is filled
 * (ui/deceased-autotick.ts), and the fields follow it.
 *
 * Done on the page Strom builds, without changing Strom's files: the switch
 * is moved once, and visibility is refreshed whenever the dialog opens or the
 * switch or a death field changes. The fields carry a class rather than an
 * inline style, so Strom's own style rules for the sources row keep working.
 */

/** Ids of the death inputs whose values keep the fields shown. */
const DEATH_VALUE_IDS = ['input-deathdate', 'input-deathplace', 'input-death-cause', 'input-death-age', 'input-death-address'];
const HIDDEN_CLASS = 'ogt-death-hidden';

/** Whether the death fields are shown: the switch is on, or something is written in them. */
export function deathFieldsVisible(deceased: boolean, values: readonly string[]): boolean {
    return deceased || values.some(v => v.trim() !== '');
}

function deathBlocks(section: Element): Element[] {
    const date = document.getElementById('input-deathdate');
    return [
        date?.closest('.form-grid') ?? null,
        document.getElementById('death-details'),
        document.getElementById('death-sources-group'),
    ].filter((el): el is Element => !!el && section.contains(el));
}

function refresh(): void {
    const box = document.getElementById('input-is-deceased') as HTMLInputElement | null;
    const section = box?.closest('.pm-section');
    if (!box || !section) return;
    const values = DEATH_VALUE_IDS.map(id => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '');
    const show = deathFieldsVisible(box.checked, values);
    for (const el of deathBlocks(section)) el.classList.toggle(HIDDEN_CLASS, !show);
}

/** Put the switch at the top of its section, under the section heading. Once. */
function moveSwitchUp(): void {
    const group = document.getElementById('input-deceased-group');
    const section = group?.closest('.pm-section');
    const head = section?.querySelector(':scope > .pm-section-head');
    if (!group || !head || head.nextElementSibling === group) return;
    head.after(group);
}

export function installPersonForm(): void {
    const modal = document.getElementById('person-modal');
    const box = document.getElementById('input-is-deceased') as HTMLInputElement | null;
    if (!modal || !box) return;

    const style = document.createElement('style');
    style.id = 'ogt-person-form';
    style.textContent = `#person-modal .${HIDDEN_CLASS} { display: none !important; }`;
    document.head.appendChild(style);

    moveSwitchUp();
    box.addEventListener('change', () => {
        refresh();
        // Switched on by hand with nothing written yet: go straight to the date.
        if (box.checked) {
            const date = document.getElementById('input-deathdate') as HTMLInputElement | null;
            if (date && !date.value && !date.readOnly) date.focus();
        }
    });
    for (const id of DEATH_VALUE_IDS) document.getElementById(id)?.addEventListener('input', refresh);
    // Strom fills the form and sets the switch without events, then opens the
    // dialog: refresh when it opens, and once more after its own setup ran.
    new MutationObserver(() => {
        if (modal.classList.contains('active')) { refresh(); requestAnimationFrame(refresh); }
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    refresh();
}

if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installPersonForm);
    else installPersonForm();
}
