# OpenGenTree — wdrożenie na Joton.io (OGT-009)

## Wartości do formularza wdrożenia

| Pole | Wartość |
| --- | --- |
| Repozytorium | `Bacman88/OpenGenTree` |
| Gałąź | `main` |
| Skrypt budowy | `npm ci --ignore-scripts && npm run build:public` |
| Katalog publikacji | `public` |
| Automatyczne wdrażanie po push | włączone tylko dla `main` |

## Co robi build

1. `npm ci --ignore-scripts` instaluje zależności z `package-lock.json` bez uruchamiania skryptów instalacyjnych paczek. Esbuild działa mimo to, bo jego binarka przychodzi jako paczka platformowa (`@esbuild/linux-x64`), a skrypt `postinstall` esbuilda tylko ją weryfikuje.
2. `npm run build:public` = `scripts/bundle.js` (oryginalny build Stroma, tworzy `strom.html` z wbudowanym JS, CSS, czcionkami i ikonami) oraz `scripts/ogt/prepare-public.mjs`, który tworzy od zera katalog `public/`:
   - `public/index.html` — aplikacja (kopia `strom.html`), serwowana pod `/`;
   - `public/.htaccess` — `DirectoryIndex index.html`, wyłączone listowanie katalogów, nagłówki `Cache-Control: no-cache` dla HTML, `nosniff`, `Referrer-Policy`.
3. Skrypt przerywa build (kod 1), gdy brakuje `strom.html`, gdy strona wciąż ładuje `dist/bundle.js`, gdy znika informacja o autorze lub licencji, albo gdy w znacznikach HTML pojawi się odwołanie do lokalnego pliku, którego nie ma w `public/`.

W `public/` nie trafiają: źródła TypeScript, `node_modules`, testy, konfiguracje ani przyszły backend.

## Dlaczego było 404

Wdrożenie z pustym polem „Katalog publikacji” zbudowało projekt (log: `npm ci && npm run build`, `strom.html` ok. 6997 KB), ale `public_html/` pozostał pusty, więc LiteSpeed nie miał czego serwować pod `/` ani `/strom.html`. Wniosek: Joton buduje w osobnym katalogu wdrożenia (`deploys/`), a do `public_html/` przenosi tylko wskazany katalog publikacji; przy pustym polu nie przeniósł nic. Do tego oryginalny build nie tworzy żadnego `index.html` z gotową aplikacją — `index.html` w repozytorium to szablon, który ładuje `dist/bundle.js`.

Publiczna dokumentacja Jotona nie opisuje mechanizmu wdrażania z GitHuba, więc powyższy opis wynika z obserwacji (zawartość `deploys/`, `public_html/`, logi). Po pierwszym wdrożeniu z nowymi ustawieniami sprawdź w menedżerze plików, czy w `public_html/` są `index.html` i `.htaccess`.

## Tryb aplikacji na naszej domenie

Strom rozpoznaje tryb po nazwie hosta (`src/pwa.ts`, `appModeFor`). Każda domena inna niż stromapp.info i localhost była traktowana jak eksportowany plik z osadzonym drzewem (baner „przejdź na stromapp.info”, ostrzeżenie przy zamykaniu, eksport jako „zapisz plik”). Nowy tryb `server` obejmuje domeny z `src/ogt/hosting.ts` (`opengentree.smart-ant.pl`): bez banera i bez rejestracji service workera (nie serwujemy go jeszcze). Kolejną domenę (np. testową) dopisuje się w tym jednym pliku.

## Licencja AGPL

Nagłówek z prawami autorskimi Milana Víška, licencja AGPL-3.0-or-later i link do oryginalnego repozytorium zostają bez zmian. Skrypt publikacji dopisuje pod nimi źródło zmodyfikowanej wersji (`https://github.com/Bacman88/OpenGenTree`) i kieruje na nie link „Kod źródłowy” w oknie „O programie” (sekcja 13 AGPL). Adres można zmienić zmienną `OGT_SOURCE_URL`.

## Sprawdzenie lokalne

```sh
npm ci --ignore-scripts
npm run build:public
python3 -m http.server 8080 --directory public   # http://localhost:8080/
```

Na `localhost` aplikacja działa w trybie `dev`; tryb `server` włącza się dopiero pod `opengentree.smart-ant.pl`.
