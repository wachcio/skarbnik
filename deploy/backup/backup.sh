#!/bin/sh
# Pętla automatycznych kopii zapasowych bazy MySQL — patrz usługa `backup`
# w docker-compose.yml. Pełny zrzut SQL (mysqldump), nie eksport JSON z UI
# appki (Ustawienia -> Kopia zapasowa): mysqldump obejmuje WSZYSTKO co jest
# w bazie (łącznie z tabelą `sessions` i `audit_logs`, których eksport JSON
# świadomie nie rusza) i da się przywrócić jednym `mysql < dump.sql` bez
# udziału samej appki — to jest kopia na wypadek katastrofy, nie funkcja
# do przenoszenia danych między appkami.
#
# Częstotliwość: BACKUP_INTERVAL_HOURS w .env (domyślnie 24). Retencja:
# BACKUP_RETENTION_DAYS w .env (domyślnie 14) — patrz niżej.
set -eu

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Walidacja: jeśli ktoś wpisze do .env coś niepoprawnego (puste, litery,
# zero, ujemną liczbę), wracamy do bezpiecznego domyślnego 24h zamiast
# przekazać śmieciową wartość do `sleep` (co skończyłoby się błędem i
# ubiciem całej pętli backupów).
case "${BACKUP_INTERVAL_HOURS:-24}" in
  ''|*[!0-9]*|0)
    INTERVAL_HOURS=24
    ;;
  *)
    INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
    ;;
esac

backup_once() {
  timestamp="$(date +%Y%m%d-%H%M%S)"
  outfile="/backups/skarbnik-${timestamp}.sql.gz"
  dumpfile="/tmp/skarbnik-${timestamp}.sql"
  errfile="/tmp/skarbnik-${timestamp}.err"

  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Tworzę kopię zapasową -> $outfile"

  # UWAGA: celowo NIE "mysqldump | gzip > outfile" w jednym poleceniu —
  # w potoku status wyjścia `if` odzwierciedla ostatnie polecenie (gzip),
  # nie mysqldump, więc awaria samego mysqldump (np. baza jeszcze nie
  # gotowa) zostałaby po cichu zamaskowana jako "sukces" z pustym/śmieciowym
  # plikiem wynikowym (zweryfikowane: to realnie się zdarzyło przy
  # pierwszej wersji tego skryptu). Zrzut i kompresja to więc dwa osobne
  # kroki, każdy ze sprawdzonym własnym statusem.
  #
  # --single-transaction: spójny zrzut bez blokowania tabel InnoDB na czas
  # dumpa (appka może w tym czasie normalnie działać).
  if mysqldump \
      -h "$MYSQL_HOST" \
      -u "$MYSQL_USER" \
      -p"$MYSQL_PASSWORD" \
      --single-transaction \
      --routines \
      --triggers \
      "$MYSQL_DATABASE" > "$dumpfile" 2> "$errfile"; then
    gzip -c "$dumpfile" > "$outfile"
    rm -f "$dumpfile" "$errfile"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK ($(du -h "$outfile" | cut -f1))"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] BŁĄD podczas tworzenia kopii zapasowej:" >&2
    cat "$errfile" >&2
    rm -f "$dumpfile" "$errfile"
    return 1
  fi

  # Rotacja: usuwamy kopie starsze niż RETENTION_DAYS dni. `|| true`, żeby
  # awaria rotacji (np. brak uprawnień do jednego pliku) nie ubiła pętli —
  # ważniejsze jest, żeby kolejne backupy dalej powstawały.
  find /backups -name 'skarbnik-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
}

trap 'echo "Zatrzymuję pętlę backupów."; exit 0' TERM INT

# Przy starcie kontenera MySQL bywa jeszcze chwilę niegotowy do połączeń
# z sieci Dockera mimo że `depends_on: condition: service_healthy` już
# przeszło (zweryfikowane: to realnie się zdarzyło) — kilka krótkich
# ponowień na START pętli, żeby jeden pechowy moment nie kosztował całej
# doby do następnej próby.
first_attempt=true
while :; do
  if [ "$first_attempt" = "true" ]; then
    attempt=1
    while ! backup_once; do
      if [ "$attempt" -ge 5 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Rezygnuję po 5 próbach, spróbuję ponownie za ${INTERVAL_HOURS}h." >&2
        break
      fi
      attempt=$((attempt + 1))
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ponawiam za 10s (próba $attempt/5)..." >&2
      sleep 10
    done
    first_attempt=false
  else
    backup_once || echo "[$(date '+%Y-%m-%d %H:%M:%S')] Ponowię próbę za ${INTERVAL_HOURS}h." >&2
  fi
  sleep "${INTERVAL_HOURS}h" &
  wait "$!"
done
