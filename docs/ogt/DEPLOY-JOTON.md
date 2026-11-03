# OpenGenTree — wdrożenie na Joton.io (OGT-009, OGT-010)

## Wartości do formularza wdrożenia i domeny

| Pole | Wartość |
| --- | --- |
| Repozytorium | `Bacman88/OpenGenTree` |
| Gałąź | `main` |
| Skrypt budowy | `npm ci --ignore-scripts && npm run deploy:joton` |
| Katalog publikacji | **puste** |
| Automatyczne wdrażanie po push | włączone tylko dla `main` |
| Document root domeny (zakładka Domeny) | `/public_html` |

Katalog publikacji zostaje pusty, bo przy wypełnionym polu panel ustawia document root na `deploys/current/<katalog>`, a ten mechanizm na Jotonie nie działa (niżej). Po zmianie ustawień i pierwszym wdrożeniu sprawdź w zakładce Domeny, że document root nadal wskazuje `/public_html`.

## Co robi build

1. `npm ci --ignore-scripts` instaluje zależności z `package-lock.json` bez uruchamiania skryptów instalacyjnych paczek. Esbuild działa mimo to, bo jego binarka przychodzi jako paczka platformowa (`@esbuild/linux-x64`), a skrypt `postinstall` esbuilda tylko ją weryfikuje.
2. `npm run deploy:joton` = `npm run build:public` + `scripts/ogt/publish-webroot.mjs`.
3. `npm run build:public` = `scripts/bundle.js` (oryginalny build Stroma, tworzy `strom.html` z wbudowanym JS, CSS, czcionkami i ikonami) oraz `scripts/ogt/prepare-public.mjs`, który tworzy od zera katalog `public/`:
   - `public/index.html` — aplikacja (kopia `strom.html`), serwowana pod `/`;
   - `public/.htaccess` — `DirectoryIndex index.html`, wyłączone listowanie katalogów, nagłówki `Cache-Control: no-cache` dla HTML, `nosniff`, `Referrer-Policy`.

   Skrypt przerywa build (kod 1), gdy brakuje `strom.html`, gdy strona wciąż ładuje `dist/bundle.js`, gdy znika informacja o autorze lub licencji, albo gdy w znacznikach HTML pojawi się odwołanie do lokalnego pliku, którego nie ma w `public/`.
4. `scripts/ogt/publish-webroot.mjs` publikuje `public/index.html` i `public/.htaccess` do `public_html` witryny (opis niżej).

Do `public/` ani do `public_html/` nie trafiają: źródła TypeScript, `node_modules`, testy, konfiguracje ani przyszły backend.

## Publikacja do public_html (OGT-010)

**Problem.** Na Jotonie (panel Enhance) udane wdrożenie z GitHuba nie tworzy dowiązania `deploys/current`, na którym opiera się document root `/deploys/current/public`; każdy adres zwracał 403. Ten sam katalog wskazany wprost (`/deploys/<commit>/public`) działał, ale jego nazwa zmienia się z każdym commitem.

**Rozwiązanie.** Build sam umieszcza aplikację tam, gdzie serwer i tak patrzy: w `public_html`. `deploys/current` nie jest używane.

- **Ścieżka.** Joton uruchamia skrypt budowy w katalogu wdrożenia `/var/www/<witryna>/deploys/<commit>/` (widać to w logu: `Initialized empty Git repository in …/deploys/<commit>/.git/`). Katalog `public_html` leży w `/var/www/<witryna>/public_html`, czyli `../../public_html` względem katalogu wdrożenia. Skrypt odmawia działania (kod 1), jeśli nie jest uruchomiony z `<witryna>/deploys/<commit>/`, więc lokalny build nigdzie nic nie zapisze. Zmienna `OGT_WEBROOT` pozwala wskazać inny katalog (testy, inny układ).
- **Co kopiuje.** Tylko `index.html` i `.htaccess`. Niczego w `public_html` nie usuwa: inne pliki, w tym `.well-known/` używane przez Let's Encrypt, zostają.
- **Atomowa podmiana.** Każdy plik jest najpierw zapisywany w `public_html` pod tymczasową nazwą (`.ogt-publish-…`), dostaje uprawnienia, a potem `rename` podmienia go na żywy plik. `rename` w obrębie jednego katalogu jest atomowe: odwiedzający dostaje starą albo nową wersję, nigdy połowę pliku. `index.html` jest podmieniany jako ostatni.
- **Uprawnienia.** Pliki dostają jawnie `644`, niezależnie od `umask` środowiska budowania. Skrypt nie zmienia uprawnień ani właściciela samego `public_html`.
- **Błędy.** Brak `public_html`, brak prawa zapisu, brak wyniku buildu albo błąd kopiowania kończą build kodem 1 z opisem w logu, a pliki tymczasowe są sprzątane. Joton nie aktywuje wtedy wdrożenia, a w `public_html` zostaje poprzednia wersja.
- **Kontrola.** Po podmianie skrypt porównuje opublikowane pliki z `public/` i sprawdza uprawnienia `644`; ostatnia linia udanego logu to `✓ published to …/public_html: index.html (… kB), .htaccess`.

