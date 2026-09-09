import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import type { Category } from "../lib/types";
import { useAuth } from "../context/AuthContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "../components/SemesterSelect";
import { ConfirmDialog } from "../components/ConfirmDialog";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function CategoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [savingAmountFor, setSavingAmountFor] = useState<string | null>(null);

  async function load() {
    const res = await apiFetch("/categories");
    if (res.ok) setCategories(await res.json());
    else setError("Nie udało się pobrać kategorii.");
  }

  useEffect(() => {
    load();
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
        throw new Error(body.error ?? "Nie udało się dodać kategorii.");
      }
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setCreating(false);
    }
  }

  async function handleArchive(id: string) {
    const res = await apiFetch(`/categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setArchivingId(null);
      await load();
    } else {
      setError("Nie udało się zarchiwizować kategorii.");
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
        throw new Error(body.error ?? "Nie udało się zapisać kwoty.");
      }
      await load();
      setAmountDrafts((prev) => {
        const next = { ...prev };
        delete next[category.id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSavingAmountFor(null);
    }
  }

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/settings")}>
        ‹ Wróć do ustawień
      </button>

      <div className="page-header">
        <h1>Kategorie składek</h1>
        {semesters && selectedId && (
          <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
        )}
      </div>

      <form onSubmit={handleCreate} className="form-row inline-form">
        <label className="field" style={{ flex: "1 1 220px" }}>
          Nowa kategoria
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="np. Wycieczka do ZOO"
            required
          />
        </label>
        <button type="submit" className="btn" disabled={creating} style={{ alignSelf: "flex-end" }}>
          {creating ? "Dodawanie…" : "Dodaj"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
      {categories === null && !error && <p className="muted">Wczytywanie…</p>}
      {categories?.length === 0 && <p className="muted">Brak kategorii — dodaj pierwszą powyżej.</p>}

      <ul className="list stack-card">
        {categories?.map((category) => (
          <li key={category.id} className="card category-item">
            <div className="category-item-header">
              <strong>{category.name}</strong>
              <button
                type="button"
                className="btn btn-danger btn-small"
                onClick={() => setArchivingId(category.id)}
              >
                Archiwizuj
              </button>
            </div>
            <label className="field">
              Kwota domyślna na {semesters?.find((s) => s.id === selectedId)?.label ?? "wybrany semestr"}
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
                  Zapisz
                </button>
              </div>
            </label>
            <p className="muted footnote-tight">Aktualnie: {currency.format(targetFor(category))}</p>
          </li>
        ))}
      </ul>

      {archivingId && (
        <ConfirmDialog
          title="Zarchiwizować kategorię?"
          message="Kategoria zniknie z listy aktywnych i nie będzie można do niej dodawać nowych wpłat. Historia dotychczasowych wpłat zostanie zachowana w raportach."
          confirmLabel="Archiwizuj"
          onConfirm={() => handleArchive(archivingId)}
          onCancel={() => setArchivingId(null)}
        />
      )}
    </div>
  );
}
