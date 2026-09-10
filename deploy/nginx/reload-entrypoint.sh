#!/bin/sh
# Zastępuje domyślny /docker-entrypoint.sh obrazu nginx:alpine, żeby dodać
# okresowy samo-reload (patrz komentarz przy usłudze `nginx` w
# docker-compose.yml — certbot podmienia certyfikat na dysku, ale nic samo
# z siebie nie każe nginksowi go ponownie wczytać).
#
# UWAGA: to NIE może być zwykłe `command: sh -c "... & exec nginx ..."` na
# usłudze `nginx` bez podmiany entrypointu — oryginalny /docker-entrypoint.sh
# uruchamia całą konfigurację startową (m.in. envsubst renderujący nasz
# szablon w /etc/nginx/templates) TYLKO gdy pierwszy argument polecenia to
# dosłownie "nginx" (patrz jego kod: `if [ "$1" = "nginx" ]... `). Command
# w postaci "sh -c ..." łamie ten warunek i CICHO pomija całą konfigurację
# — nginx wtedy startuje z pustym /etc/nginx/conf.d, bez naszego configu,
# i nie nasłuchuje na żadnym porcie (zweryfikowane: to realnie się zdarzyło
# przy pierwszej wersji tego pliku). Dlatego ten skrypt sam, wprost,
# odtwarza tę samą pętlę po /docker-entrypoint.d/ co oryginał, zamiast
# polegać na oryginalnym /docker-entrypoint.sh z niewłaściwym $1.
set -e

for f in $(find /docker-entrypoint.d/ -follow -type f 2>/dev/null | sort -V); do
  case "$f" in
    *.envsh)
      [ -x "$f" ] && . "$f"
      ;;
    *.sh)
      [ -x "$f" ] && "$f"
      ;;
  esac
done

# Reload jest tani i bezpieczny (nie zrywa istniejących połączeń) nawet gdy
# certyfikat się nie zmienił, więc robimy to bezwarunkowo co 12h zamiast
# wykrywać zmianę pliku.
(
  while :; do
    sleep 12h
    nginx -s reload
  done
) &

exec nginx -g "daemon off;"
