# OpenGenTree — drzewo wzorcowe „Rodowód Sołectwa Strzebiń” (OGT-050)

Drzewo wzorcowe to opublikowane drzewo, które użytkownik dodaje do swoich drzew **tylko do odczytu**, porównuje z nim własne drzewo (Smart Matches) i może zapisać jego **edytowalną kopię**.

## Zasady

- **Dane nie trafiają do repozytorium** (jest publiczne) ani do samej aplikacji. Plik leży na serwerze w `public_html/samples/` i jest pobierany na żądanie.
- **Plik JSON jest publiczny.** Każdy może go pobrać, niezależnie od blokady edycji w aplikacji. Ukrycie nazwiska osoby żyjącej nie wystarczy: dane mogą być w notatkach, źródłach, opisach wydarzeń i w samych powiązaniach rodzinnych. Dlatego przed każdą publikacją obowiązuje przegląd (niżej). Ryzyka rozpoznania osób zanonimizowanych przez powiązania rodzinne nie usunie żadna kontrola automatyczna.
- **Osoby prywatne** („Osoba prywatna”) zostają w drzewie jako łączniki między pokoleniami; mogą mieć tylko imię/nazwisko „Osoba prywatna”, płeć i powiązania.

## Przygotowanie nowej wersji

1. Wyeksportuj GEDCOM z MyHeritage.
2. W repozytorium uruchom:

   ```sh
   npm ci --ignore-scripts
   node scripts/ogt/make-reference-tree.mjs ścieżka/do/pliku.ged --version 2026-11-03
   ```

   Opcje: `--out` (domyślnie `reference-out/`, poza gitem), `--id` (`rodowod-strzebin`), `--name`, `--cause-cutoff` (domyślnie 1980), `--review-from` (domyślnie 1925), `--focus` (osoba startowa: `auto` albo identyfikator osoby). Wersja musi rosnąć z każdą publikacją (data, a przy kilku w jednym dniu np. `2026-11-03b`).
3. Skrypt czyta GEDCOM parserem Stroma (te same reguły co import w aplikacji) i:
   - usuwa przyczynę zgonu u osób zmarłych od 1980 r. (także w wydarzeniach zgonu i pogrzebu);
   - sprawdza, czy osoby prywatne nie mają żadnych innych danych — także przez związki (data i miejsce ślubu);
   - sprawdza, czy nie ma osób możliwie żyjących wg reguły Stroma; osobę bez dat uznaje za zmarłą, jeśli jej rodzic urodził się ponad 180 lat temu (60 lat na urodzenie dziecka + 120 lat życia) i wypisuje ją w raporcie;
   - wybiera **osobę startową** (`--focus auto`): przodka powiązanego z największą liczbą osób, czyli z największą liczbą potomków wśród osób z datą urodzenia (przy remisie: więcej dzieci, potem wcześniejsze urodzenie); osoby prywatne i rekordy bez imienia lub dat się nie liczą;
   - zapisuje raport do przeglądu `reference-out/<id>.review.md`: wszystkie notatki osób, związków i wydarzeń oraz źródła, które wspominają lata od 1925 albo dotyczą osób urodzonych po 1900 lub bliskich krewnych osób prywatnych — oznaczone na początku.
   Przy problemie blokującym skrypt kończy się błędem i **nie zapisuje** pliku drzewa.
4. **Przeczytaj raport** i popraw dane w MyHeritage (potem wróć do kroku 1).
5. Wgraj na Joton do `public_html/samples/` dwa pliki: `<id>.json` i `<id>.manifest.json` (raportu nie wgrywaj). Skrypt wdrożenia aplikacji nie usuwa tego katalogu.

## W aplikacji

- Drzewo otwiera się na osobie startowej z manifestu (`focus`).
- Menu nowego drzewa → **„Rodowód Sołectwa Strzebiń”**; także odnośnik na ekranie startowym obok „Wypróbuj drzewo przykładowe”.
- Plik jest pobierany w całości i sprawdzany (rozmiar, SHA-256, liczba osób z manifestu), dopiero potem zapisany jako drzewo — zablokowane blokadą drzewa Stroma i oznaczone jako wzorcowe (`localStorage`: `ogt-reference-trees`).
- **Odblokowanie jest niemożliwe**: zamiast tego okno z wyborem „Zapisz kopię do edycji” albo „Usuń z listy”. Kopia to zwykłe, edytowalne drzewo („… (moja kopia)”).
- **Smart Matches**: Strom porównuje osoby z każdym widocznym drzewem użytkownika, więc drzewo wzorcowe jest porównywane automatycznie, ze słownikiem wariantów (OGT-040). Przy osobie, która jest też we wzorcu, pojawia się znaczek ⇄ z nazwą drzewa wzorcowego i powodem dopasowania.
- **Aktualizacja**: po starcie aplikacji sprawdzany jest manifest. Nowsza wersja jest pobierana w całości i sprawdzana (rozmiar, SHA-256, liczba osób, poprawny JSON) **zanim** zastąpi zapisane drzewo — w tym samym miejscu, z zachowaniem blokady. Przy jakimkolwiek błędzie zostaje poprzednia wersja. Kopie użytkownika nie są ruszane.

## Sprawdzone na danych z 2026-11-03

| | |
| --- | --- |
| Osoby / związki / źródła | 6 774 / 2 198 / 2 631 |
| Osoby prywatne (łączniki) | 49, bez innych danych |
| Usunięte przyczyny zgonu (zgon od 1980) | 27 |
| Uznane za zmarłe na podstawie dat rodziców | 1 (dziecko rodziców ur. 1836/1837) |
| Do przeglądu | 452 teksty, 123 oznaczone |
| Rozmiar pliku | ok. 4 MB, pobranie i zapis ok. 3 s |
| Osoba startowa | Wawrzyniec Świerc (1740–1804, Boronów) — 417 potomków |

W Chrome: dodanie drzewa, odmowa edycji i odblokowania, kopia edytowalna, dopasowanie osoby zapisanej jako „Manjura”, „Strzebin O/S” do Józefa Fryderyka Maniury we wzorcu, odrzucenie uszkodzonej aktualizacji, przyjęcie poprawnej.

## Ograniczenia

- Pierwsze wyświetlenie znaczków ⇄ po dodaniu wzorca trwa kilka sekund: Strom porównuje każdą osobę z każdą osobą wzorca (bez indeksu kandydatów). Przy większych wzorcach potrzebny będzie indeks (Smart Matches po stronie serwera).
- Parser Stroma nadaje osobom nowe identyfikatory przy każdym przygotowaniu pliku, więc identyfikatory we wzorcu zmieniają się między wersjami. Dopasowania na tym nie tracą (porównują imiona, daty, miejsca i rodziny), ale przyszłe zapamiętane decyzje o dopasowaniach będą potrzebowały stałych identyfikatorów (np. z GEDCOM-u).
