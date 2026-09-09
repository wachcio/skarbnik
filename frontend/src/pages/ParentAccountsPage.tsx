import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Child } from "../lib/types";

interface ParentAccount {
  id: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "PARENT";
  children: Array<{ id: string; firstName: string; lastName: string }>;
}

export function ParentAccountsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<ParentAccount[] | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    const [accountsRes, childrenRes] = await Promise.all([apiFetch("/users"), apiFetch("/children")]);
    if (accountsRes.ok) setAccounts(await accountsRes.json());
    else setError("Nie udało się pobrać kont rodziców.");
    if (childrenRes.ok) setChildren(await childrenRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      await load();
    } else {
      setError("Nie udało się usunąć konta.");
      setDeletingId(null);
    }
  }

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/settings")}>
        ‹ Wróć do ustawień
      </button>

      <div className="page-header">
        <h1>Konta rodziców</h1>
        <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? "Anuluj" : "Dodaj konto"}
        </button>
      </div>

      {showAddForm && children && (
        <div className="card form-card">
          <AddAccountForm
            children={children}
            onDone={async () => {
              setShowAddForm(false);
              await load();
            }}
          />
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
      {accounts === null && !error && <p className="muted">Wczytywanie…</p>}
      {accounts?.length === 0 && <p className="muted">Brak kont rodziców — dodaj pierwsze powyżej.</p>}

      <ul className="list">
        {accounts?.map((account) => (
          <li key={account.id} className="card category-item">
            <div className="category-item-header">
              <div>
                <strong>{account.displayName}</strong>
                <div className="muted footnote-tight" style={{ marginTop: "0.15rem" }}>
                  {account.email}
                </div>
              </div>
              <div className="button-group">
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => setEditingId(editingId === account.id ? null : account.id)}
                >
                  {editingId === account.id ? "Anuluj" : "Edytuj"}
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setResettingId(account.id)}>
                  Reset hasła
                </button>
                <button type="button" className="btn btn-danger btn-small" onClick={() => setDeletingId(account.id)}>
                  Usuń
                </button>
              </div>
            </div>

            {editingId === account.id && children ? (
              <EditAccountForm
                account={account}
                children={children}
                onDone={async () => {
                  setEditingId(null);
                  await load();
                }}
              />
            ) : (
              <p className="muted footnote-tight" style={{ marginTop: 0 }}>
                {account.children.length > 0
                  ? `Dzieci: ${account.children.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}`
                  : "Brak przypisanych dzieci."}
              </p>
            )}
          </li>
        ))}
      </ul>

      {deletingId && (
        <ConfirmDialog
          title="Usunąć konto?"
          message="Rodzic straci dostęp do panelu. Tej operacji nie można cofnąć."
          confirmLabel="Usuń"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {resettingId && (
        <ResetPasswordDialog userId={resettingId} onClose={() => setResettingId(null)} />
      )}
    </div>
  );
}

interface AddAccountFormProps {
  children: Child[];
  onDone: () => Promise<void>;
}

function AddAccountForm({ children, onDone }: AddAccountFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [childIds, setChildIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleChild(id: string) {
    setChildIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/users", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName, childIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się utworzyć konta.");
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="field">
        Imię i nazwisko rodzica
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <label className="field">
        E-mail (login)
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        Hasło początkowe
        <input
          className="input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="min. 10 znaków, 3 z 4: małe/wielkie litery, cyfry, znaki specjalne"
          required
        />
      </label>
      <div className="field">
        Dzieci
        {children.length === 0 ? (
          <p className="muted footnote-tight">Brak dzieci w bazie — dodaj je najpierw w sekcji Dzieci.</p>
        ) : (
          <div className="checkbox-list">
            {children.map((child) => (
              <label key={child.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={childIds.includes(child.id)}
                  onChange={() => toggleChild(child.id)}
                />
                {child.firstName} {child.lastName}
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Tworzenie…" : "Utwórz konto"}
        </button>
      </div>
    </form>
  );
}

interface EditAccountFormProps {
  account: ParentAccount;
  children: Child[];
  onDone: () => Promise<void>;
}

function EditAccountForm({ account, children, onDone }: EditAccountFormProps) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [childIds, setChildIds] = useState<string[]>(account.children.map((c) => c.id));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleChild(id: string) {
    setChildIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/users/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName, childIds }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się zapisać zmian.");
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" style={{ marginTop: "0.75rem" }}>
      <label className="field">
        Imię i nazwisko rodzica
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <div className="field">
        Dzieci
        <div className="checkbox-list">
          {children.map((child) => (
            <label key={child.id} className="checkbox-row">
              <input type="checkbox" checked={childIds.includes(child.id)} onChange={() => toggleChild(child.id)} />
              {child.firstName} {child.lastName}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Zapisywanie…" : "Zapisz zmiany"}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch(`/users/${userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się zresetować hasła.");
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>Reset hasła</h2>
        {done ? (
          <>
            <p className="muted">
              Hasło zmienione. Przekaż je rodzicowi ręcznie (np. osobiście) — nie jest wysyłane e-mailem.
            </p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={onClose}>
                Zamknij
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              Nowe hasło
              <input
                className="input"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="min. 10 znaków, 3 z 4: małe/wielkie litery, cyfry, znaki specjalne"
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Zapisywanie…" : "Zmień hasło"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Anuluj
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
