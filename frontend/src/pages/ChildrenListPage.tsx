import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { Child } from "../lib/types";
import { ChildForm, type ChildInput } from "../components/ChildForm";

export function ChildrenListPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
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

      <ul className="list">
        {children?.map((child) => (
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
