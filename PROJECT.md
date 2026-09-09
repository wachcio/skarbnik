# Skarbnik Przedszkolny — dziennik projektu

Ten plik jest żywym zapisem założeń i postępu prac. Aktualizowany na bieżąco,
żeby w każdej chwili — także po przerwie albo na innej maszynie — można było
wznowić pracę dokładnie tam, gdzie się skończyło.

Pełna, opisowa specyfikacja (z uzasadnieniami) istnieje też jako dokument
wizualny przygotowany w trakcie planowania — ale to *ten* plik jest źródłem
prawdy w repozytorium, bo dokument wizualny nie jest wersjonowany razem z kodem.

## Cel projektu

Aplikacja webowa dla skarbnika grupy przedszkolnej — zastępuje ręczne
prowadzenie arkusza kalkulacyjnego jednym źródłem prawdy: dzieci, kategorie
składek, wpłaty przypisane do semestrów, oraz gotowe raporty zaległości.

## Ustalone założenia

### Stack techniczny
- **Frontend:** React + TypeScript, interfejs **mobile-first** (telefon to
  główne urządzenie skarbnika), motyw jasny/ciemny z zapamiętaniem wyboru.
- **Backend:** Node.js + Express + Prisma (świadomie zamiast NestJS — skala
  projektu nie uzasadnia narzutu architektonicznego Nesta).
- **Baza danych:** MySQL.
- **Uruchomienie:** Docker + docker-compose. Docelowy hosting: VPS,
  dostępny z zewnątrz — w domu ruch idzie przez NGINX Proxy Manager z lokalnym
  urzędem certyfikującym, docelowo NPM + certyfikat publiczny na VPS.
- **Repozytorium:** GitHub — `wachcio/skarbnik` (licencja Apache 2.0, już
  istniała w repo przed startem prac).

### Role i dostęp
- **Administrator/skarbnik** — pełny CRUD (dzieci, kategorie, kwoty, wpłaty),
  zarządzanie kontami rodziców, ręczny reset hasła, przełącznik widoku
  publicznego, import/eksport pełnego backupu JSON.
- **Rodzic** — podgląd wpłat/salda wyłącznie swojego dziecka; jedno dziecko
  może mieć wiele kont rodziców (np. mama i tata osobno).
- **Gość (bez logowania)** — tylko zagregowane dane grupy (zebrano/planowano),
  bez żadnych danych osobowych dzieci; włączane/wyłączane przez admina.

### Zakres danych
- Jedna grupa przedszkolna (bez wielu oddziałów).
- Tylko bieżący rok szkolny — bez archiwizacji wielu lat. Przejście na kolejny
  rok = ręczny reset poprzedzony pełnym eksportem JSON.
- 2 semestry na rok szkolny.

### Model danych (zarys encji)
- **Dziecko** — imię, nazwisko, kontakt do rodzica (e-mail/telefon), notatki;
  relacja 1:N do kont rodziców.
- **Semestr** — numer 1/2, bieżący rok szkolny.
- **Kategoria składki** — nazwa, kwota domyślna dla grupy, opcjonalne
  nadpisanie kwoty per dziecko; w pełni zarządzana przez skarbnika (CRUD) z
  poziomu aplikacji (bez sztywnej listy w kodzie); usunięcie = **soft delete**
  (archiwizacja, historia zostaje widoczna w raportach).
- **Wpłata** — dziecko + kategoria + semestr, kwota, data, opcjonalny opis;
  dopuszczalne **wiele wpłat częściowych** na tę samą kategorię/semestr.
- **Log audytowy** — kto i kiedy dodał/zmienił/usunął wpłatę.

### Funkcje
- Ewidencja dzieci (dodawanie/edycja/usuwanie).
- Kategorie i kwoty docelowe (domyślne + wyjątki per dziecko).
- Wpłaty (dodawanie/edycja/usuwanie, wiele wpłat częściowych).
- Raporty: zaległości wg kategorii/semestru, karta wpłat dziecka, zestawienie
  zbiorcze grupy, eksport do PDF/Excel.
