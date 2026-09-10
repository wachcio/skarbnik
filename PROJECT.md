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
- [x] Zabezpieczenia budżetowe wpłat: limit zbiorczy per dziecko/semestr
      i limit per pojedyncza kategoria.
- [x] Backend + frontend: zakładka „Wydatki” (pełny CRUD, tylko admin).
- [x] Raporty: wydatki wg kategorii/semestru + stan kasy skarbnika
      (łącznie za całą historię), Raporty jako strona główna po
      zalogowaniu.
- [ ] **Do zrobienia przez użytkownika:** zweryfikować cały UI w
      przeglądarce — to pierwszy moment, gdy warto usiąść i przeklikać
      całość jako prawdziwy skarbnik (dodanie dziecka → kategorii →
      wpłaty → sprawdzenie raportu → eksport PDF/Excel), a nie punktowo
      po jednej funkcji na raz.
- [ ] Nice-to-have na przyszłość (świadomie poza zakresem od początku):
      powiadomienia e-mail/SMS o zaległościach, samodzielna rejestracja
      rodziców kodem zaproszenia zamiast ręcznego tworzenia kont.

### 2026-09-10 (26) — Autor/wersja/data publikacji w .env + dyskretna stopka
- Nowe zmienne `APP_AUTHOR`/`APP_VERSION`/`APP_RELEASE_DATE` (z
  sensownymi domyślnymi wartościami w env.ts) — dołączone do
  `GET /api/health` jako `app: {...}`, skąd frontend pobiera dane do
  wyświetlenia (nie na sztywno w kodzie). Wpisane do `.env.example`
  (root + backend/) i do rzeczywistych lokalnych `.env` (gitignored),
  jawnie przekazane w `docker-compose.yml` do kontenera backendu.
- Nowy `AppInfoFooter.tsx`: dyskretna, wyciszona stopka na samym dole
  Ustawień („Skarbnik Przedszkolny {wersja} · {autor} · {data po
  polsku}”), widoczna dla obu ról.
- **Zweryfikowane** na żywym Dockerze+MySQL: backend uruchomiony z
  niestandardowymi wartościami env — curlem potwierdzone, że
  `/api/health` zwraca realne wartości z env, nie domyślne z kodu.
  Playwright: stopka widoczna i poprawnie sformatowana w Ustawieniach
  dla admina i rodzica, oba motywy.

### 2026-09-11 (31) — Automatyczny reload nginksa po odnowieniu certyfikatu
- Użytkownik zapytał, czy certyfikat będzie się sam odnawiał — odpowiedź
  ujawniła realną lukę: `certbot` co 12h faktycznie podmienia plik
  certyfikatu na dysku, ale nginx trzyma go wczytany w pamięci procesu
  i nigdy sam z siebie nie zauważy podmiany bez `nginx -s reload`. Bez
  naprawy: certyfikat odnowiłby się "cicho" na dysku za ~60 dni, a
  przeglądarki i tak dostawałyby stary, wygasający certyfikat.
- `certbot` nie może bezpiecznie wywołać reloadu w INNYM kontenerze
  (wymagałoby zamontowania mu gniazda Dockera — realnie pełny dostęp
  roota do hosta, nieproporcjonalne ryzyko dla samego przeładowania
  configu). Zamiast tego nginx przeładowuje SAM SIEBIE co 12h w tle
  (reload jest tani i nie zrywa połączeń, więc robimy to bezwarunkowo).
- **Pierwsza wersja naprawy miała realny błąd, złapany dopiero przy
  testowaniu, nie przy czytaniu kodu**: `command: sh -c "... & exec
  nginx ..."` na usłudze `nginx` wyglądało niewinnie, ale oficjalny
  `/docker-entrypoint.sh` obrazu `nginx:alpine` uruchamia CAŁĄ
  konfigurację startową (w tym renderowanie szablonu przez envsubst)
  TYLKO gdy pierwszy argument polecenia to dosłownie `"nginx"` —
  podmiana na `"sh"` cicho pomijała ten krok. Nginx startował bez
  żadnego błędu i przechodził nawet `nginx -t`, ale z pustym
  `conf.d` nie nasłuchiwał na ŻADNYM porcie (potwierdzone: `ss`
  wewnątrz kontenera pokazywał tylko wewnętrzny DNS Dockera,
  a kontener z tej samej sieci dostawał "connection refused").
  Naprawione przez podmianę `entrypoint:` (nie `command:`) na nowy
  `deploy/nginx/reload-entrypoint.sh`, który wprost odtwarza tę samą
  pętlę po `/docker-entrypoint.d/*.sh`/`*.envsh` co oryginalny skrypt
  (zweryfikowaną bezpośrednio w treści skryptu z obrazu), zanim
  odpali w tle pętlę reloadu i wystartuje właściwego nginksa.
- **Zweryfikowane** na pełnym Dockerze+MySQL: `app.conf` znów renderuje
  się poprawnie i appka odpowiada; `nginx -s reload` nie przerywa
  działania appki; `docker stop` zatrzymuje kontener czysto i szybko
  (PID 1 to wciąż prawdziwy proces nginksa, poprawna obsługa sygnału);
  podmieniony na dysku certyfikat jest faktycznie serwowany dopiero PO
  `nginx -s reload` (potwierdzone bezpośrednio przez realny handshake
  TLS, nie tylko przez to, że appka nadal odpowiada).

