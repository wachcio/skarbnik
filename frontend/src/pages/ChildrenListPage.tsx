import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { Child } from "../lib/types";
import { ChildForm, type ChildInput } from "../components/ChildForm";

// Zakres znaków diakrytycznych po dekompozycji NFD (np. "ż" → "z" + "˙") —
// zapisany przez String.fromCharCode (nie literalnym znakiem w regexie),
// tak samo jak w backend/src/services/export.service.ts, żeby uniknąć
// przypadkowego uszkodzenia bajtów przy edycji pliku.
const COMBINING_DIACRITICS = new RegExp("[" + String.fromCharCode(0x0300) + "-" + String.fromCharCode(0x036f) + "]", "g");

/** Bez ogonków i bez rozróżniania wielkości liter, żeby wyszukiwanie
 * działało niezależnie od tego, jak ktoś wpisze polskie znaki (np.
 * "zabka" trafia też na "Żabka"). */
function normalizeForSearch(text: string): string {
  return text.normalize("NFD").replace(COMBINING_DIACRITICS, "").toLowerCase();
}

export function ChildrenListPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [query, setQuery] = useState("");
  const isAdmin = user?.role === "ADMIN";

  async function load() {
    const res = await apiFetch("/children");
    if (res.ok) {
      setChildren(await res.json());
    } else {
      setError(t("children.loadError"));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(data: ChildInput) {
    const res = await apiFetch("/children", { method: "POST", body: JSON.stringify(data) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? t("children.addError"));
    }
    setShowAddForm(false);
    await load();
  }

  const normalizedQuery = normalizeForSearch(query.trim());
  const filteredChildren = children
    ? normalizedQuery
      ? children.filter((child) => normalizeForSearch(`${child.firstName} ${child.lastName}`).includes(normalizedQuery))
      : children
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>{t("children.title")}</h1>
        {isAdmin && (
          <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? t("common.cancel") : t("children.addChild")}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card form-card">
          <ChildForm onSubmit={handleCreate} submitLabel={t("children.addChild")} />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {children === null && !error && <p className="muted">{t("common.loading")}</p>}

      {children?.length === 0 && (
        <p className="muted">{isAdmin ? t("children.emptyAdmin") : t("children.emptyParent")}</p>
      )}

      {children && children.length > 0 && (
        <input
          type="search"
          className="input"
          style={{ marginBottom: "0.85rem" }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("children.searchPlaceholder")}
          aria-label={t("children.searchPlaceholder")}
        />
      )}

      {children && children.length > 0 && filteredChildren?.length === 0 && (
        <p className="muted">{t("children.noSearchResults")}</p>
      )}

      <ul className="list">
        {filteredChildren?.map((child) => (
          <li key={child.id}>
            <Link to={`/children/${child.id}`} className="list-row">
              {/* Lista jest posortowana po nazwisku (patrz backend) — wyświetlamy
                  więc "Nazwisko Imię", inaczej alfabetyczny porządek byłby
                  niewidoczny na pierwszy rzut oka (imiona idą w przypadkowej
                  kolejności). */}
              <span className="list-row-title">
                {child.lastName} {child.firstName}
              </span>
              <span className="list-row-chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
