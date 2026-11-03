/**
 * Given names that are one name in another language of the registers.
 *
 * A Bohemian parish register writes Latin (Wenceslaus, Catharina, Joannes),
 * a German-kept one German (Wenzel, Katharina, Johann), the family says it in
 * Czech (Václav, Kateřina, Jan). Read against the tree they are the same
 * person's name, not a different one: comparing them says nothing new.
 *
 * Silesian and other Polish registers do the same with Polish as the spoken
 * language (Joannes / Johann / Jan, Josephus / Josef / Józef), so the Polish
 * form sits in the same group as the Czech one.
 *
 * A group lists the common register forms of one name. Forms are compared
 * without accents and case (ł as l). A form that belongs to two names (Albert
 * as Vojtěch or Albert) is left out: a group only says "the same" where it is.
 */

const GROUPS: readonly string[] = [
    // Men
    'Václav Wenceslaus Venceslaus Wenzel Wenzl Wacław',
    'Jan Joannes Johannes Ioannes Johann Hans',
    'Josef Josephus Joseph Józef',
    'Jiří Georgius Georg Jerzy',
    'František Franciscus Franz Franciszek',
    'Antonín Antonius Anton Antoni',
    'Matěj Matthias Mathias Maciej',
    'Matouš Matthaeus Matthäus Mateusz',
    'Tomáš Thomas Tomasz',
    'Martin Martinus Marcin',
    'Petr Petrus Peter Piotr',
    'Pavel Paulus Paul Paweł',
    'Jakub Jacobus Jakob',
    'Ondřej Andreas Andrzej',
    'Vojtěch Adalbertus Adalbert Wojciech',
    'Karel Carolus Karl Karol',
    'Jindřich Henricus Heinrich Henryk',
    'Michal Michael',
    'Mikuláš Nicolaus Nikolaus Mikołaj',
    'Lukáš Lucas Lukas Łukasz',
    'Filip Philippus Philipp',
    'Vavřinec Laurentius Lorenz Wawrzyniec',
    'Bartoloměj Bartholomaeus Bartholomäus Bartłomiej',
    'Štěpán Stephanus Stephan Stefan Szczepan',
    'Ignác Ignatius Ignaz Ignacy',
    'Vincenc Vincentius Vinzenz Wincenty',
    'Florián Florianus Florian',
    'Prokop Procopius',
    'Kryštof Christophorus Christoph Krzysztof',
    'Ludvík Ludovicus Ludwig Ludwik',
    'Zikmund Sigismundus Sigmund Zygmunt',
    'Bedřich Fridericus Friedrich Fryderyk',
    'Augustin Augustinus Augustyn',
    'Šimon Simon Simeon Szymon',
    'Valentin Valentinus Walenty',
    'Kašpar Casparus Caspar Kaspar Kacper',
    'Řehoř Gregorius Gregor Grzegorz',
    'Vilém Wilhelmus Wilhelm',
    'Teodor Theodorus Theodor',
    'Konstantin Constantinus Konstanty',
    'Emanuel Emmanuel Emanuelus',
    // Women
    'Marie Maria',
    'Kateřina Catharina Catherina Katharina Katarina Katarzyna',
    'Alžběta Elisabetha Elisabeth Elisabet Elżbieta',
    'Magdalena Magdalene Majdalena',
    'Barbora Barbara',
    'Dorota Dorothea',
    'Terezie Tereza Theresia Therese Teresa',
    'Johana Joanna Johanna',
    'Veronika Veronica Weronika',
    'Rozálie Rosalia Rosalie Rozalia',
    'Františka Francisca Franziska Franciszka',
    'Josefa Josepha Józefa',
    'Markéta Margaretha Margarethe Margareta Małgorzata',
    'Ludmila Ludmilla',
    'Apolena Apollonia Apolonia',
    'Voršila Ursula Urszula',
    'Zuzana Susanna Susanne Zuzanna',
    'Klára Clara Klara',
    'Anežka Agnes Agnieszka',
    'Hedvika Hedwigis Hedvigis Hedwig Jadwiga',
    'Gertruda Gertrudis Gertrud',
    'Juliana Julianna Julianne',
    'Agáta Agatha Agata',
    'Lucie Lucia Luzia Łucja',
    'Viktorie Victoria Viktoria Wiktoria',
    'Eva Ewa',
    'Helena Helene',
];

function fold(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
        .replace(/ł/g, 'l')                       // ł has no combining mark in NFD
        .replace(/\s+/g, ' ').trim();
}

/** Folded form → the group's first form (folded). */
const KEY = new Map<string, string>();
for (const group of GROUPS) {
    const forms = group.split(' ').map(fold);
    for (const f of forms) KEY.set(f, forms[0]);
}

function key(name: string): string {
    return fold(name).split(' ').map(w => KEY.get(w) ?? w).join(' ');
}

/**
 * One key per name: the same for every register form of it (Józef, Josephus
 * and Josef all give "josef"), the folded word itself for a name no group
 * knows. Several names give one key per word, space-separated.
 */
export function givenNameKey(name: string): string {
    return key(name);
}

/**
 * The same given name, written alike or in another register language
 * (Wenceslaus = Wenzel = Václav). Several names compare word by word
 * (Joannes Nepomucenus = Jan Nepomucenus).
 */
export function sameGivenName(a: string, b: string): boolean {
    return key(a) === key(b);
}