**Czy Joton pozwala zapisywać do `public_html`?** Nie da się tego potwierdzić bez wdrożenia. Pośrednio na to wskazuje, że build zapisuje już w katalogu domowym witryny (`deploys/`), a `public_html` leży w tym samym katalogu domowym. Skrypt sprawdza prawo zapisu, zanim cokolwiek skopiuje. Jeśli hosting go nie daje, build kończy się komunikatem `the build may not write to … (permission denied)` i niczego nie obchodzi; wtedy to ograniczenie trzeba zgłosić do Jotona.

**Testy.** `src/__tests__/ogt-publish-webroot.test.ts` uruchamia prawdziwy skrypt na tymczasowym drzewie `<witryna>/deploys/<commit>/` + `public_html`: kopiowanie z `644`, podmiana starej wersji bez plików tymczasowych, zachowanie `.well-known/` i innych plików, brak kopiowania źródeł i `node_modules`, brak `deploys/current`, odmowa poza `deploys/`, brak `public_html`, brak wyniku buildu, `OGT_WEBROOT`, oraz odmowa przy braku prawa zapisu bez zmiany uprawnień (ten przypadek działa tylko jako zwykły użytkownik, np. w CI).

## Dlaczego najpierw było 404, a potem 403

- **404:** wdrożenie bez katalogu publikacji zbudowało projekt, ale document root wskazywał pusty `public_html/`. Do tego oryginalny build nie tworzy `index.html` z gotową aplikacją — `index.html` w repozytorium to szablon, który ładuje `dist/bundle.js`.
- **403:** z katalogiem publikacji `public` panel ustawił document root na `/deploys/current/public`, ale `deploys/current` nie powstało. Zmiana nazwy `.htaccess` niczego nie zmieniała, a document root ustawiony wprost na katalog wdrożenia działał.

## Tryb aplikacji na naszej domenie

Strom rozpoznaje tryb po nazwie hosta (`src/pwa.ts`, `appModeFor`). Każda domena inna niż stromapp.info i localhost była traktowana jak eksportowany plik z osadzonym drzewem (baner „przejdź na stromapp.info”, ostrzeżenie przy zamykaniu, eksport jako „zapisz plik”). Nowy tryb `server` obejmuje domeny z `src/ogt/hosting.ts` (`opengentree.smart-ant.pl`): bez banera i bez rejestracji service workera (nie serwujemy go jeszcze). Kolejną domenę (np. testową) dopisuje się w tym jednym pliku.

## Licencja AGPL

Nagłówek z prawami autorskimi Milana Víška, licencja AGPL-3.0-or-later i link do oryginalnego repozytorium zostają bez zmian. Skrypt publikacji dopisuje pod nimi źródło zmodyfikowanej wersji (`https://github.com/Bacman88/OpenGenTree`) i kieruje na nie link „Kod źródłowy” w oknie „O programie” (sekcja 13 AGPL). Adres można zmienić zmienną `OGT_SOURCE_URL`.

## Sprawdzenie lokalne

```sh
npm ci --ignore-scripts
npm run build:public
python3 -m http.server 8080 --directory public   # http://localhost:8080/

# cała ścieżka wdrożenia, do katalogu testowego zamiast public_html:
OGT_WEBROOT=/tmp/webroot-test npm run deploy:joton
```

Na `localhost` aplikacja działa w trybie `dev`; tryb `server` włącza się dopiero pod `opengentree.smart-ant.pl`.

## Sprzątanie starych wdrożeń

Każde wdrożenie zostawia w `deploys/` własny katalog z kodem i `node_modules`. Joton nie usuwa ich automatycznie (w dokumentacji Enhance nie ma o tym mowy), więc warto co jakiś czas usuwać stare katalogi wdrożeń w menedżerze plików. Aplikacja działa z `public_html`, więc nie zależy od żadnego z nich.
