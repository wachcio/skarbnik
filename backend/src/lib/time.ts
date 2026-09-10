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

const monthKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
});

const monthLabelFormatter = new Intl.DateTimeFormat("pl-PL", {
  timeZone: "Europe/Warsaw",
  month: "long",
  year: "numeric",
});

/** Sortowalny klucz miesiąca w czasie polskim, np. "2026-09" — do grupowania
 * wydatków wg miesiąca niezależnie od strefy czasowej kontenera. */
export function warsawMonthKey(date: Date): string {
  const parts = monthKeyFormatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}`;
}

/** Czytelna nazwa miesiąca po polsku, np. "Wrzesień 2026". */
export function warsawMonthLabel(date: Date): string {
  const label = monthLabelFormatter.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}