### 2026-09-10/11 (30) — Poprawki po pierwszym realnym wdrożeniu na VPS OVH
- Pierwsze prawdziwe uruchomienie `init-letsencrypt.sh` na produkcyjnym
  VPS-ie (`skarbnik.wachcio.pl`, OVH) ujawniło dwie rzeczy, których nie
  złapały testy na lokalnym Dockerze:
  1. **`FRONTEND_PORT` ustawiony w `.env` na `80` (a potem `443`)** —
     błąd konfiguracyjny użytkownika, nie appki, ale realny: frontend
     bezpośrednio zajmował port publiczny, który miał należeć wyłącznie
     do `nginx`, uniemożliwiając mu start. Przypomnienie w dokumentacji:
     przy `standalone-proxy` `FRONTEND_PORT`/`APP_PORT` mają zostać na
     domyślnych wartościach.
  2. **Kontener `nginx` z nieświeżym stanem sieci Dockera** — po
     pierwszej nieudanej próbie (zanim naprawiono punkt 1) kontener
     `nginx` utknął w pętli restartów z błędem "host not found in
     upstream 'backend'", mimo że DNS Dockera per se działało
     bezbłędnie (potwierdzone niezależnym kontenerem na tej samej
     sieci). Zwykłe `docker compose up -d nginx` tego nie naprawiało —
     potrzebne było `--force-recreate`, żeby kontener dostał naprawdę
     świeże podłączenie do sieci.
- Namierzone i naprawione w samym skrypcie (nie tylko obejście
  ręczne), żeby przyszłe uruchomienia (także odnowienia/przebudowy
  appki przez użytkownika) nie trafiały na to samo:
  - `docker compose up -d nginx` → `--force-recreate` na stałe.
  - Nowa pętla oczekiwania (do 30s, sprawdzająca realną odpowiedź HTTP
    na porcie 80) PRZED usunięciem tymczasowego certyfikatu i prośbą do
    Let's Encrypt — poprzednio skrypt ruszał dalej natychmiast po
    `docker compose up`, co na żywym serwerze skutkowało "Connection
    refused" od Let's Encrypt, bo nginx jeszcze faktycznie nie stał.
    Przy okazji złapany dodatkowy błąd testowy: `curl http://localhost/`
    bez nagłówka Host trafiał w wbudowaną w obraz `nginx:alpine`
    domyślną stronę powitalną (`/etc/nginx/conf.d/default.conf`), więc
    naiwny test gotowości mógłby fałszywie pokazywać "gotowe" nawet
    przy zepsutym własnym configu — dodany `deploy/nginx/
    empty-default.conf` (podmienia domyślny plik obrazu) usuwa tę
    domyślną stronę całkowicie.
  - **Zweryfikowane lokalnie w obu kierunkach**: celowo zepsuty config
    nginksa (fatalny błąd składni — ten sam rodzaj awarii co realny
    problem z DNS/certyfikatem na VPS-ie) poprawnie zatrzymuje skrypt
    po 30s z czytelnym błędem, nigdy nie dotykając certyfikatu ani
    Let's Encrypt; zdrowy nginx przechodzi test natychmiast, bez
    regresji na wcześniej zweryfikowanej ścieżce happy-path.
- Po tych poprawkach i skorygowaniu `.env` na VPS-ie — do potwierdzenia
  przez użytkownika po `git pull` i ponownym `init-letsencrypt.sh` —
  `skarbnik.wachcio.pl` powinien dostać prawdziwy certyfikat Let's
  Encrypt przez samodzielny nginx+certbot z tego repo, bez NGINX Proxy
  Managera.

### 2026-09-10 (29) — Samodzielny nginx+certbot dla VPS bez NGINX Proxy Managera
- Do tej pory appka zakładała reverse proxy z panelem GUI (NGINX Proxy
  Manager — dom albo VPS). Na potrzebę wdrożenia na goły VPS (OVH, DNS
  na MyDevil) doszły dwie nowe, domyślnie WYŁĄCZONE usługi w
  `docker-compose.yml` (profil `standalone-proxy`, żeby nie kolidować
  z istniejącymi wdrożeniami z NPM): `nginx` (szablon konfiguracji przez
  wbudowany w oficjalny obraz mechanizm envsubst, `deploy/nginx/
  templates/app.conf.template`) i `certbot` (pętla `certbot renew` co
  12h). Robią dokładnie to, co dotąd Proxy Host + Custom Location "/api"
  w NPM — jedna domena, `/` do frontendu, `/api` do backendu, TLS.
  Zestaw szyfrów TLS ("intermediate" wg Mozilli, same ECDHE) wpisany
  wprost w szablonie, bez pobierania niczego z zewnątrz przy starcie.
- Nowy `deploy/nginx/init-letsencrypt.sh` — jednorazowy bootstrap
  pierwszego certyfikatu (wzorzec wmnnd/nginx-certbot: tymczasowy
  samopodpisany cert → realny cert od Let's Encrypt przez webroot →
  reload nginksa). Nowe zmienne `APP_DOMAIN`/`LETSENCRYPT_EMAIL`
  w `.env.example`, nowa sekcja w README.md z pełną sekwencją poleceń.