- Import/eksport: pełny backup i przywracanie całej bazy z jednego pliku JSON.
- Ustawienia: motyw jasny/ciemny, przełącznik widoku publicznego.

### Bezpieczeństwo i wdrożenie (priorytet wysoki — appka wychodzi na zewnątrz)
- **TLS:** backend wspiera *oba* tryby — pracę za NGINX Proxy Managerem
  (appka nasłuchuje po HTTP wewnątrz sieci Docker) **i** samodzielną
  terminację HTTPS bezpośrednio. Tryb i ścieżki do certyfikatów — w `.env`,
  żeby przejście dom → VPS było zmianą konfiguracji, nie kodu.
- **Sesje:** ciasteczko `httpOnly + secure + SameSite`, magazyn sesji w MySQL
  (bez Redisa). Flaga `secure` ustawiana też poprawnie, gdy TLS terminuje NPM
  (odczyt `X-Forwarded-Proto` przy `trust proxy`). Świadomie zamiast JWT w
  localStorage — odporność na kradzież tokenu przez XSS.
- **Ochrona logowania:** tymczasowa, samo-wygasająca blokada konta zamiast
  trwałej (żeby nie dało się na stałe zablokować jedynego admina bez maila do
  resetu) — **5 nieudanych prób → 15 min blokady**, przy kolejnych
  naruszeniach czas rośnie (15 min → 1h → 24h); równolegle limit prób per IP,
  niezależny od konta; każda blokada trafia do logu audytowego. Parametry
  potwierdzone jako OK na start.
- **Hasła:** hashowanie (bcrypt/argon2), wymuszona minimalna złożoność.
- **Nagłówki HTTP:** Helmet — CSP, HSTS, X-Frame-Options i inne.
- **Kopie zapasowe:** automatyczny, cykliczny backup MySQL, plik szyfrowany
  przed zapisem.
- **Sekrety:** `.env` poza repo (`.gitignore`), osobne pliki `.env` dla
  testów lokalnych i VPS.
- **Reset hasła:** ręczny, wykonywany przez administratora — bez wysyłki
  e-maili na start.

