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

## Następne kroki (checklist)
- [x] Szczegółowy schemat bazy danych w Prisma (encje, relacje, indeksy).
- [x] Kontrakt API — lista endpointów REST i uprawnień per rola.
- [x] Struktura repozytorium (monorepo: `frontend/`, `backend/`) i
      `docker-compose.yml`.
- [x] Pełny test end-to-end z prawdziwym MySQL i działającym deploymentem
      za NGINX Proxy Managerem (dom).
- [x] Frontend: routing, uwierzytelnianie, pełny ekran dzieci (lista +
      szczegóły + edycja + usuwanie), strona publiczna, dolna nawigacja
      mobile-first.
- [ ] **Do zrobienia przez użytkownika:** zweryfikować nowy UI w
      przeglądarce (na telefonie i desktopie, oba motywy) po
      `git pull` + `docker compose up -d --build frontend`.
- [ ] Implementacja pozostałych modułów backendu: kategorie/kwoty, wpłaty,
      ustawienia (w tym przełącznik widoku publicznego), raporty
      (zaległości/karta dziecka/zbiorczy + eksport), import/eksport JSON,
      zarządzanie kontami rodziców.
- [ ] Odpowiadające im ekrany frontendu, gdy backend będzie gotowy:
      kategorie i kwoty, wpłaty (z historią częściowych), raporty, pełny
      panel ustawień.