- **Dwa realne błędy złapane dopiero przy odpaleniu skryptu na żywym
  Dockerze** (nie przy samym czytaniu kodu): (1) `--entrypoint` w
  Dockerze to jedno słowo, nie cały string polecenia — wielosłowowe
  komendy (openssl/rm) trzeba było owinąć w `sh -c "..."`. (2) poważniejszy:
  usługa `certbot` ma na stałe ustawiony entrypoint na pętlę odnawiania,
  więc `docker compose run certbot certonly ...` bez `--entrypoint
  certbot` PO CICHU uruchamiał tę pętlę zamiast żądania certyfikatu —
  kontener kończył się kodem 0 i komunikatem "No renewals were
  attempted", nigdy nie pytając Let's Encrypt o nic. To dokładnie ten
  rodzaj cichej porażki, który wyglądałby na sukces na produkcji
  (appka zostałaby na tymczasowym samopodpisanym certyfikacie).
  Naprawione i ponownie zweryfikowane: po poprawce skrypt realnie
  dobija się do Let's Encrypt (potwierdzone przez celowo nieprawidłowy
  e-mail testowy, na który ACME poprawnie odpowiedziało odrzuceniem,
  zamiast ciszy).
- **Zweryfikowane** end-to-end na pełnym Dockerze+MySQL z fałszywą
  domeną testową: `docker compose config` parsuje nowe usługi/profil,
  nginx startuje z wyrenderowanym configiem, poprawnie proxuje `/`
  (frontend SPA) i `/api/*` (backend) po HTTPS, HTTP przekierowuje na
  HTTPS z wyjątkiem ścieżki ACME challenge, a pełny przepływ logowania
  przez proxy zwraca ciasteczko sesji z `Secure`+`HttpOnly` (potwierdza
  poprawne działanie `TRUST_PROXY`/`X-Forwarded-Proto` przez nowy
  reverse proxy).

### 2026-09-10 (28) — Wyszukiwarka na liście dzieci
- Nowe pole `type="search"` nad listą w zakładce „Dzieci", filtrujące
  widoczne wiersze na bieżąco (przy każdym wciśnięciu klawisza), po
  imieniu i nazwisku łącznie.
- Dopasowanie ignoruje wielkość liter i polskie ogonki: zapytanie i
  imię/nazwisko każdego dziecka są normalizowane przez dekompozycję NFD
  ze zdjęciem znaków diakrytycznych (ten sam bezpieczny wzorzec co
  `slugify()` w `export.service.ts`, zakres zapisany przez
  `String.fromCharCode`, nie literalnym znakiem w regexie) — dzięki temu
  „zaba" trafia też na „Żaba", a „łoś” na „ŁOŚ”.
- Filtrowanie działa po stronie frontendu na liście dzieci już
  ograniczonej rolą (rodzic nadal przeszukuje tylko własne dzieci).
  Brak dopasowań pokazuje zlokalizowany komunikat; wyczyszczenie pola
  przywraca pełną, alfabetyczną listę.
- Nowe klucze tłumaczeń (`children.searchPlaceholder`,
  `children.noSearchResults`) dodane w pl i en.
- **Zweryfikowane** na żywym Dockerze+MySQL zasianym dziećmi o tych
  samych „trudnych” polskich nazwiskach co przy wcześniejszej naprawie
  sortowania (Lis, Łoś, Maj, Zych, Żaba, Cichy), przez Playwright:
  dopasowanie po nazwisku, po imieniu, bez ogonków, bez rozróżniania
  wielkości liter, stan braku wyników i czyszczenie pola — wszystko
  działa poprawnie; te same przypadki potwierdzone też po angielsku po
  przełączeniu języka.

### 2026-09-10 (27) — Tłumaczenie interfejsu na angielski + przełącznik flagi
- Cała warstwa frontendowa (33 pliki, ~3600 linii) przetłumaczona na
  angielski: nawigacja, nagłówki, przyciski, formularze, komunikaty,
  dialogi potwierdzenia i cała treść działu Pomocy (13 sekcji). Własna,
  lekka architektura i18n (bez nowej zależności): `i18n/translations.ts`
  (płaski słownik ok. 220 kluczy pl/en), `LanguageContext`/`useLanguage`
  (ten sam wzorzec co `useTheme`, wybór w localStorage), `LanguageToggle`
  — przycisk-ikonka flagi (🇵🇱/🇬🇧) obok przełącznika motywu i Wyloguj
  w nagłówku.
- Świadome decyzje o zakresie: kwoty i większość dat zostają zawsze w
  formacie polskim (pl-PL, "zł") niezależnie od języka — appka operuje
  na prawdziwych złotówkach realnej placówki; nazwa appki i realne dane
  (imiona dzieci, nazwy kategorii, etykiety semestrów) nie są
  tłumaczone — to nie tekst interfejsu. Komunikaty błędów z backendu
  zostają po polsku (pełne i18n backendu to osobny, większy temat,
  świadomie odłożony).