### Zmienne środowiskowe (.env) — zarys
| Zmienna | Znaczenie |
|---|---|
| `DATABASE_URL` | connection string do MySQL |
| `SESSION_SECRET` | klucz podpisujący ciasteczka sesji |
| `ENABLE_HTTPS` | czy backend ma sam terminować TLS |
| `SSL_CERT_PATH` / `SSL_KEY_PATH` | ścieżki do certyfikatu i klucza |
| `TRUST_PROXY` | czy ufać nagłówkom z NGINX Proxy Manager |
| `PUBLIC_BASE_URL` | docelowy adres aplikacji (linki, cookies) |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_LOCKOUT_MINUTES` | parametry blokady logowania |
| `BACKUP_CRON` / `BACKUP_ENCRYPTION_KEY` | harmonogram i szyfrowanie backupu |

## Zasady pracy nad repozytorium
- Commitujemy **na bieżąco, wraz z pisaniem kodu** — nie zbieramy dużych,
  rzadkich commitów.
- Ten plik (`PROJECT.md`) aktualizujemy przy każdej istotnej zmianie założeń
  oraz na końcu każdej sesji roboczej — sekcja „Postęp prac” poniżej.

## Postęp prac

### 2026-09-08 — Faza planowania (bez kodu)
- Ustalono pełny zakres funkcjonalny, stack technologiczny, model ról,
  model danych i wymagania bezpieczeństwa (patrz wyżej).
- Zainicjowano lokalne repozytorium Git, podłączono remote
  `github.com/wachcio/skarbnik` (repo miało już `LICENSE` — Apache 2.0,
  historia pociągnięta lokalnie, nienadpisana).
- Dodano `.gitignore` (node_modules, `.env`, certyfikaty/klucze, backupy
  bazy, itp.).
- Dodano ten plik (`PROJECT.md`) jako dziennik projektu.
- Kod aplikacji jeszcze nie istnieje.

### 2026-09-08 — Szkielet aplikacji (backend, frontend, Docker)
- **Prisma:** pełny schemat (`backend/prisma/schema.prisma`) — User,
  Child, ParentChildLink (M:N), Semester, Category + CategoryTarget +
  ChildCategoryAmount (kwoty domyślne i nadpisania per dziecko), Payment,
  AuditLog (migawki JSON, przetrwają hard delete), Setting (singleton).
- **Kontrakt API:** spisany w `docs/API.md`, z oznaczeniem co już działa,
  a co jest na razie stubem (501).
- **Backend zaimplementowany:** logowanie/wylogowanie/sesja (`/api/auth`),
  tymczasowa blokada logowania z eskalacją (15 min → 1h → 24h) + log
  audytowy blokad, pełny CRUD dzieci z uprawnieniami admin/rodzic,
  lista semestrów, widok publiczny (`/api/public/summary`) liczący
  realną sumę kwot docelowych vs wpłat. Reszta modułów (kategorie,
  wpłaty, ustawienia, raporty, backup, konta rodziców) — trasy i
  uprawnienia gotowe, logika zwraca `501` do zaimplementowania.
- **Frontend zaimplementowany:** ekran logowania (wpięty w prawdziwe
  `/api/auth`), przełącznik motywu jasny/ciemny/systemowy, layout
  mobile-first.
- **Docker:** `docker-compose.yml` (mysql + backend + frontend),
  Dockerfile dla obu usług, `.env.example` w roli + w katalogach
  `backend/`/`frontend/`.
- **Weryfikacja lokalna** (Node/Docker doinstalowane tymczasowo do
  `/tmp`, nic nie zmieniono w systemie): `prisma generate`, `tsc --noEmit`,
  build obu projektów — czyste. Ręczne testy endpointów ujawniły realny
  błąd: handlery `async` w Express 4 bez opakowania nie łapią odrzuconych
  obietnic — awaria bazy ubijała cały proces. Naprawione (`asyncHandler`,
  patrz `backend/src/lib/asyncHandler.ts`) i ponownie przetestowane.
  Dodatkowo naprawiony wyciek plików wygenerowanych przez `tsc -b`
  (`vite.config.js`/`.d.ts`, `*.tsbuildinfo`) do repo.
- **Nie przetestowane end-to-end:** to środowisko nie miało uprawnień do
  Dockera ani zainstalowanego MySQL, więc `docker compose up` + migracje +
  seed + logowanie z prawdziwą bazą wymagają jeszcze przetestowania —
  patrz checklist niżej.

### 2026-09-09 — Pierwszy udany deployment end-to-end (dom, za NPM)
- Dzięki tymczasowemu dostępowi do Dockera przetestowałem naprawdę cały
  cykl (obraz Alpine, prawdziwy MySQL 8.4, migracje, seed, logowanie,
  sesja, CRUD, log audytowy, blokada konta) i znalazłem 4 blokujące
  wdrożenie błędy — szczegóły wyżej. Wszystkie naprawione i zweryfikowane.
- Po stronie infrastruktury doprecyzowane i rozwiązane po drodze:
  - `PUBLIC_API_URL`/`VITE_API_URL` (build arg zaszywany w JS) okazał się
    zbyt łatwy do popsucia przy zmianie domeny — zastąpiony wołaniem
    względnym `/api/...` (ten sam origin), wymaga jednorazowego Custom
    Location `/api` -> `backend:4000` w NGINX Proxy Managerze.
  - `/opt/skarbnik` na serwerze nie było prawdziwym repo git (pliki
    skopiowane ręcznie) — naprawione przez `git init` + `fetch` +
    `reset --hard origin/master` w miejscu, bez utraty `.env`.
- **Wynik:** `https://skarbnik.wachcio.dom` działa od A do Z — logowanie,
  sesja, `/api/health` zwraca `database: connected`. Pierwszy realny,
  działający deployment.
