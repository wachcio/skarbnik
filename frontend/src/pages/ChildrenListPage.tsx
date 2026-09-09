import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Child } from "../lib/types";
import { ChildForm, type ChildInput } from "../components/ChildForm";

export function ChildrenListPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  async function load() {
    const res = await apiFetch("/children");
    if (res.ok) {
      setChildren(await res.json());
    } else {
      setError("Nie udało się pobrać listy dzieci.");
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
      throw new Error(body.error ?? "Nie udało się dodać dziecka.");
    }
    setShowAddForm(false);
    await load();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dzieci</h1>
        {isAdmin && (
          <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Anuluj" : "Dodaj dziecko"}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="card form-card">
          <ChildForm onSubmit={handleCreate} submitLabel="Dodaj dziecko" />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {children === null && !error && <p className="muted">Wczytywanie…</p>}

      {children?.length === 0 && (
        <p className="muted">
          {isAdmin ? "Brak dzieci w bazie — dodaj pierwsze powyżej." : "Nie masz jeszcze przypisanych dzieci."}
        </p>
      )}

      <ul className="list">
        {children?.map((child) => (
          <li key={child.id}>
            <Link to={`/children/${child.id}`} className="list-row">
              <span className="list-row-title">
                {child.firstName} {child.lastName}
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
