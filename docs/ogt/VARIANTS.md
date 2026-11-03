# OpenGenTree — słownik wariantów imion, nazwisk i miejscowości (OGT-040)

Słownik pomaga rozpoznać tę samą osobę zapisaną w różnych rejestrach: po łacinie, po niemiecku, po polsku, z różną pisownią nazwiska i miejscowości. Służy wyłącznie do wyszukiwania i porównywania. Niczego nie zmienia w drzewie: oryginalna pisownia nazwiska i miejscowości zostaje taka, jak ją zapisano.

## Trzy warstwy

| Warstwa | Co robi | Przykład | Gdzie |
| --- | --- | --- | --- |
| 1. Normalizacja tekstu | Te same litery po zdjęciu akcentów, wielkości liter, ł→l, interpunkcji | Kopeć = Kopec, Kołodziejczyk = Kolodziejczyk | Strom: `normalizeName` (`src/merge/matching.ts`); słownik nazywa to relacją `same` |
| 2. Alias historyczny lub regionalny | Grupy wariantów ze statusem | Pyrek ~ Pyrrek, König ~ Koenig, Strzebiń ~ Strzebin, Lublinitz | `src/ogt/variants/` |
| 3. Dopasowanie genealogiczne | Czy dwie osoby są jedną osobą: imiona, nazwiska, daty, miejsca, rodzice, partnerzy | Józef Pyrek ur. 4.03.1850 ~ Josephus Pirrek ur. 4.03.1850 | Strom: `src/merge/matching.ts` |

Warstwa 2 jest tylko sygnałem dla warstwy 3. Zgodność nazwiska lub miejscowości podnosi wynik, ale sama nie wystarcza do dopasowania (test: Jan König ~ Jan Koenig bez dat nie przekracza progu), a słownik niczego nie scala automatycznie.

## Dane

| Plik | Zawartość |
| --- | --- |
| `src/ogt/variants/surnames.json` | 30 grup nazwisk (`candidate`) i 3 wykluczenia (`rejected`) |
| `src/ogt/variants/places.json` | 11 miejscowości z identyfikatorami (`candidate`) |
| `src/ogt/variants/given-names.json` | Wojciech ~ Albert (`candidate`) |
| `src/given-names.ts` | Grupy rejestrowe imion (np. Józef = Josephus = Josef), traktowane jako to samo imię |

Model wpisu: `canonical` (nazwa reprezentująca grupę), `variants`, `type` (`surname` / `place` / `given`), `status` (`verified` / `candidate` / `rejected`), `region`, `source`, `notes`, a dla miejsc obowiązkowo `id`.

Źródło startowe: analizy „Rodowodu Sołectwa Strzebiń”. Wszystkie wpisy startowe mają status `candidate` (do weryfikacji); nie wszystkie są genealogicznie potwierdzonymi równoważnościami.

## Statusy i ich wpływ na dopasowanie

| Status | Nazwiska i imiona | Miejscowości |
| --- | --- | --- |
| `verified` | podobieństwo 1,0 (jak ta sama pisownia) | podobieństwo 1,0 (pełny bonus za miejsce) |
| `candidate` | podobieństwo co najmniej 0,85 | podobieństwo co najmniej 0,8 (mniejszy bonus) |
| `rejected` | podobieństwo 0 — to różne nazwiska, nawet gdy litery są podobne | — |
| dwie różne znane miejscowości | — | podobieństwo 0 (np. Kolonia Strzebińska ≠ Strzebiń) |
| brak w słowniku | jak w Stromie (podobieństwo liter) | jak w Stromie |

## Miejscowości

- Każda grupa to jedna konkretna lokalizacja z identyfikatorem (`strzebin`, `strzebin-lazy`, `kolonia-strzebinska`…), żeby nie łączyć miejsc o tych samych nazwach w innych regionach.
- Zapis miejsca z GEDCOM-u jest rozpoznawany po początkowych członach rozdzielonych przecinkami, najdłuższy znany wygrywa: „Strzebiń, Lubliniec, Śląskie, Polska” → `strzebin`; „Łazy, Strzebiń, Śląskie” → `strzebin-lazy`.
- Samo „Łazy” nie jest rozpoznawane (nazwa występuje w wielu miejscach). „Lohna” czeka na identyfikację geograficzną.
- Kolonia Strzebińska, Łazy i Bagno są osobnymi jednostkami, nie aliasami Strzebinia.

## Szczególne przypadki

- **Kociba** — możliwa utrwalona pisownia emigracyjna; słownik łączy ją z Koczybą tylko przy porównaniu, nigdy jej nie poprawia.
- **Formy żeńskie** — obsługiwane osobno od wariantów. Strom rozpoznaje polskie nazwiska przymiotnikowe (Jaworski ↔ Jaworska); form typu Maniurowa, Potempówna nie ma — do osobnego zadania.
- **Nazwiska niemieckie** (np. Eckert) zostają w oryginalnej postaci; słownik nie tworzy dla nich spolszczeń.
- **Albert** bywa zapisem Wojciecha (przez Adalbert), ale też samodzielnym imieniem — dlatego tylko `candidate`.

## Rozbudowa

- Nowe grupy dopisuje się do plików JSON. Test `src/__tests__/ogt-variants.test.ts` pilnuje, żeby żadna forma nie była w dwóch grupach, żadne wykluczenie nie siedziało w grupie, a każda miejscowość miała unikalny identyfikator.
- `createVariantIndex(entries)` buduje słownik z dowolnych wpisów — miejsce na przyszłe aliasy użytkownika obok wbudowanych.
- Zatwierdzenie wpisu = zmiana `status` z `candidate` na `verified`; odrzucenie = osobny wpis `rejected`.
- Kolejny krok: wyciągnięcie rzeczywistych wariantów z GEDCOM-u „Rodowodu Sołectwa Strzebiń”.
