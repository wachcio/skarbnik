// Stała strefa (nie zależna od TZ kontenera, który domyślnie jest UTC) —
// appka dla jednej, konkretnej placówki, nie wielostrefowy serwis.
// Patrz routes/health.routes.ts i services/export.service.ts.

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Warsaw",
});

const filenamePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Czytelny czas polski, do wyświetlenia człowiekowi (np. "9 wrz 2026, 14:32:05"). */
export function formatWarsawDateTime(date: Date = new Date()): string {
  return dateTimeFormatter.format(date);
}

/** Znacznik czasu do nazwy pliku, np. "2026-09-09-1432" — sortowalny, bez spacji/dwukropków. */
export function warsawTimestampForFilename(date: Date = new Date()): string {
  const parts = filenamePartsFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}${get("minute")}`;
}
