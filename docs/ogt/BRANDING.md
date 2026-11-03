# OpenGenTree — marka i wygląd (OGT-011, OGT-012)

OpenGenTree ma własną nazwę, logo i lekko zmienioną paletę, ale układ i działanie Stroma zostają bez zmian. Informacja o autorze oryginału i licencji AGPL zostaje: okno „O programie” mówi „Fork aplikacji Strom, autor oryginału: Milan Víšek”, a nagłówek licencji w źródle strony jest nietknięty.

## Co się zmienia

| Element | Było | Jest | Gdzie |
| --- | --- | --- | --- |
| Tytuł karty | Strom | OpenGenTree | `scripts/ogt/prepare-public.mjs` |
| Favicon | kontur drzewa Stroma | znak OpenGenTree | `scripts/ogt/brand.mjs` |
| Pasek (komputer) | „Strom” + miedziana kropka | znak + „OpenGenTree” | `prepare-public.mjs` |
| Pasek (telefon) | ikona drzewa Stroma | znak OpenGenTree | `prepare-public.mjs` |
| „O programie” | logo i nazwa Stroma, „Stworzył” | znak, „OpenGenTree <wersja>”, „Fork aplikacji Strom, autor oryginału:” | `prepare-public.mjs`, `src/ogt/branding.ts` |
| Wersja w „O programie” | wersja Stroma (3.21.2) | wersja OpenGenTree (`src/ogt/version.ts`, start 0.1.0); wersja Stroma w linii o forku | `branding.ts`, `prepare-public.mjs` |
| Pierwszy link w „O programie” | stromapp.info | opengentree.smart-ant.pl (stromapp.info w linii o forku) | `prepare-public.mjs` |
| „Co nowego” | lista zmian Stroma | `docs/ogt/CHANGELOG.md` | `branding.ts` |
| Linia o wsparciu | „Strom jest bezpłatny…” | „OpenGenTree bazuje na bezpłatnej aplikacji open source Strom. Możesz wesprzeć jej autora.” (link „Postaw kawę” do autora Stroma zostaje) | `branding.ts` |
| Kolory marki | zieleń `#3f6b4f`, miedź `#b0703c` | zieleń morska `#2f6656`, cegła `#a85a3c` (+ odpowiedniki dla motywu ciemnego) | `brand.mjs` (`BRAND_CSS`) |

Bez zmian zostają: układ, czcionki, kolory kart i wykresów, teksty Stroma poza oknem „O programie”, „Postaw kawę” (wsparcie autora oryginału), okno „Co nowego” po aktualizacji (pokazuje zmiany Stroma) oraz ikona funkcji Strom Research (osobny produkt autora).

## Wersja

OpenGenTree ma własny numer wersji w `src/ogt/version.ts` (start: 0.1.0), podbijany przy każdym wydaniu razem z wpisem w `docs/ogt/CHANGELOG.md`. Wersja Stroma (`package.json`, `APP_VERSION`) zostaje bez zmian, bo od niej zależą format danych, sprawdzanie aktualizacji i notatki o wydaniu. Strom wpisuje swoją wersję i link „Co nowego” przy każdym otwarciu okna „O programie”; `src/ogt/branding.ts` zaraz potem przywraca wartości OpenGenTree (obserwator zmian w oknie), więc żaden plik Stroma nie musiał się zmienić.

## Znak

Drzewo rodowe: przodek u podstawy (kolor akcentu), od którego linia rośnie i rozchodzi się na trzech potomków (kolor główny). Rysowany jako SVG w kodzie strony, kolory pochodzą z CSS (`.ogt-mark .st/.nd/.rt`), więc sam przechodzi na motyw ciemny. Favicon to ten sam znak z wpisanymi kolorami motywu jasnego.

## Paleta

Nadpisywane są tylko tokeny marki, w stylu `<style id="ogt-brand">` dodanym na końcu `<head>` opublikowanej strony (te same selektory co u Stroma, później w kodzie, więc wygrywają).

| Token | Jasny | Ciemny |
| --- | --- | --- |
| `--primary` | `#2f6656` | `#6fa293` |
| `--primary-dark` (hover) | `#234f43` | `#88b8aa` |
| `--primary-soft` | `#e2eeea` | `#2e3f3a` |
| `--accent` | `#a85a3c` | `#cf7f60` |
| `--accent-text` | `#8a4429` | `#d98a6c` |

Kontrast (WCAG 2): biały na `--primary` 6,6:1; `--accent-text` na `--surface-2` 6,4:1; w motywie ciemnym tusz na `--primary` 5,9:1 i `--accent-text` na `--surface` 5,1:1 — co najmniej tyle, ile obiecują tokeny Stroma.

## Jak to jest zrobione

- Wygląd (tytuł, favicon, znak, nazwa w nagłówku „O programie”, paleta) dopisuje `prepare-public.mjs` do publikowanej kopii strony, tak jak link do źródeł forka. `index.html` Stroma zostaje nietknięty, więc lokalny `npm run dev` pokazuje oryginalny wygląd; markę widać w `npm run build:public` i na serwerze.
- Teksty okna „O programie” we wszystkich czterech językach ustawia `src/ogt/branding.ts` przy starcie aplikacji (jedna linia importu w `src/main.ts`).
- Każda podmiana wymaga dokładnie jednego trafienia. Jeśli nowe wydanie Stroma zmieni któryś fragment, build zatrzyma się z komunikatem, zamiast opublikować stronę z połową starej marki.

## Testy

- `src/__tests__/ogt-branding.test.ts`: nazwa w oknie „O programie” we wszystkich językach, wzmianka o Stromie i zachowany autor, odporność na zmianę języka.
- Zrzuty ekranu (jasny i ciemny motyw, komputer i telefon, okno „O programie”) sprawdzone ręcznie przy wdrożeniu OGT-011.
