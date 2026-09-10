import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { Category } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "../components/SemesterSelect";
import { ConfirmDialog } from "../components/ConfirmDialog";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function CategoriesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [savingAmountFor, setSavingAmountFor] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  async function load() {
    const res = await apiFetch("/categories");
    if (res.ok) setCategories(await res.json());
    else setError(t("categories.loadError"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function targetFor(category: Category): number {
    const target = category.targets.find((t) => t.semesterId === selectedId);
    return target ? Number(target.amount) : 0;
  }

  function draftFor(category: Category): string {
    if (category.id in amountDrafts) return amountDrafts[category.id];
    return String(targetFor(category));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name: newName }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("categories.addError"));
      }
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setCreating(false);
    }
  }

  function startEditingName(category: Category) {
    setEditingNameId(category.id);
    setNameDraft(category.name);
    setError(null);
  }

  async function handleSaveName(id: string) {
    setSavingName(true);
    setError(null);
    try {
      const res = await apiFetch(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: nameDraft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("categories.saveNameError"));
      }
      setEditingNameId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSavingName(false);
    }
  }

  async function handleArchive(id: string) {
    const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setArchivingId(null);
      await load();
    } else {
      setError(t("categories.archiveError"));
      setArchivingId(null);
    }
  }

  async function handleSaveAmount(category: Category) {
    if (!selectedId) return;
    setSavingAmountFor(category.id);
    setError(null);
    try {
      const draft = draftFor(category);
      const res = await apiFetch(`/categories/${category.id}/targets/${selectedId}`, {
        method: "PUT",
        body: JSON.stringify({ amount: Number(draft) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t("categories.saveAmountError"));
      }
      await load();
      setAmountDrafts((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSavingAmountFor(null);
    }
  }

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/settings")}>
        {t("categories.backToSettings")}
      </button>

      <div className="page-header">
        <h1>{t("categories.title")}</h1>
        {semesters && selectedId && (
          <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
        )}
      </div>

      <form onSubmit={handleCreate} className="form-row inline-form">
        <label className="field" style={{ flex: "1 1 220px" }}>
          {t("categories.newCategory")}
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("categories.newCategoryPlaceholder")}
            required
          />
        </label>
        <button type="submit" className="btn" disabled={creating} style={{ alignSelf: "flex-end" }}>
          {creating ? t("categories.adding") : t("categories.add")}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {categories === null && !error && <p className="muted">{t("common.loading")}</p>}
      {categories?.length === 0 && <p className="muted">{t("categories.empty")}</p>}

      <ul className="list stack-card">
        {categories?.map((category) => (
          <li key={category.id} className="card category-item">
            <div className="category-item-header">
              {editingNameId === category.id ? (
                <div className="amount-row" style={{ flex: "1 1 220px" }}>
                  <input
                    className="input"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={savingName}
                    onClick={() => handleSaveName(category.id)}
                  >
                    {t("common.save")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    disabled={savingName}
                    onClick={() => setEditingNameId(null)}
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <strong>{category.name}</strong>
              )}
              <div className="button-group">
                {editingNameId !== category.id && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-small"
                    onClick={() => startEditingName(category)}
                  >
                    {t("categories.rename")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger btn-small"
                  onClick={() => setArchivingId(category.id)}
                >
                  {t("categories.archive")}
                </button>
              </div>
            </div>
            <label className="field">
              {t("categories.defaultAmountFor", {
                semester: semesters?.find((s) => s.id === selectedId)?.label ?? t("categories.selectedSemesterFallback"),
              })}
              <div className="amount-row">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={draftFor(category)}
                  onChange={(e) =>
                    setAmountDrafts((prev) => ({ ...prev, [category.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingAmountFor === category.id}
                  onClick={() => handleSaveAmount(category)}
                >
                  {t("common.save")}
                </button>
              </div>
            </label>
            <p className="muted footnote-tight">{t("categories.currently", { amount: currency.format(targetFor(category)) })}</p>
          </li>
        ))}
      </ul>

      {archivingId && (
        <ConfirmDialog
          title={t("categories.archiveTitle")}
          message={t("categories.archiveMessage")}
          confirmLabel={t("categories.archive")}
          onConfirm={() => handleArchive(archivingId)}
          onCancel={() => setArchivingId(null)}
        />
      )}
    </div>
  );
}
