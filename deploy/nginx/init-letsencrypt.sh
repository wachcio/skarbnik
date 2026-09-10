#!/usr/bin/env bash
# Jednorazowy skrypt do pierwszego uzyskania certyfikatu Let's Encrypt dla
# APP_DOMAIN z .env — używasz go tylko wtedy, gdy appka stoi za samodzielnym
# nginx+certbot z tego repo (usługi `nginx`/`certbot` w docker-compose.yml),
# a NIE za NGINX Proxy Managerem (ten ma własny sposób wystawiania certów
# z poziomu GUI — patrz README.md).
#
# Uruchom RAZ, z katalogu repo, PO pierwszym `docker compose up -d`:
#   ./deploy/nginx/init-letsencrypt.sh
#
# Bazuje na powszechnie znanym wzorcu https://github.com/wmnnd/nginx-certbot
# (tymczasowy samopodpisany cert, żeby nginx w ogóle wystartował -> prawdziwy
# cert przez certbota w trybie webroot -> reload nginksa).
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
  echo "Brak .env w katalogu repo — najpierw: cp .env.example .env i uzupełnij." >&2
  exit 1
fi

set -a
source .env
set +a

: "${APP_DOMAIN:?Ustaw APP_DOMAIN w .env (domena appki, np. skarbnik.twoja-domena.pl)}"
: "${LETSENCRYPT_EMAIL:?Ustaw LETSENCRYPT_EMAIL w .env (e-mail do powiadomień certbota)}"

DATA_PATH="./deploy/nginx/letsencrypt-data"
DOMAIN_DIR="$DATA_PATH/conf/live/$APP_DOMAIN"

if [ -d "$DOMAIN_DIR" ]; then
  read -rp "Certyfikat dla $APP_DOMAIN już tu istnieje. Wygenerować od nowa? [y/N] " decision
  case "$decision" in
    y|Y) ;;
    *) echo "Przerwano."; exit 0 ;;
  esac
fi

echo "### Tworzę tymczasowy samopodpisany certyfikat, żeby nginx mógł wystartować ###"
mkdir -p "$DOMAIN_DIR"
# Uwaga: `--entrypoint` w Dockerze to JEDNO słowo (nazwa binarki), nie cały
# string polecenia — stąd `sh -c "..."` zamiast wklejenia poleceń wprost
# jako wartość --entrypoint (to drugie by się nie uruchomiło: Docker
# szukałby pliku wykonywalnego o nazwie dosłownie całej tej komendy ze
# spacjami).
docker compose run --rm --entrypoint sh certbot -c "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$APP_DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$APP_DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'"

echo "### Startuję nginx z tymczasowym certyfikatem ###"
docker compose up -d nginx

echo "### Usuwam tymczasowy certyfikat ###"
docker compose run --rm --entrypoint sh certbot -c "\
  rm -rf /etc/letsencrypt/live/$APP_DOMAIN \
         /etc/letsencrypt/archive/$APP_DOMAIN \
         /etc/letsencrypt/renewal/$APP_DOMAIN.conf"

echo "### Proszę o prawdziwy certyfikat Let's Encrypt (walidacja HTTP-01, port 80 musi być dostępny z internetu) ###"
# `--entrypoint certbot` jest tu KONIECZNE: usługa `certbot` w docker-compose.yml
# ma na stałe ustawiony entrypoint na pętlę odnawiania (`certbot renew` w
# nieskończonej pętli, patrz docker-compose.yml) — bez nadpisania entrypointu
# `docker compose run certbot certonly ...` po cichu uruchomiłby TĘ pętlę,
# zignorował argument "certonly ..." i nigdy nie wystawił certyfikatu
# (zweryfikowane: bez tej flagi kontener kończył się z "No renewals were
# attempted", nie prosząc Let's Encrypt o nic).
docker compose run --rm --entrypoint certbot certbot certonly --non-interactive --webroot -w /var/www/certbot \
  -d "$APP_DOMAIN" \
  --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email

echo "### Przeładowuję nginx z prawdziwym certyfikatem ###"
docker compose exec nginx nginx -s reload

echo
echo "Gotowe. https://$APP_DOMAIN powinno teraz działać z prawdziwym certyfikatem."
echo "Kontener 'certbot' sam odnawia certyfikat co 12h (certbot renew), nic więcej nie trzeba robić."