- **Zweryfikowane**: `npm run build` czysto mimo skali zmiany (zero
  błędów TS). Na żywym Dockerze+MySQL przez Playwright: domyślny język
  polski, przełączanie działa i przetrwało odświeżenie, nagłówek z
  TRZEMA kontrolkami zmierzony na 320/360/390px (0px przepełnienia),
  pełny przelot po angielsku przez wszystkie główne ekrany (obie role) —
  wszystko poprawnie przetłumaczone. Grep po repo nie znalazł pominiętych
  polskich napisów poza celowo dwujęzycznym HelpPage.tsx.

### 2026-09-10 (25) — Przełącznik motywu jako ikonka słońca/księżyca
- Zamiast listy rozwijanej (Auto/Jasny/Ciemny) — okrągły przycisk z
  jedną ikonką pokazującą aktualnie aktywny motyw (☀️/🌙), klik
  przełącza na przeciwny. `useTheme` uproszczony do dwóch stanów;
  pierwsza wizyta bez zapisanego wyboru nadal dopasowuje się do
  `prefers-color-scheme`, tylko że jednym kliknięciem zamienia to w
  jawny, zapamiętywany wybór zamiast stale śledzić system.
- **Zweryfikowane**: statycznym podglądem builda przez Playwright (bez
  backendu — czysto frontendowa zmiana) — ikonka poprawnie startuje wg
  systemu, przełącza się po kliknięciu, przetrwała odświeżenie strony,
  0px przepełnienia na 320px. Dodatkowo na żywym Dockerze zmierzony
  nagłówek zalogowanego ekranu (przełącznik + Wyloguj) na 320/360/390px
  — 0px wszędzie, bez regresji względem wcześniejszej poprawki tego
  nagłówka.

### 2026-09-10 (24) — Dostęp admina do logu audytowego
- Log audytowy był zapisywany od pierwszego commita (recordAudit() przy
  każdej operacji CRUD), ale nie było jak go zobaczyć. Nowy
  `GET /api/audit-log` (admin, stronicowany kursorem, filtry
  entityType/action) + nowy ekran `/audit-log` (link z Ustawień):
  lista wpisów z kolorowym znacznikiem akcji, rozwijane „Szczegóły”
  z JSON przed/po, „Wczytaj więcej”. Dopisana też sekcja w Pomocy.
- Zweryfikowane, że `dataBefore`/`dataAfter` nigdzie w appce nie
  zawierają `passwordHash` (przegląd wszystkich miejsc wywołania
  recordAudit()) — bezpiecznie zwracane wprost przez API.
- **Zweryfikowane** na żywym Dockerze+MySQL: curlem (różnorodne
  zdarzenia w poprawnej kolejności, filtry, paginacja kursorem bez
  duplikatów/luk, 403 dla rodzica) i Playwrightem (pełny przepływ z
  Ustawień, rozwijanie szczegółów bez hasła w zrzucie, filtrowanie,
  przekierowanie rodzica, oba motywy).

### 2026-09-10 (23) — Dział pomocy + pływający przycisk "?"
- Pływający przycisk pomocy widoczny na każdym zalogowanym ekranie
  (nad dolną nawigacją), prowadzący do nowej strony `/help` z 13
  rozwijanymi sekcjami (natywny `<details>`/`<summary>`, bez
  biblioteki) tłumaczącymi appkę krok po kroku: jak to działa
  (semestry, kategorie/cele, wpłaty, wydatki, raporty), role admin/
  rodzic, Dzieci, Kategorie, Wpłaty (limity budżetowe), Wydatki,
  Raporty, Widok publiczny, Konta rodziców, Kopia zapasowa, zmiana
  e-maila/hasła, odzyskiwanie hasła admina, najczęstsze pytania.
- Treść dopasowana do roli — sekcje dotyczące funkcji tylko-dla-admina
  są ukryte dla rodzica (rodzic widzi 6 z 13 sekcji).
- **Zweryfikowane** na żywym Dockerze+MySQL przez Playwright: przycisk
  widoczny i poprawnie umiejscowiony na 390px i 320px w obu motywach,
  znika na samej stronie pomocy, pierwsza sekcja domyślnie rozwinięta,
  admin widzi wszystkie 13 sekcji a rodzic dokładnie 6 dopasowanych do
  jego roli.

### 2026-09-10 (22) — Naprawa: "Nazwisko Imię" tam, gdzie sortujemy po nazwisku
- Użytkownik przesłał zrzuty z produkcji: mimo poprzedniej poprawki
  kolacji dalej "nie widać" sortowania. Rzeczywista przyczyna: dane BYŁY
  poprawnie posortowane po nazwisku, ale appka wyświetlała "Imię
  Nazwisko" — więc lista posortowana po nazwisku pokazywała na
  pierwszym miejscu ciąg imion, które z natury nie są posortowane.
  Wyglądało to jak brak sortowania, mimo że dane pod spodem były OK.