- Commity od teraz pisane po angielsku (wcześniejsza historia przepisana
  z polskiego na angielski, treść plików bez zmian).

### 2026-09-09 — Motyw ciemny na niebiesko/granat, prawdziwy frontend
- Ciemny motyw przekolorowany z zielonego na granat + niebieski akcent;
  jasny motyw też przeszedł z zieleni morskiej na niebieski, żeby oba
  motywy były spójne. Po drodze naprawiony bug: zmiana kolorów objęła
  tylko wariant `@media (prefers-color-scheme)`, nie ręcznie wybierany
  `[data-theme="dark"]` — inne wcięcie w CSS sprawiło, że find-and-replace
  trafił tylko w jedno miejsce. Oba warianty są teraz identyczne.
- Frontend przestał być pojedynczym ekranem-placeholderem:
  - `react-router-dom` + `AuthContext`/`useAuth` zamiast stanu logowania
    trzymanego ręcznie w `App.tsx`.
  - `AppShell`: sticky nagłówek + dolny pasek nawigacji (Dzieci /
    Ustawienia / Wyloguj) — wzorzec mobile-first.
  - Dzieci: lista (rodzic widzi tylko swoje, admin wszystkie + może
    dodawać), ekran szczegółów z edycją, usuwanie z potwierdzeniem
    (bottom-sheet). W pełni podpięte pod istniejące API.
  - Ustawienia: na razie dane konta + zapowiedź reszty.
  - Strona publiczna `/public` (bez logowania): zebrano/planowano +
    rozbicie na kategorie z paskami postępu, korzysta z
    `/api/public/summary`.
  - `theme.css` rozbudowany o system komponentów (karty, listy,
    formularze, przyciski, modal, paski postępu) na tych samych tokenach
    kolorów.
- Zweryfikowane: `tsc --noEmit`, `vite build`, oraz prawdziwy build
  obrazu Dockera z testem SPA-fallbacku przez curl (`/children`,
  `/children/:id` poprawnie serwują `index.html`, nie 404). Nie
  przetestowane: rzeczywiste renderowanie w przeglądarce — brak
  przeglądarki headless w tym środowisku.

### 2026-09-09 (2) — Kategorie, wpłaty, ustawienia i raporty (backend + UI)
- Backend: pełny CRUD kategorii (soft delete), kwoty domyślne per
  semestr, nadpisania kwot per dziecko, pełny CRUD wpłat (rola-aware),
  ustawienia (GET/PATCH), raporty zaległości/zbiorczy/karta dziecka.
  PDF/Excel eksport nadal jako 501 — zaplanowany na później.
- Bug znaleziony i naprawiony przez prawdziwy test (Docker + MySQL):
  archiwizacja kategorii usuwała jej historię wpłat z ledgeru/raportów/
  widoku publicznego (filtr `archived: false` na poziomie zapytania).
  Naprawione — historia zostaje, filtrowane są tylko zarchiwizowane
  kategorie bez żadnej historii.
- Frontend: strona zarządzania kategoriami (`/categories`, admin),
  sekcja wpłat na ekranie dziecka (rozliczenie per kategoria + dodawanie/
  usuwanie wpłat), przełącznik widoku publicznego w ustawieniach.
- Zweryfikowane dwa razy: raz punktowo (każdy endpoint z curl), raz
  całościowo — pełny `docker-compose` (mysql+backend+frontend) pod
  osobną nazwą projektu, z migracjami i seedem, dokładnie jak na
  serwerze produkcyjnym.

