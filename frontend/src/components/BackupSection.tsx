import { useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ConfirmDialog } from "./ConfirmDialog";

interface ImportResult {
  restoredCounts: Record<string, number>;
  temporaryPasswords: Array<{ email: string; temporaryPassword: string }>;
}

const filenameTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Znacznik czasu do nazwy pliku w czasie polskim, np. "2026-09-10-1432"
 * — ten sam wzorzec co w nazwach eksportów generowanych przez backend
 * (patrz backend/src/lib/time.ts), żeby nie zależeć od strefy przeglądarki. */
function warsawTimestampForFilename(): string {
  const parts = filenameTimestampFormatter.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}-${get("hour")}${get("minute")}`;
}

/** Lista tymczasowych haseł istnieje tylko na ekranie po imporcie (backend
 * jej nie przechowuje) — pobranie jej jako pliku ułatwia przekazanie
 * wielu kont naraz, zamiast przepisywania z ekranu jedno po drugim.
 * Średnik jako separator (nie przecinek) — zgodnie z polskim Excelem,
 * BOM na początku dla poprawnych polskich znaków po otwarciu w Excelu. */
function downloadTemporaryPasswords(
  temporaryPasswords: Array<{ email: string; temporaryPassword: string }>,
  csvHeader: string
) {
  const rows = [csvHeader, ...temporaryPasswords.map((p) => `${p.email};${p.temporaryPassword}`)];
  const csv = "\uFEFF" + rows.join("\r\n") + "\r\n";
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `skarbnik-tymczasowe-hasla-${warsawTimestampForFilename()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BackupSection() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPendingFile(file);
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setImporting(true);
    setError(null);
    try {
      const text = await pendingFile.text();
      const payload = JSON.parse(text);
      const res = await apiFetch("/backup/import", { method: "POST", body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("backup.importError"));
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("backup.invalidFile"));
    } finally {
      setImporting(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (result) {
    return (
      <div className="card stack-card">
        <h2>{t("backup.doneTitle")}</h2>
        <p className="muted footnote-tight" style={{ marginTop: 0 }}>
          {t("backup.restored", {
            summary: Object.entries(result.restoredCounts).map(([k, v]) => `${k}: ${v}`).join(", "),
          })}
        </p>
        <p className="muted footnote-tight">{t("backup.newPasswordsInfo")}</p>
        <ul className="payment-list">
          {result.temporaryPasswords.map((p) => (
            <li key={p.email} className="payment-row">
              <span>{p.email}</span>
              <code>{p.temporaryPassword}</code>
            </li>
          ))}
        </ul>
        <div className="form-actions" style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => downloadTemporaryPasswords(result.temporaryPasswords, t("backup.csvHeader"))}
          >
            {t("backup.downloadCsv")}
          </button>
          <button type="button" className="btn" onClick={() => logout()}>
            {t("backup.loginAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack-card">
      <h2>{t("backup.title")}</h2>
      <p className="muted footnote-tight" style={{ marginTop: 0 }}>
        {t("backup.description")}
      </p>

      <div className="form-actions">
        <a className="btn btn-secondary" href="/api/backup/export">
          {t("backup.exportData")}
        </a>
        <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          {t("backup.importFromFile")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          style={{ display: "none" }}
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {pendingFile && (
        <ConfirmDialog
          title={t("backup.confirmTitle")}
          message={t("backup.confirmMessage", { filename: pendingFile.name })}
          confirmLabel={importing ? t("backup.importing") : t("backup.confirmYes")}
          onConfirm={handleConfirmImport}
          onCancel={() => {
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />
      )}
    </div>
  );
}
