import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { AuditAction, AuditLogEntry } from "../lib/types";

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "medium" });

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Child: "Dziecko",
  User: "Konto",
  Category: "Kategoria",
  CategoryTarget: "Kwota docelowa kategorii",
  ChildCategoryAmount: "Nadpisanie kwoty dla dziecka",
  Payment: "Wpłata",
  Expense: "Wydatek",
  Setting: "Ustawienia",
  Backup: "Kopia zapasowa",
};

const ENTITY_TYPE_OPTIONS = Object.keys(ENTITY_TYPE_LABELS);

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Utworzono",
  UPDATE: "Zaktualizowano",
  DELETE: "Usunięto",
  LOCKOUT: "Blokada logowania",
};

const ACTION_PILL_CLASS: Record<AuditAction, string> = {
  CREATE: "status-pill success",
  UPDATE: "status-pill neutral",
  DELETE: "status-pill danger",
  LOCKOUT: "status-pill danger",
};

function entityLabel(entityType: string): string {
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export function AuditLogPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (entityType) params.set("entityType", entityType);
      if (action) params.set("action", action);
      if (cursor) params.set("cursor", cursor);
      const res = await apiFetch(`/audit-log?${params.toString()}`);
      if (!res.ok) throw new Error("Nie udało się pobrać logu audytowego.");
      const data = await res.json();
      setEntries((prev) => (cursor ? [...prev, ...data.entries] : data.entries));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, action]);

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;

  return (
    <div>
      <div className="page-header">
        <h1>Log audytowy</h1>
      </div>

      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "1rem" }}>
        Historia wszystkich zmian w appce — kto, co i kiedy zrobił. Najnowsze na górze.
      </p>

      <div className="form-row" style={{ marginBottom: "1rem" }}>
        <label className="field">
          Typ
          <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">Wszystkie</option>
            {ENTITY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {ENTITY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Akcja
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Wszystkie</option>
            {(Object.keys(ACTION_LABELS) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && entries.length === 0 && <p className="muted">Wczytywanie…</p>}
      {!loading && entries.length === 0 && !error && <p className="muted">Brak wpisów spełniających kryteria.</p>}

      <ul className="list stack-card">
        {entries.map((entry) => (
          <li key={entry.id} className="card category-item">
            <div className="category-item-header">
              <div>
                <strong>{entityLabel(entry.entityType)}</strong>
                <div className="muted footnote-tight" style={{ marginTop: "0.15rem" }}>
                  {dateTimeFormatter.format(new Date(entry.createdAt))} · {entry.performedByLabel}
                </div>
              </div>
              <span className={ACTION_PILL_CLASS[entry.action]}>{ACTION_LABELS[entry.action]}</span>
            </div>

            {(entry.dataBefore !== null || entry.dataAfter !== null) && (
              <details style={{ marginTop: "0.6rem" }}>
                <summary className="muted footnote-tight" style={{ cursor: "pointer" }}>
                  Szczegóły
                </summary>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {entry.dataBefore !== null && entry.dataBefore !== undefined && (
                    <div>
                      <p className="muted footnote-tight" style={{ margin: 0 }}>
                        Przed:
                      </p>
                      <pre className="audit-json">{JSON.stringify(entry.dataBefore, null, 2)}</pre>
                    </div>
                  )}
                  {entry.dataAfter !== null && entry.dataAfter !== undefined && (
                    <div>
                      <p className="muted footnote-tight" style={{ margin: 0 }}>
                        Po:
                      </p>
                      <pre className="audit-json">{JSON.stringify(entry.dataAfter, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </li>
        ))}
      </ul>

      {nextCursor && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: "1rem" }}
          onClick={() => load(nextCursor)}
          disabled={loading}
        >
          {loading ? "Wczytywanie…" : "Wczytaj więcej"}
        </button>
      )}
    </div>
  );
}