### 2026-09-09 (3) — Konta rodziców i pełny backup JSON
- Backend: CRUD kont rodziców (tworzenie z przypisaniem do dzieci,
  edycja, ręczny reset hasła, usuwanie) — hasło nigdy nie opuszcza API
  w odpowiedzi ani nie trafia do logu audytowego.
- Backend: pełny eksport/import JSON. Świadoma decyzja bezpieczeństwa —
  eksport NIE zawiera hashy haseł (nawet zahashowane hasło nie powinno
  podróżować w pliku, który łatwo komuś przypadkiem przekazać); import
  generuje nowe, tymczasowe hasła dla każdego konta i pokazuje je
  administratorowi do ręcznego przekazania. Import niszczy bieżącą
  sesję po zakończeniu (dane admina mogły się zmienić w trakcie
  przywracania).
- Frontend: `/users` (zarządzanie kontami rodziców z listą przypisanych
  dzieci), sekcja "Kopia zapasowa" w ustawieniach (eksport = link do
  pobrania, import = wybór pliku + potwierdzenie + wynik z tymczasowymi
  hasłami).
- Zweryfikowane end-to-end (Docker + prawdziwy MySQL, dwa razy —
  punktowo przez curl i całościowo przez pełny `docker-compose`):
  tworzenie konta rodzica, logowanie nim i potwierdzenie izolacji
  (403 na `/api/users`, tylko własne dziecko), reset hasła unieważnia
  stare hasło, usuwanie konta, oraz pełny cykl eksport → import
  odtwarzający dokładnie te same dane z zachowanymi `id`.

### 2026-09-09 (4) — Ekran raportów, koniec głównej funkcjonalności
- Frontend: `/reports` (admin) — zestawienie zbiorcze (jak widok
  publiczny, ale z liczbą dzieci) i zaległości pogrupowane per dziecko,
  z linkiem do karty dziecka. Link z ustawień.
- Karta wpłat pojedynczego dziecka nie dostała osobnego ekranu — to
  po prostu sekcja "Składki" na istniejącym ekranie dziecka
  (`ChildPayments`), więc nie duplikujemy UI; endpoint
  `/api/reports/child/:id` zostaje w API na przyszłość (np. pod eksport
  PDF), ale bieżący frontend go nie woła osobno.
- Build złapał realny błąd przed commitem: frontendowy typ
  `CategorySummary` nie miał pola `archived`, które backend zaczął
  zwracać wcześniej — naprawione.
- Zweryfikowane na pełnym `docker-compose`. Przy okazji: migracja/seed
  raz nie powiodła się przy pierwszym uruchomieniu w skrypcie testowym
  (baza jeszcze nie była w pełni gotowa mimo statusu "healthy") —
  zadziałało przy ponownej próbie; nie jest to związane ze zmianami
  w kodzie, ale warto pamiętać, że `migrate deploy`/`seed` czasem trzeba
  odpalić dwa razy tuż po `docker compose up`, jeśli pierwszy raz
  zgłosi błąd "table does not exist".

**Stan funkcjonalny:** cały zakres z pierwotnej specyfikacji działa
(dzieci, logowanie, kategorie/kwoty, wpłaty, semestry, raporty, widok
publiczny, konta rodziców, import/eksport JSON, motyw jasny/ciemny,
mobile-first). Jedyny brakujący element to eksport raportów do PDF/Excel.

### 2026-09-09 (5) — Edycja kategorii/kont rodziców + eksport PDF/Excel
- Użytkownik złapał realny brak: ekrany kategorii i kont rodziców miały
  tworzenie i usuwanie/archiwizację, ale żadnej edycji — mimo że backend
  już to wspierał (`PATCH /api/categories/:id`, `PATCH /api/users/:id`).
  Dodane: zmiana nazwy kategorii inline, edycja danych i przypisanych
  dzieci konta rodzica (z formularzem identycznym jak przy tworzeniu).
  Zweryfikowane przez Docker+MySQL, łącznie z edge case'em czyszczenia
  wszystkich przypisań dziecka do zera.