- Zmieniona kolejność wyświetlania na "Nazwisko Imię" wszędzie, gdzie
  lista dzieci jest posortowana po nazwisku: lista Dzieci, karty
  Zaległości w Raportach (+ eksporty PDF/Excel, bo to wspólne źródło —
  `childName` w `getArrears()`), dropdown "Dziecko" przy dodawaniu
  wpłaty, checkboxy wyboru dzieci przy kontach rodziców. Świadomie BEZ
  zmian: nagłówek karty dziecka, tytuł raportu "Karta dziecka", lista
  wpłat (sortowana chronologicznie, nie po nazwisku) — tam "Imię
  Nazwisko" nadal pasuje.
- **Zweryfikowane** na żywym Dockerze+MySQL tymi samymi ośmioma trudnymi
  nazwiskami co poprzednia poprawka: curlem (API) i Playwrightem (UI) —
  wszystkie cztery miejsca pokazują teraz alfabetyczny porządek
  widoczny na pierwszy rzut oka.

### 2026-09-10 (21) — Naprawa: polskie sortowanie nazwisk dzieci
- Zgłoszone przez użytkownika: nazwiska dzieci w widoku Dzieci (admin)
  i w raportach powinny być alfabetyczne. Zapytania SQL już sortowały
  (`orderBy: [{lastName:"asc"},{firstName:"asc"}]` w GET /api/children
  i getArrears) — prawdziwa przyczyna leżała w kolacji: kolumny
  `children.firstName`/`lastName` dziedziczyły `utf8mb4_unicode_ci`,
  która sortuje np. "Żaba"/"Źrebak" PRZED "Zych" — niepoprawnie wg
  polskiego alfabetu (Z, Ź, Ż). Zweryfikowane empirycznie na prawdziwym
  MySQL (HEX() surowych bajtów, żeby wykluczyć mojibake z pipe'a
  testowego) — `utf8mb4_polish_ci` sortuje to poprawnie.
- Nowa migracja `polish_collation_child_names`: `ALTER TABLE children
  MODIFY firstName/lastName ... COLLATE utf8mb4_polish_ci` — celowo
  tylko te dwie kolumny, nie cała baza. Zero zmian w kodzie aplikacji —
  zapytania były już poprawne, brakowało tylko kolacji.
- **Zweryfikowane** na żywym Dockerze+MySQL, migracja zastosowana przez
  zwykłego użytkownika appki (nie root) jak na produkcji: 8 dzieci z
  trudnymi nazwiskami (Cichy, Ćwik, Lis, Łoś, Maj, Zych, Źrebak, Żaba)
  przez prawdziwe API — idealny polski porządek w GET /api/children i
  w raporcie zaległości, potwierdzone też wizualnie w UI (Playwright).

### 2026-09-10 (20) — Kolejność sekcji w Ustawieniach
- Zmiana e-maila i Zmiana hasła (dotyczą własnego konta) przeniesione
  na sam koniec listy sekcji — za Widokiem publicznym, Kategoriami,
  Kontami rodziców i Kopią zapasową dla admina (dla rodzica, który ma
  tylko te dwie sekcje, i tak lądują na końcu jego krótszej listy).
  Zweryfikowane Playwrightem: kolejność nagłówków sprawdzona dla obu ról.

### 2026-09-10 (19) — Samodzielna zmiana e-maila w Ustawieniach
- Użytkownik zapytał, jak zmienić e-mail admina — appka nie miała na to
  żadnej drogi. Ten sam wzorzec co zmiana hasła (poprzedni wpis): nowy
  `POST /api/auth/change-email` (dowolna rola, wymaga obecnego hasła —
  e-mail to zarazem login, więc bez tej weryfikacji przejęta sesja
  mogłaby po cichu przejąć konto na stałe).
- Nowy `ChangeEmailSection.tsx` w Ustawieniach. `AuthContext` dostał
  `refreshUser()` — karta „Zalogowano jako” aktualizuje się od razu po
  zmianie, bez przeładowania strony.
- Sesja NIE jest niszczona po zmianie e-maila (w odróżnieniu od resetu
  hasła admina przez CLI) — to rutynowa zmiana w trakcie aktywnej
  sesji, nie scenariusz utraty dostępu.
- **Zweryfikowane** na żywym Dockerze+MySQL: curlem wszystkie gałęzie
  walidacji (złe hasło, zły format, identyczny e-mail, e-mail zajęty —
  409, sukces), logowanie starym e-mailem odrzucone/nowym zaakceptowane,
  aktywna sesja przetrwała zmianę. Ekran zweryfikowany Playwrightem w
  obu motywach, w tym żywa aktualizacja karty „Zalogowano jako”.

### 2026-09-10 (18) — Pełny raport dziecka (oba semestry naraz)
- Widok dziecka pokazywał rozliczenie jednego semestru na raz
  (przełącznik u góry sekcji Składki). Nowa karta „Raport” dodaje
  możliwość pobrania PDF/Excel z pełną kartą dziecka: dane kontaktowe/
  notatki + rozliczenie i historia wpłat za OBA semestry na jednym
  dokumencie, plus podsumowanie łączne na końcu.
- Nowy `getChildFullReport()` (reużywa istniejący `getChildLedger` per
  semestr) i `GET /api/children/:id/report?format=pdf|xlsx`, z tym
  samym progiem dostępu co `/ledger` — dostępne więc też dla rodzica
  przeglądającego kartę własnego dziecka, nie tylko dla admina.
