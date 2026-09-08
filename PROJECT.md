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

## Następne kroki (checklist)
- [ ] Szczegółowy schemat bazy danych w Prisma (encje, relacje, indeksy).
- [ ] Kontrakt API — lista endpointów REST i uprawnień per rola.
- [ ] Struktura repozytorium (monorepo: `frontend/`, `backend/`) i
      `docker-compose.yml`.
- [ ] Makiety ekranów mobile-first (lista dzieci, karta dziecka, wpłaty,
      raporty).
- [ ] Implementacja backendu.
- [ ] Implementacja frontendu.
