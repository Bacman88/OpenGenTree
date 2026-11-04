/**
 * OpenGenTree (OGT-061): a woman written without a surname is shown under her
 * last husband's ("Franciszka Ulfik") on cards, in lists and in the search —
 * through Strom's single place of the shown name (person-name.ts), so every
 * view agrees. Nothing is written into the person or the file: the record
 * keeps what the source said, and the surname disappears from view as soon
 * as one is entered.
 */

import { setShownSurnameFallback } from '../person-name.js';
import { DataManager } from '../data.js';
import { Person, PersonId } from '../types.js';
import { lastHusbandSurname } from './search-names.js';

setShownSurnameFallback(person => {
    const p = person as Person;
    if (!p.id) return '';
    let data;
    try { data = DataManager.getData(); } catch { return ''; }
    // Only a person of the open tree (a match from another tree carries other ids).
    if (data?.persons?.[p.id as PersonId] !== p) return '';
    return lastHusbandSurname(p, data);
});
