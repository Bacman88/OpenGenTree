# OpenGenTree — daty i miejscowości w formularzach (OGT-060)

## Daty

Pola dat Stroma są tekstowe celowo: genealogia potrzebuje dat częściowych i przybliżonych („1880”, „5.1880”, „ok. 1880”, „przed 1900”, „1880..1885”), których przeglądarkowe `<input type="date">` nie przyjmie. Dlatego pole tekstowe zostaje, a OpenGenTree dodaje (`src/ogt/date-input.ts`):

- **przycisk kalendarza** w polu — otwiera natywny kalendarz przeglądarki (`showPicker()` na ukrytym `input[type=date]`); wybrana data jest wpisywana w formacie aplikacji (po polsku `15.5.1880`), a pole dostaje zdarzenia `input` i `change`, więc działają walidacja i automatyka Stroma. Kalendarz otwiera się na dacie z pola, jeśli jest to pełna, dokładna data. Zakres: od roku 100 do dziś;
- **podgląd** pod polem: jak data została zrozumiana („15 maja 1880”, „ok. 3 kwietnia 1850”, „maj 1880”). Pusty, gdy nie mówi nic nowego („1880”) albo data jest błędna — wtedy, jak w Stromie, pole ma czerwoną ramkę;
- w drzewie tylko do odczytu (np. wzorcowym) przycisk jest ukryty.

Działa w formularzu osoby, wydarzeń i w panelu związków (pola tworzone później wyłapuje `MutationObserver`).

## Miejscowości

Pola miejsca (`input[list="places-datalist"]`: urodzenie, zamieszkanie, zgon, wydarzenia, początek i koniec związku) dostają własną listę podpowiedzi (`src/ogt/place-suggest.ts`) zamiast `datalist` przeglądarki:

| Kolejność | Źródło |
| --- | --- |
| 1 | miejscowości z otwartego drzewa, najczęściej używane na górze |
| 2 | słownik wariantów (`src/ogt/variants/places.json`, bez wpisów odrzuconych) |
| 3 | drzewo wzorcowe, jeśli jest dodane i nie jest akurat otwarte |

- Dopasowanie: początek nazwy albo początek któregoś słowa, bez polskich znaków i wielkości liter (`foldVariant`): „la” → Łazy, „koszec” → Koszęcin.
- Dawne zapisy ze słownika prowadzą do miejscowości: „Koschen” → Koszęcin (z dopiskiem „zapis: Koschentin”).
- Ta sama nazwa z kilku źródeł pokazuje się raz, w pisowni z Twojego drzewa. Najwyżej 8 podpowiedzi.
- Klawiatura: ↓/↑ wybór, Enter wstawia (tylko gdy coś jest zaznaczone — inaczej Enter działa jak w Stromie, przechodzi do następnego pola), Escape zamyka listę (drugi Escape zamyka okno).
- Tylko podpowiedź: każdy wpisany tekst zostaje bez zmian.

## Testy

- `src/__tests__/ogt-dates-places.test.ts` — kalendarz ↔ tekst, podgląd, kolejność i dopasowanie podpowiedzi.
- `src/__tests__/ogt-search-speed.test.ts` — wyszukiwanie osoby przy 7 000 osób.
- W Chrome (publiczny build z drzewem wzorcowym): kalendarz, podgląd, czerwona ramka, podpowiedzi „Str”, „la”, „Koschen”, „boro”, wybór klawiaturą bez zamykania okna, dowolny tekst; wyszukiwarka „MariAfdfd” na Rodowodzie: ok. 0,1 s na klawisz (wcześniej ok. 5 s).