- **Zweryfikowane** na żywym Dockerze+MySQL: dziecko z wpłatami w obu
  semestrach, PDF obejrzany (pdftoppm) — poprawne sumy per semestr i
  łącznie, historia wpłat chronologicznie; Excel odczytany programowo —
  te same liczby. Kontrola dostępu: rodzic własnego dziecka 200, rodzic
  innego dziecka 403. Ekran zweryfikowany Playwrightem w obu motywach.

### 2026-09-10 (17) — Odzyskiwanie hasła administratora (komenda serwerowa)
- Poprzedni wpis dotyczył zmiany WŁASNEGO hasła ze znajomością obecnego —
  ten dotyczy scenariusza "zapomniałem hasła". Użytkownik poproszony o
  wybór między trzema podejściami (kod odzyskiwania w appce / e-mail z
  linkiem / komenda serwerowa) wybrał **komendę serwerową** — świadomie
  najbezpieczniejszą: nie dodaje żadnego nowego, publicznie dostępnego
  mechanizmu do appki (żadnej nowej tajemnicy do przechowania, żadnego
  nowego formularza na ekranie logowania), tylko wykorzystuje już
  istniejący próg zaufania — dostęp SSH/Docker do serwera.
- `docker compose exec backend npm run admin:reset-password` — pyta o
  e-mail i nowe hasło interaktywnie (hasło niewidoczne, własny minimalny
  czytnik stdin bez zależności), działa wyłącznie na kontach ADMIN,
  zeruje blokadę logowania i wylogowuje wszystkie aktywne sesje konta.
  Skrypt w `backend/src/scripts/`, kompilowany do `dist/` (Docker kopiuje
  tylko `dist/`, nie `src/` — stąd `admin:reset-password` uruchamia
  skompilowaną wersję, a `admin:reset-password:dev` przez `tsx`
  bezpośrednio na źródle, do lokalnego developmentu).
- Złapany i naprawiony bug we własnej pierwszej wersji: osobny listener
  `stdin` na każde pytanie gubił dane, gdy e-mail+hasła przychodziły w
  jednym fragmencie (typowe przy testach) — listener na kolejne pytanie
  powstawał już po tym, jak dane do niego dotarły. Naprawione jednym
  trwałym czytnikiem znaków żyjącym przez cały czas skryptu.
- **Zweryfikowane** na żywym Dockerze+MySQL dokładnie tak, jak będzie
  używane w produkcji (`docker exec` na zbudowanym obrazie): nieznany
  e-mail, konto rodzica (odrzucone), pełny sukces z retry na słabym
  haśle i niezgodnym powtórzeniu, a po resecie: stara sesja faktycznie
  wylogowana (401), stare hasło odrzucone, nowe działa.

### 2026-09-10 (16) — Samodzielna zmiana hasła w Ustawieniach
- Skarbnik (i rodzic — endpoint jest rolo-agnostyczny, więc nie było
  powodu tego sztucznie blokować) może zmienić własne hasło z panelu
  Ustawienia, bez pomocy admina. Inne niż istniejący ręczny reset hasła
  INNEJ osoby (`/api/users/:id/reset-password`, tylko admin, tylko dla
  kont rodziców) — tu wymagane jest podanie obecnego hasła.
- Nowy `POST /api/auth/change-password` (dowolna rola, `requireAuth`):
  weryfikacja obecnego hasła, ta sama polityka siły hasła co reszta
  appki, wpis w AuditLog.
- Nowy komponent `ChangePasswordSection.tsx` w Ustawieniach (obecne/
  nowe/powtórz nowe hasło), nowa klasa `.success-text` w theme.css.
- **Zweryfikowane** na żywym Dockerze+MySQL: curlem (złe obecne hasło,
  za słabe nowe, poprawna zmiana, logowanie starym hasłem odrzucone/
  nowym zaakceptowane — dla admina i dla rodzica), Playwrightem w obu
  motywach (pusty formularz, błąd, zielony komunikat sukcesu).

### 2026-09-10 (15) — Naprawa: import kopii zapasowej 500 na produkcji
- **Zgłoszone przez użytkownika na produkcji** (zrzut DevTools): import
  pliku JSON w Ustawieniach kończył się `500 Internal Server Error`.
- Przyczyna: przy dodawaniu modelu `Expense` (wpis 11) zapomniałem
  zaktualizować `backup.service.ts`. `Expense.category`/`Expense.semester`
  mają `onDelete: Restrict` tak jak `Payment`, ale w odróżnieniu od
  `Payment` (kaskaduje przez `Child`) `Expense` nie jest powiązany z
  dzieckiem — nic go nie usuwało przed `category.deleteMany()`/
  `semester.deleteMany()` w imporcie. Na każdej bazie z choćby jednym
  wydatkiem (czyli każdej produkcyjnej bazie używającej Wydatków) ten
  delete wywalał się na naruszeniu klucza obcego.
- Naprawa: `exportBackup()` dokłada `expenses`; `importBackup()` usuwa
  wydatki na samym początku transakcji (przed kategoriami/semestrami)
  i odtwarza je po utworzeniu kategorii/semestrów. Pole `expenses` w
  schemacie zod ma `.default([])`, więc starsze pliki kopii zapasowej
  (sprzed tej funkcji, bez tego pola) nadal się importują.