- Zaimplementowany eksport raportów do PDF/Excel — ostatni brakujący
  element z pierwotnej specyfikacji. PDF przez `pdfkit` z osadzonym
  fontem PT Sans (licencja OFL, `backend/assets/fonts/`) — standardowe
  fonty PDF (Helvetica) nie obsługują polskich znaków diakrytycznych,
  co realnie sprawdziłem (wyeksportowałem kategorię i dziecko z pełnym
  zestawem polskich znaków, wyciągnąłem tekst z PDF-a przez `pdftotext`
  i potwierdziłem poprawne renderowanie). Excel przez `exceljs`.
  Przyciski eksportu (PDF/Excel) przy obu raportach na `/reports`.

**Stan funkcjonalny:** cały zakres z pierwotnej specyfikacji zrealizowany,
łącznie z eksportem PDF/Excel. Backend nie ma już żadnego stuba 501 —
`docs/API.md` w całości oznaczone jako gotowe.

## Następne kroki (checklist)
- [x] Szczegółowy schemat bazy danych w Prisma (encje, relacje, indeksy).
- [x] Kontrakt API — lista endpointów REST i uprawnień per rola.
- [x] Struktura repozytorium (monorepo: `frontend/`, `backend/`) i
      `docker-compose.yml`.
- [x] Pełny test end-to-end z prawdziwym MySQL i działającym deploymentem
      za NGINX Proxy Managerem (dom).
- [x] Frontend: routing, uwierzytelnianie, ekran dzieci (lista +
      szczegóły + edycja + usuwanie), strona publiczna, dolna nawigacja
      mobile-first.
- [x] Backend: kategorie/kwoty (w tym nadpisania per dziecko), wpłaty,
      ustawienia (przełącznik widoku publicznego), raporty (zaległości/
      karta dziecka/zbiorczy).
- [x] Frontend: zarządzanie kategoriami (w tym edycja nazwy), wpłaty na
      ekranie dziecka, przełącznik widoku publicznego, ekran raportów.
- [x] Backend + frontend: zarządzanie kontami rodziców (w tym edycja),
      pełny eksport/import JSON.
- [x] Eksport raportów do PDF/Excel.
- [ ] **Do zrobienia przez użytkownika:** zweryfikować cały UI w
      przeglądarce — to pierwszy moment, gdy warto usiąść i przeklikać
      całość jako prawdziwy skarbnik (dodanie dziecka → kategorii →
      wpłaty → sprawdzenie raportu → eksport PDF/Excel), a nie punktowo
      po jednej funkcji na raz.
- [ ] Nice-to-have na przyszłość (świadomie poza zakresem od początku):
      powiadomienia e-mail/SMS o zaległościach, samodzielna rejestracja
      rodziców kodem zaproszenia zamiast ręcznego tworzenia kont.

### 2026-09-09 (8) — Wygląd raportów, znaczniki czasu, zakładka Raporty
- Eksporty PDF/Excel dopasowane do redesignu: pasek marki, kolorowe
  nagłówki tabel, pasiaste wiersze, karta podsumowania (zebrano/plan/%,
  zielona gdy w 100%), kolumna "Brakuje" w zaległościach pogrubiona na
  czerwono — te same sygnały co odznaki w appce.
- Nazwy plików mają teraz datę i godzinę wygenerowania (czas polski),
  np. `zestawienie-semestr-1-2026-09-09-1140.pdf`. Nowy wspólny
  `backend/src/lib/time.ts` — przy okazji naprawiony ten sam błąd co
  wcześniej w `/api/health`: linijka "wygenerowano" w PDF liczyła czas
  kontenera (UTC), nie polski.
