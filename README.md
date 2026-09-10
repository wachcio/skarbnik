# Skarbnik Przedszkolny

Aplikacja webowa wspierająca skarbnika grupy przedszkolnej w prowadzeniu
ewidencji dzieci, składek i rozliczeń semestralnych.

- **Założenia projektu i bieżący postęp prac:** [PROJECT.md](./PROJECT.md)
- **Kontrakt API:** [docs/API.md](./docs/API.md)

## Szybki start (Docker)

```bash
cp .env.example .env
# uzupełnij .env (hasła do bazy, SESSION_SECRET, dane konta admina, domeny)

docker compose up -d --build
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec backend npm run prisma:seed
```

Kolejność ma znaczenie: `migrate:deploy` musi pójść zaraz po starcie, zanim
zaczniesz cokolwiek klikać w aplikacji — backend startuje bez czekania na
istnienie tabel, więc np. logowanie przed migracją zwróci błąd 500
(`database: unreachable`/brak tabel), co jest oczekiwane i mija po migracji.

Frontend: `http://localhost:5173` (lub `FRONTEND_PORT` z `.env`).
Backend: `http://localhost:4000/api/health` (lub `APP_PORT` z `.env`).

**Za reverse proxy (NGINX Proxy Manager) — wymagane:** frontend woła zawsze
względne `/api/...` (ten sam origin co strona, zero CORS). Na Proxy Hoście
dla domeny appki dodaj **Custom Location** `/api` → `backend:4000` (scheme
`http` — TLS i tak kończy NPM). Bez tego panel logowania zwróci błąd
połączenia, bo przeglądarka będzie szukać API pod adresem, który nie
istnieje.

Logowanie: `ADMIN_EMAIL` / `ADMIN_PASSWORD` z `.env` (utworzone przez seed).

## Wdrożenie na VPS bez NGINX Proxy Managera

Jeśli nie stawiasz NPM (np. samodzielny VPS OVH), w repo jest gotowy,
lekki reverse proxy — zwykły `nginx` + `certbot` w Dockerze, robiący
dokładnie to samo co Custom Location wyżej, tylko konfigiem zamiast GUI.
Domyślnie te usługi są **wyłączone** (nie kolidują z NPM, gdy jednak go
używasz) — włączasz je jawnie profilem `standalone-proxy`.

```bash
cp .env.example .env
# uzupełnij .env jak zwykle + dwie dodatkowe zmienne:
#   APP_DOMAIN=skarbnik.twoja-domena.pl   (ta sama domena co PUBLIC_BASE_URL)
#   LETSENCRYPT_EMAIL=ty@twoja-domena.pl

# DNS: w panelu, gdzie trzymasz strefę DNS domeny (np. MyDevil), dodaj
# rekord A wskazujący APP_DOMAIN na publiczne IP tego VPS-a — i poczekaj,
# aż się propaguje, zanim pójdziesz dalej (certbot zweryfikuje domenę
# przez realne połączenie z internetu na port 80).

docker compose --profile standalone-proxy up -d --build
docker compose exec backend npm run prisma:migrate:deploy
docker compose exec backend npm run prisma:seed

# JEDNORAZOWO, dopiero teraz (wymaga uruchomionych kontenerów wyżej) —
# wystawia prawdziwy certyfikat Let's Encrypt dla APP_DOMAIN:
./deploy/nginx/init-letsencrypt.sh
```

Od tej pory appka jest pod `https://APP_DOMAIN`, a certyfikat odnawia się
sam (kontener `certbot` sprawdza co 12h). Firewall VPS-a (i ewentualna
dodatkowa zapora sieciowa w panelu dostawcy, jeśli taką ma) musi przepuszczać
porty 80 i 443 — 80 jest potrzebny na stałe, nie tylko przy pierwszym
uzyskaniu certyfikatu (Let's Encrypt weryfikuje odnowienia tak samo).
Portów `4000`/`5173`/`3306` nie trzeba (i nie powinno się) wystawiać
na zewnątrz — z nimi rozmawia już tylko kontener `nginx`, po wewnętrznej
sieci Dockera.

## Odzyskiwanie hasła administratora

Admin może zmienić własne hasło samodzielnie w Ustawieniach (o ile pamięta
obecne). Jeśli hasło zostało zapomniane, appka celowo NIE ma "resetu przez
e-mail" (nie wysyła maili — patrz [PROJECT.md](./PROJECT.md)) — jedyna droga
to bezpośredni dostęp do serwera:

```bash
docker compose exec backend npm run admin:reset-password
```

Komenda pyta o e-mail konta administratora i nowe hasło (interaktywnie, hasło
niewidoczne na ekranie), zeruje ewentualną blokadę logowania i wylogowuje
wszystkie aktywne sesje tego konta. Działa wyłącznie na kontach z rolą ADMIN —
hasła rodziców resetuje admin z poziomu appki (Ustawienia → Konta rodziców).

## Praca lokalna bez Dockera

```bash
# backend
cd backend
cp .env.example .env   # wskaż lokalną/zdalną instancję MySQL
npm install
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev             # http://localhost:4000

# frontend (w drugim terminalu)
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

## Struktura repozytorium

```
backend/     Node.js + Express + Prisma (REST API, MySQL)
frontend/    React + TypeScript + Vite (mobile-first)
docs/        Kontrakt API i inna dokumentacja techniczna
PROJECT.md   Dziennik projektu — założenia i postęp prac
```
