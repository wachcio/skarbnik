import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { AuditAction, AuditLogEntry } from "../lib/types";

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "medium" });

const ENTITY_TYPES = ["Child", "User", "Category", "CategoryTarget", "ChildCategoryAmount", "Payment", "Expense", "Setting", "Backup"];
const ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE", "LOCKOUT"];

const ACTION_PILL_CLASS: Record<AuditAction, string> = {
  CREATE: "status-pill success",
  UPDATE: "status-pill neutral",
  DELETE: "status-pill danger",
  LOCKOUT: "status-pill danger",
};

export function AuditLogPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      if (!res.ok) throw new Error(t("auditLog.loadError"));
      const data = await res.json();
      setEntries((prev) => (cursor ? [...prev, ...data.entries] : data.entries));
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
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
        <h1>{t("auditLog.title")}</h1>
      </div>

      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "1rem" }}>
        {t("auditLog.description")}
      </p>

      <div className="form-row" style={{ marginBottom: "1rem" }}>
        <label className="field">
          {t("auditLog.type")}
          <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">{t("auditLog.all")}</option>
            {ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`auditLog.entity.${type}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("auditLog.action")}
          <select className="input" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t("auditLog.all")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`auditLog.action.${a}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading && entries.length === 0 && <p className="muted">{t("common.loading")}</p>}
      {!loading && entries.length === 0 && !error && <p className="muted">{t("auditLog.empty")}</p>}

      <ul className="list stack-card">
        {entries.map((entry) => (
          <li key={entry.id} className="card category-item">
            <div className="category-item-header">
              <div>
                <strong>{t(`auditLog.entity.${entry.entityType}`)}</strong>
                <div className="muted footnote-tight" style={{ marginTop: "0.15rem" }}>
                  {dateTimeFormatter.format(new Date(entry.createdAt))} · {entry.performedByLabel}
                </div>
              </div>
              <span className={ACTION_PILL_CLASS[entry.action]}>{t(`auditLog.action.${entry.action}`)}</span>
            </div>

            {(entry.dataBefore !== null || entry.dataAfter !== null) && (
              <details style={{ marginTop: "0.6rem" }}>
                <summary className="muted footnote-tight" style={{ cursor: "pointer" }}>
                  {t("auditLog.details")}
                </summary>
                <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {entry.dataBefore !== null && entry.dataBefore !== undefined && (
                    <div>
                      <p className="muted footnote-tight" style={{ margin: 0 }}>
                        {t("auditLog.before")}
                      </p>
                      <pre className="audit-json">{JSON.stringify(entry.dataBefore, null, 2)}</pre>
                    </div>
                  )}
                  {entry.dataAfter !== null && entry.dataAfter !== undefined && (
                    <div>
                      <p className="muted footnote-tight" style={{ margin: 0 }}>
                        {t("auditLog.after")}
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
          {loading ? t("common.loading") : t("auditLog.loadMore")}
        </button>
      )}
    </div>
  );
}