- Raporty dostały własną zakładkę w dolnej nawigacji (tylko admin),
  tak jak Dzieci i Wpłaty — usunięty link-skrót z Ustawień i
  nieaktualna notka "Raporty — w kolejnym etapie prac" (raporty były
  gotowe od dawna, notka po prostu nigdy nie została sprzątnięta).
- Złapane przez realne obejrzenie PDF-a (konwersja do PNG przez
  `pdftoppm`, nie tylko `pdftotext`): karta podsumowania miała
  nachodzący na siebie tekst i wychodziła poza stronę — `pdfTable()`
  zostawiał kursor `doc.x` w złym miejscu (prawa kolumna tabeli), a
  kod karty rysował się względem niego zamiast lewego marginesu.
  Naprawione + zweryfikowane ponownie tym samym sposobem.

### 2026-09-09 (7) — Redesign wizualny (inspiracja: dashboardy finansowe)
- Użytkownik podesłał zrzuty z materiału inwestycyjnego (mocna typografia,
  duże pewne liczby, zielony/czerwony jako informacja a nie ozdoba,
  wykresy donut, nawigacja zakładkowa) i poprosił o inspirację tym stylem.
  Przeniesione z dostosowaniem do kontekstu (zaufane narzędzie dla
  rodziców, nie hype'owy dashboard krypto): ta sama pewność w prezentacji
  liczb, spokojniejsza całość.
- Manrope (nagłówki, duże liczby) + Inter (treść/formularze) z Google
  Fonts. Głębsza granatowa czerń w ciemnym motywie, dodane tokeny
  semantyczne (`--success`, `--warning` obok `--danger`).
- Nowy komponent `DonutChart` (czyste SVG, bez biblioteki wykresów) —
  zebrano/planowane na stronie publicznej i w raporcie zbiorczym.
- Nowy `.status-pill` (zielony/czerwony/neutralny) dla statusu kategorii
  i wpłat w kilku miejscach na raz.
- Aktywna zakładka w dolnej nawigacji dostała wypełnione tło zamiast
  samej zmiany koloru.
- Złapane przez realne obejrzenie, nie tylko czytanie diffu: kategoria
  bez ustawionej kwoty docelowej pokazywała się jako czerwona "brakuje
  0,00 zł" — mylące, bo nic nie jest tam winne. Dodany trzeci,
  neutralny wariant odznaki.
- **Zweryfikowane wizualnie, nie tylko kompilacją**: zainstalowany
  Playwright + Chromium w katalogu tymczasowym (nie jako zależność
  projektu), odpalony pełny `docker-compose`, zalogowanie, przejście
  przez dzieci → kategorie → wpłaty dziecka → zakładkę Wpłaty →
  Raporty → Ustawienia → stronę publiczną, zrzuty ekranu w obu
  motywach. To ta weryfikacja złapała błąd z neutralną odznaką opisany
  wyżej.

### 2026-09-09 (6) — Zakładka "Wpłaty" (odnajdywalność)
- Realny feedback: funkcja dodawania wpłat istniała i działała (na
  karcie dziecka), ale nikt by tam nie trafił bez podpowiedzi — brak
  osobnej pozycji w menu. Dodana zakładka "Wpłaty" w dolnej nawigacji
  (między Dzieci a Ustawienia): globalna lista wpłat w danym semestrze
  (admin: wszystkie, z linkiem do dziecka; rodzic: tylko swojego
  dziecka — ten sam filtr co reszta API) + formularz dodawania, który
  zaczyna się od wyboru dziecka (inaczej niż na karcie dziecka, gdzie
  dziecko jest już ustalone). Karta dziecka (`ChildPayments`) zostaje
  bez zmian — to dodatek, nie zamiennik.
- Przy okazji zweryfikowane realnie: `GET /api/payments` serializuje
  kwoty (Decimal) jako stringi w JSON, nie liczby — frontend już to
  poprawnie obsługiwał przez `Number(...)`, potwierdzone na żywym
  przykładzie z kwotą ułamkową (123,45 zł).
