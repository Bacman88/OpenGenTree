# OpenGenTree — lista zmian

OpenGenTree to fork aplikacji [Strom](https://github.com/ACiDekCZ/strom) Milana Víška (AGPL-3.0-or-later). Wersje OpenGenTree są numerowane osobno; przy każdej podana jest wersja Stroma, na której bazuje. Zmiany samego Stroma: [lista zmian Stroma](https://github.com/ACiDekCZ/strom/blob/main/CHANGELOG.md).

## 0.2.0 — 2026-11-03

Na bazie Strom 3.21.2.

**Warianty górnośląskie imion, nazwisk i miejscowości (gmina Koszęcin i okolice)** — pierwszy słownik wariantów z analiz „Rodowodu Sołectwa Strzebiń”, używany przy wyszukiwaniu dopasowań osób między drzewami (OGT-040).

- **Imiona:** polskie formy rejestrowe połączone z łacińskimi, niemieckimi i czeskimi (Józef = Josephus = Josef, Jan = Joannes = Johann, Wojciech = Adalbert, Wawrzyniec = Laurentius, Małgorzata = Margaretha, Jadwiga = Hedwig…); nowe grupy częste na Śląsku (Walenty, Kacper, Grzegorz, Łucja, Wiktoria, Ewa i inne). Albert jako możliwy zapis Wojciecha — do weryfikacji.
- **Nazwiska:** 30 grup wariantów do weryfikacji, m.in. Burejza / Bureiza / Burieza, Karmański / Karmainski, Kopeć / Kopetz / Kopetsch, Krus / Krusch / Kruhs, König / Koenig, Maniura / Manjura, Pyrek / Pyrrek / Pirrek, Płaszczymąka / Plascymonka. Wykluczenia: Franczyk ≠ Urbanczyk, Biedzik ≠ Idzik, Blachowski ≠ Wachowski.
- **Miejscowości:** Strzebiń (Strzebin, Strzebin O.S., Strzebin, Lublinitz), Łazy w Strzebiniu (Laasen), Kolonia Strzebińska (Erdmannshain), Koszęcin (Koschentin), Prądy (Brande, Prondy), Lubsza Śl. (Lubschau), Boronów, Sadów (Sodow), Babienica (Babinitz), Dobrodzień (Guttentag). Każda miejscowość ma własny identyfikator; Kolonia Strzebińska, Łazy i Bagno nie są łączone ze Strzebiniem.
- Warianty pomagają znaleźć tę samą osobę zapisaną inaczej, ale same jej nie dowodzą: zgodne nazwisko czy miejscowość tylko podnosi wynik, a nic nie jest scalane ani poprawiane automatycznie. Oryginalna pisownia w drzewie zostaje bez zmian.
- Wszystkie wpisy startowe mają status „do weryfikacji”; słownik będzie rozbudowywany na podstawie GEDCOM-u.

**Formularz osoby** (OGT-041)

- Przełącznik „Nie żyje” jest na górze sekcji „Zgon i inne wydarzenia”; data, miejsce, szczegóły i źródła zgonu pojawiają się dopiero po jego włączeniu.
- Wpisane dane zgonu nigdy nie są ukrywane: jeśli osoba ma datę lub miejsce zgonu, pola są widoczne niezależnie od przełącznika.

## 0.1.0 — 2026-11-03

Na bazie Strom 3.21.2.

- Pierwsze wydanie pod adresem [opengentree.smart-ant.pl](https://opengentree.smart-ant.pl/).
- Aplikacja działa na naszej domenie jako aplikacja, a nie jako eksportowany plik z drzewem (bez banera „przejdź na stromapp.info”).
- Automatyczne wdrażanie z GitHuba na Joton.io (`npm run deploy:joton`).
- Marka OpenGenTree: nazwa, logo, favicon, lekko zmienione kolory.
- Okno „O programie”: wersja OpenGenTree, informacja, że to fork Stroma, z wersją Stroma i nazwiskiem autora oryginału, link do kodu źródłowego forka (AGPL) i do tej listy zmian.
- Funkcje genealogiczne bez zmian względem Stroma 3.21.2.
