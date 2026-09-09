import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Child } from "../lib/types";
import { ChildForm, type ChildInput } from "../components/ChildForm";
import { ConfirmDialog } from "../components/ConfirmDialog";

export function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    apiFetch(`/children/${id}`).then(async (res) => {
      if (res.ok) {
        setChild(await res.json());
      } else {
        setError("Nie znaleziono dziecka albo brak uprawnień do jego podglądu.");
      }
    });
  }, [id]);

  async function handleUpdate(data: ChildInput) {
    const res = await apiFetch(`/children/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Nie udało się zapisać zmian.");
    }
    setChild(await res.json());
    setEditing(false);
  }

  async function handleDelete() {
    const res = await apiFetch(`/children/${id}`, { method: "DELETE" });
    if (res.ok) {
      navigate("/children", { replace: true });
    } else {
      setError("Nie udało się usunąć dziecka.");
      setConfirmingDelete(false);
    }
  }

  if (error) {
    return (
      <div>
        <button type="button" className="link-back" onClick={() => navigate("/children")}>
          ‹ Wróć do listy
        </button>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!child) return <p className="muted">Wczytywanie…</p>;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/children")}>
        ‹ Wróć do listy
      </button>

      <div className="page-header">
        <h1>
          {child.firstName} {child.lastName}
        </h1>
        {isAdmin && !editing && (
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edytuj
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              Usuń
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="card form-card">
          <ChildForm
            initial={{
              firstName: child.firstName,
              lastName: child.lastName,
              parentContactEmail: child.parentContactEmail ?? "",
              parentContactPhone: child.parentContactPhone ?? "",
              notes: child.notes ?? "",
            }}
            submitLabel="Zapisz zmiany"
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="card">
          <dl className="detail-fields">
            <div>
              <dt>E-mail rodzica</dt>
              <dd>{child.parentContactEmail || "—"}</dd>
            </div>
            <div>
              <dt>Telefon</dt>
              <dd>{child.parentContactPhone || "—"}</dd>
            </div>
            <div>
              <dt>Notatki</dt>
              <dd>{child.notes || "—"}</dd>
            </div>
          </dl>
        </div>
      )}

      <p className="muted footnote">Składki i wpłaty dla tego dziecka — w kolejnym etapie prac.</p>

      {confirmingDelete && (
        <ConfirmDialog
          title="Usunąć dziecko?"
          message={`Na pewno usunąć ${child.firstName} ${child.lastName}? Tej operacji nie można cofnąć — historia wpłat trafi do logu audytowego, ale zniknie z bieżących widoków.`}
          confirmLabel="Usuń"
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