- **Zweryfikowane** na żywym Dockerze+MySQL, dokładnie odtwarzając
  zgłoszony scenariusz: baza z wpłatą i wydatkiem → eksport → import
  TEGO SAMEGO pliku (do bazy, w której te dane już istnieją — to
  wcześniej 500'owało). Teraz 200, stan kasy identyczny przed/po.
  Dodatkowo: import pliku bez pola `expenses` (symulacja starego
  backupu) też przechodzi.
- Lekcja na przyszłość: każdy nowy model z `onDelete: Restrict` na
  encji, którą import kasuje i tworzy od nowa (Category, Semester),
  wymaga też aktualizacji `backup.service.ts` — dodać do checklisty
  mentalnej przy kolejnych takich modelach.

### 2026-09-10 (14) — Raport "Wydatki wg miesięcy"
- Nowa sekcja w Raportach: wydatki wybranego semestru pogrupowane wg
  miesiąca (czas polski), najnowszy miesiąc na górze, z sumą per
  miesiąc i za cały semestr. Ten sam wzorzec co reszta strony (karta
  na miesiąc + lista wydatków w środku) i eksport PDF/Excel.
- Nowe helpery `warsawMonthKey`/`warsawMonthLabel` w `lib/time.ts`.
  PDF renderuje osobną mini-tabelę na miesiąc z pogrubionym wierszem
  „Razem” — ten sam mechanizm (`boldRowIndex` w `pdfTable()`) co przy
  zaległościach per dziecko z poprzedniego wpisu.
- **Zweryfikowane** na żywym Dockerze+MySQL: wydatki w trzech różnych
  miesiącach, poprawne grupowanie/sortowanie/sumy (761,25 zł łącznie).
  PDF obejrzany przez pdftoppm, Excel odczytany programowo, 403 dla
  konta rodzica (curl), ekran zweryfikowany Playwrightem w obu
  motywach.

### 2026-09-10 (13) — Podsumowanie zaległości per dziecko
- Sekcja zaległości grupowała już wpłaty po dziecku, ale brakowało
  sumy — trzeba było ręcznie dodać kwoty z poszczególnych kategorii.
  Karta każdego dziecka w Raportach dostała odznakę „razem X zł” obok
  imienia, obok istniejących pozycji per kategoria.
- Eksporty: PDF renderuje teraz osobną mini-tabelę na dziecko (nagłówek
  z imieniem) zamkniętą pogrubionym wierszem „Razem” z sumą plan/
  wpłacono/brakuje — `pdfTable()` dostał reużywalną opcję
  `boldRowIndex` do takich wierszy podsumowania. Excel: ten sam układ
  co dotychczas (płaska tabela z kolumną „Dziecko”), ale z pogrubionym,
  podświetlonym wierszem „Razem” po wierszach każdego dziecka —
  zwykła zebra usunięta z tego arkusza, bo przeplatanie z podsumowaniami
  nie dawałoby już czytelnego wzoru.
- **Zweryfikowane** na żywym Dockerze+MySQL: dwoje dzieci z celowo
  dobranymi częściowymi wpłatami (zaległości 20+200=220 i 1+240=241 zł).
  PDF obejrzany przez pdftoppm, Excel odczytany programowo — sumy się
  zgadzają, wiersze „Razem” pogrubione. Ekran zweryfikowany
  Playwrightem w obu motywach (zrzut samej listy zaległości, bo
  pełnostronicowy zrzut duplikował dolną nawigację — artefakt
  position:fixed w Chromium, nie błąd appki).

### 2026-09-10 (12) — Wydatki w raportach, stan kasy, Raporty jako strona główna
- Skoro wydatki mają już kategorię i semestr (patrz wpis niżej), raporty
  pokazują teraz obie strony bilansu: zestawienie zbiorcze semestru ma
  kolumnę/wiersz „Wydano” obok zebrano/plan (na ekranie i w eksportach
  PDF/Excel), tak jak poprosił użytkownik.
- Nowa karta „Stan kasy” na górze Raportów: zebrano łącznie / wydano
  łącznie / ile skarbnik dysponuje teraz. Świadomie liczona za **całą
  historię** (wszystkie semestry razem), nie tylko wybrany semestr —
  użytkownik potwierdził tę interpretację wprost: to jedno realne konto
  skarbnika, więc liczba nie powinna "znikać" przy przełączeniu
  semestru w dropdownie. Nowy endpoint `GET /api/reports/balance`.
- Widok publiczny świadomie NIE dostaje wydatków/stanu kasy — to
  informacja dla skarbnika, nie dla anonimowych widzów; pola odcięte
  explicite w `public.routes.ts`, zweryfikowane że nie da się ich
  zobaczyć mimo że dane istnieją w bazie.
- Zakładka „Raporty” przeniesiona na pierwszą pozycję w dolnej
  nawigacji i jest teraz stroną główną po zalogowaniu (admin trafia na
  `/reports`; rodzic, bez dostępu do raportów, nadal na `/children`).
- **Zweryfikowane** na żywym Dockerze+MySQL: wpłata + wydatek w tej
  samej kategorii poprawnie sumują się w obu endpointach, PDF/Excel
  obejrzane realnie (bez nakładania tekstu), 403 dla konta rodzica na
  `/reports/balance` i `/expenses` (curl), brak wycieku pól
  `spent`/`spentTotal` na `/api/public/summary`. Playwright w obu
  motywach: kolejność zakładek, poprawny redirect po zalogowaniu wg
  roli, 0px przepełnienia na 320px.

### 2026-09-10 (11) — Zakładka "Wydatki" (pełny CRUD, tylko admin)
- Skarbnik wydaje pieniądze na określone cele — dodana druga strona
  bilansu obok wpłat. Nowy model `Expense` (kategoria, semestr, kwota,
  data „kiedy", opcjonalny opis „za co"), powiązany z `Category`, a nie
  z konkretnym dzieckiem — spójne z tym, że „cel” i „kategoria” są w
  appce tym samym pojęciem.
- Nowa zakładka „Wydatki” w dolnej nawigacji, widoczna wyłącznie dla
  admina (rodzice nie mają dostępu — ani do zakładki, ani do
  `/api/expenses`, wymuszone przez `requireRole("ADMIN")`). Ekran:
  lista wydatków w wybranym semestrze z sumą łączną, dodawanie, edycja
  inline i usuwanie z potwierdzeniem. Blokada dodania/edycji wydatku na
  zarchiwizowaną kategorię, tak jak przy wpłatach. Każda operacja
  loguje się do audytu (migawka przed/po).
- Przy okazji poprawiony błąd odkryty własną weryfikacją: piąta pozycja
  w dolnej nawigacji (Wydatki) groziła przepełnieniem menu, więc
  „Wyloguj” przeniesione z dolnej nawigacji do nagłówka. To z kolei na
  wąskich telefonach (poniżej ~380px) powodowało zawijanie nagłówka do
  dwóch linii — naprawione: wydzielony wspólny komponent `AppHeader`
  (usunął przy okazji trzykrotną duplikację nagłówka), responsywna
  nazwa apki („Skarbnik” zamiast „Skarbnik Przedszkolny” pod 400px),
  krótsza etykieta motywu („Auto” zamiast „Systemowy”).
- **Zweryfikowane** na żywym Dockerze+MySQL (migracja przez
  `prisma migrate deploy`) oraz wizualnie przez Playwright w obu
  motywach: pełny przepływ dodania/edycji/usunięcia wydatku, blokada
  403 dla konta rodzica na `/api/expenses` (curl), odrzucenie wydatku
  na zarchiwizowaną kategorię, oraz zmierzone (nie tylko obejrzane)
  przepełnienie nagłówka na 320/360/390px — 0px po poprawce (wcześniej
  31px przy 360px).

### 2026-09-09 (10) — Limit wpłaty na pojedynczą kategorię
- Uzupełnienie zbiorczego limitu z poprzedniego wpisu: oprócz sumy po
  wszystkich kategoriach, także wpłaty w **jednej konkretnej kategorii**
  nie mogą przekroczyć jej własnej kwoty docelowej (z uwzględnieniem
  nadpisania per dziecko). Zgłoszone przez użytkownika zrzutem ekranu —
  kategoria przepłacona do 210/200 zł.
- Backend: dodatkowy warunek w tym samym miejscu co limit zbiorczy
  (`POST`/`PATCH /api/payments`), korzystający z tego samego
  `getChildLedger`, więc bez dodatkowych zapytań do bazy.
- Zweryfikowane na Dockerze+MySQL: wpłata dokładnie na granicy kwoty
  docelowej kategorii przechodzi, przekroczenie o 1 grosz odrzucone,
  edycja zmniejszająca wpłatę w tej samej kategorii przechodzi.

### 2026-09-09 (9) — Limit sumy wpłat dziecka na semestr
- Zabezpieczenie: suma wpłat dziecka w danym semestrze (po wszystkich
  kategoriach razem, nie per kategoria) nie może przewyższyć sumy kwot
  docelowych wszystkich kategorii dla tego dziecka w tym semestrze —
  z uwzględnieniem nadpisań kwot per dziecko. Świadomie limit zbiorczy,
  nie per kategoria — rodzic może dopłacić więcej do jednej kategorii,
  mniej do innej, byle suma się zgadzała.
- Backend: `getChildLedger`/`getChildSemesterTotals` (reużyte, nie
  duplikowane) sprawdzane w `POST` i `PATCH /api/payments`. Edycja
  scala częściową zmianę z istniejącym rekordem i wyklucza starą kwotę
  edytowanej wpłaty z sumy — inaczej liczyłaby się podwójnie.
- Frontend bez zmian — formularze wpłat już wyświetlały `error` z
  odpowiedzi API wprost.
- Zweryfikowane na Dockerze+MySQL: dziecko z dwoma kategoriami
  (100 + 200 = 300 limit) — wpłata 250 przechodzi, kolejna 100 (razem
  350) odrzucona, wpłata dokładnie na granicy (300) przechodzi. Edycja:
  ta sama kwota przechodzi, zwiększenie ponad limit odrzucone,
  zmniejszenie przechodzi — potwierdza brak podwójnego liczenia.

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
