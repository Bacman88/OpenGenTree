# OpenGenTree — zmiany w plikach Stroma

Nowy kod OpenGenTree żyje w osobnych miejscach (`src/ogt/`, `scripts/ogt/`, `docs/ogt/`, testy `src/__tests__/ogt-*.test.ts`). Pliki z upstreamu zmieniamy tylko w punktach wymienionych niżej; każda linia jest oznaczona komentarzem `OGT`. Po scaleniu nowego wydania Stroma sprawdź, czy te punkty nadal pasują.

| Plik | Zmiana | Zadanie |
| --- | --- | --- |
| `src/types.ts` | `AppMode` dostaje wartość `'server'` | OGT-009 |
| `src/pwa.ts` | import `isOgtHost`; w `appModeFor` domeny OpenGenTree zwracają `'server'` | OGT-009 |
| `package.json` | skrypt `build:public` | OGT-009 |
| `package.json` | skrypt `deploy:joton` (build + publikacja do `public_html`) | OGT-010 |
| `src/main.ts` | import `./ogt/branding.js` (nazwa OpenGenTree w oknie „O programie”) | OGT-011 |
| `src/given-names.ts` | polskie formy w grupach imion, nowe grupy śląskie, `ł` jako `l`, eksport `givenNameKey` | OGT-040 |
| `src/merge/matching.ts` | `givenNameSimilarity` (grupy imion + słownik); imiona porównywane przez klucz grupy; nazwiska (`lastNamesSimilar`, rodzice, partnerzy, `quickMatch`) i miejsce urodzenia przez słownik wariantów — linie oznaczone `OGT-040` | OGT-040 |
| `.gitignore` | `/public/` (katalog generowany) | OGT-009 |
| `.github/workflows/deploy.yml` | **usunięty**: publikował na GitLab autora i tworzył jego wydania; zastępuje go `.github/workflows/ci.yml` (sprawdzenia bez publikacji) | OGT-009 |

Przy scalaniu wydania Stroma, które zmienia `deploy.yml`, git zgłosi konflikt „zmieniony u nich / usunięty u nas”. Rozwiązanie: zostawić plik usunięty (`git rm .github/workflows/deploy.yml`); ewentualne nowe kroki sprawdzające warto przenieść do `ci.yml`.

`index.html` w repozytorium pozostaje bez zmian: link do źródeł forka i markę OpenGenTree (tytuł, favicon, znak w pasku i w oknie „O programie”, paleta — `docs/ogt/BRANDING.md`) dopisuje skrypt `scripts/ogt/prepare-public.mjs` w kopii publikowanej. Jeśli upstream zmieni któryś z podmienianych fragmentów, skrypt przerwie build z czytelnym komunikatem.

## Aktualizacja z upstreamu

```sh
git remote add upstream https://github.com/ACiDekCZ/strom.git   # raz
git fetch upstream
git checkout -b update/strom-X.Y.Z main
git merge upstream/main
npm ci --ignore-scripts && npm run typecheck && npm test && npm run build:public
```
