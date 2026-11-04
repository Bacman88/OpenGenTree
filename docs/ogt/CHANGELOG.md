# OpenGenTree — lista zmian

OpenGenTree to fork aplikacji [Strom](https://github.com/ACiDekCZ/strom) Milana Víška (AGPL-3.0-or-later). Wersje OpenGenTree są numerowane osobno; przy każdej podana jest wersja Stroma, na której bazuje. Zmiany samego Stroma: [lista zmian Stroma](https://github.com/ACiDekCZ/strom/blob/main/CHANGELOG.md).

## 0.4.1 — 2026-11-03

Na bazie Strom 3.21.2.

**Wyszukiwanie po nazwisku panieńskim i po mężu** (OGT-061)

- Kobieta jest znajdowana także po nazwisku męża (każdego) i po nazwisku ojca, nawet gdy w jej rekordzie wpisano tylko jedno z nich albo żadne. „Marianna Ochmann”, żona Kiliana Ulfika, znajdzie się pod „Ulfik”; „Pietruszewska” znajdzie żonę Stanisława Pietruszewskiego.
- Na liście wyników widać, dlaczego ktoś został znaleziony: „po mężu: Ulfik”, „z domu: Ochmann”.
- Kobieta bez wpisanego nazwiska wyświetla się z nazwiskiem ostatniego męża, np. „Franciszka Ulfik” (formy -ski/-cki zmieniane na -ska/-cka), a na liście wyników z dopiskiem „żona: Franciszek Ulfik”. Osoba bez nazwiska i bez męża dostaje dopisek „córka: …” / „syn: …”.
- To tylko wyświetlanie i wyszukiwanie: rekord i plik GEDCOM się nie zmieniają; po wpisaniu nazwiska w formularzu wyświetla się wpisane.

## 0.4.0 — 2026-11-03

Na bazie Strom 3.21.2.

**Daty i miejscowości w formularzach** (OGT-060)

- **Kalendarz przy każdym polu daty** (urodzenie, zgon, wydarzenia, związki): ikona otwiera kalendarz przeglądarki, a wybrana data trafia do pola w formacie aplikacji (np. 15.5.1880). Pole nadal przyjmuje daty częściowe i przybliżone („1880”, „5.1880”, „ok. 1880”, „przed 1900”, „1880..1885”).
- **Podgląd pod polem**: jak aplikacja rozumie wpisaną datę — „15 maja 1880”, „ok. 3 kwietnia 1850”. Błędna data (np. 31.2.1880) jak dotąd dostaje czerwoną ramkę.
- **Podpowiedzi miejscowości** w polach miejsca (urodzenie, zamieszkanie, zgon, wydarzenia, śluby): najpierw miejscowości z Twojego drzewa (najczęściej używane na górze), potem ze słownika wariantów, potem z „Rodowodu Sołectwa Strzebiń”, jeśli jest dodany. Polskie znaki są opcjonalne („la” → Łazy, „koszec” → Koszęcin), działają też dawne zapisy („Koschen” → Koszęcin). Wybór strzałkami i Enterem albo myszą.
- To tylko podpowiedzi: można wpisać dowolną nazwę, nic nie jest poprawiane automatycznie.

**Szybsze wyszukiwanie osób**

- Wyszukiwarka w pasku i okna wyboru osoby nie zacinają się już na dużych drzewach: przy ~6 700 osobach (Rodowód) jedno naciśnięcie klawisza zajmowało kilka sekund, teraz ok. 0,1 s. Poprawka błędu Stroma (przy każdej osobie liczono od nowa całe drzewo).

## 0.3.0 — 2026-11-03

Na bazie Strom 3.21.2.

**Drzewo wzorcowe „Rodowód Sołectwa Strzebiń”** (OGT-050)

- Nowa pozycja w menu nowego drzewa i na ekranie startowym: „Rodowód Sołectwa Strzebiń”. Drzewo jest pobierane z serwera i dodawane tylko do odczytu; nie da się go odblokować, ale można zapisać jego edytowalną kopię albo usunąć je z listy.
- Twoje drzewa są automatycznie porównywane z drzewem wzorcowym (Smart Matches): przy osobie, która jest też we wzorcu, pojawia się znaczek ⇄ — także gdy nazwisko lub miejscowość zapisano inaczej (słownik wariantów z 0.2.0).
- Nowe wersje drzewa wzorcowego są pobierane automatycznie, ale zastępują poprzednią dopiero po pełnym sprawdzeniu pliku; Twoje kopie zostają bez zmian.
- Dane drzewa są przygotowywane z dbałością o prywatność: osoby żyjące są zanonimizowane, przyczyny zgonów od 1980 r. usunięte.

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
