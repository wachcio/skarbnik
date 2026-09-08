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

Frontend: `http://localhost:5173` (lub `FRONTEND_PORT` z `.env`).
Backend: `http://localhost:4000/api/health` (lub `APP_PORT` z `.env`).

**Za reverse proxy (NGINX Proxy Manager) — wymagane:** frontend woła zawsze
względne `/api/...` (ten sam origin co strona, zero CORS). Na Proxy Hoście
dla domeny appki dodaj **Custom Location** `/api` → `backend:4000` (scheme
`http` — TLS i tak kończy NPM). Bez tego panel logowania zwróci błąd
połączenia, bo przeglądarka będzie szukać API pod adresem, który nie
istnieje.

Logowanie: `ADMIN_EMAIL` / `ADMIN_PASSWORD` z `.env` (utworzone przez seed).

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
