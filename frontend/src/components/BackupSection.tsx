import { useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog } from "./ConfirmDialog";

interface ImportResult {
  restoredCounts: Record<string, number>;
  temporaryPasswords: Array<{ email: string; temporaryPassword: string }>;
}

export function BackupSection() {
  const { logout } = useAuth();
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
        throw new Error(body.error ?? "Nie udało się zaimportować kopii zapasowej.");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieprawidłowy plik kopii zapasowej.");
    } finally {
      setImporting(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (result) {
    return (
      <div className="card stack-card">
        <h2>Import zakończony</h2>
        <p className="muted footnote-tight" style={{ marginTop: 0 }}>
          Przywrócono: {Object.entries(result.restoredCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}
        </p>
        <p className="muted footnote-tight">
          Każde konto dostało nowe, tymczasowe hasło (oryginalne nie są przechowywane w kopii). Przekaż je
          osobom ręcznie:
        </p>
        <ul className="payment-list">
          {result.temporaryPasswords.map((p) => (
            <li key={p.email} className="payment-row">
              <span>{p.email}</span>
              <code>{p.temporaryPassword}</code>
            </li>
          ))}
        </ul>
        <div className="form-actions" style={{ marginTop: "0.75rem" }}>
          <button type="button" className="btn" onClick={() => logout()}>
            Zaloguj się ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card stack-card">
      <h2>Kopia zapasowa</h2>
      <p className="muted footnote-tight" style={{ marginTop: 0 }}>
        Pełny eksport/import wszystkich danych do jednego pliku JSON. Hasła nigdy nie są eksportowane — po
        imporcie każde konto dostaje nowe, tymczasowe.
      </p>

      <div className="form-actions">
        <a className="btn btn-secondary" href="/api/backup/export">
          Eksportuj dane
        </a>
        <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
          Importuj z pliku…
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
          title="Zastąpić wszystkie dane?"
          message={`Import pliku "${pendingFile.name}" NIEODWRACALNIE zastąpi całą bieżącą bazę danych (dzieci, wpłaty, kategorie, konta). Zostaniesz wylogowany po zakończeniu.`}
          confirmLabel={importing ? "Importowanie…" : "Tak, zastąp wszystko"}
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
