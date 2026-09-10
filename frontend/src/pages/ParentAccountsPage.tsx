import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
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
  const { t } = useLanguage();
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
    else setError(t("parentAccounts.loadError"));
    if (childrenRes.ok) setChildren(await childrenRes.json());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      await load();
    } else {
      setError(t("parentAccounts.deleteError"));
      setDeletingId(null);
    }
  }

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/settings")}>
        {t("parentAccounts.backToSettings")}
      </button>

      <div className="page-header">
        <h1>{t("parentAccounts.title")}</h1>
        <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? t("common.cancel") : t("parentAccounts.addAccount")}
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
      {accounts === null && !error && <p className="muted">{t("common.loading")}</p>}
      {accounts?.length === 0 && <p className="muted">{t("parentAccounts.empty")}</p>}

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
                  {editingId === account.id ? t("common.cancel") : t("common.edit")}
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setResettingId(account.id)}>
                  {t("parentAccounts.resetPassword")}
                </button>
                <button type="button" className="btn btn-danger btn-small" onClick={() => setDeletingId(account.id)}>
                  {t("common.delete")}
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
                  ? t("parentAccounts.childrenPrefix", {
                      names: account.children.map((c) => `${c.firstName} ${c.lastName}`).join(", "),
                    })
                  : t("parentAccounts.noChildrenAssigned")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {deletingId && (
        <ConfirmDialog
          title={t("parentAccounts.deleteTitle")}
          message={t("parentAccounts.deleteMessage")}
          confirmLabel={t("common.delete")}
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
  const { t } = useLanguage();
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
        throw new Error(body.error ?? t("parentAccounts.createError"));
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="field">
        {t("parentAccounts.parentName")}
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <label className="field">
        {t("parentAccounts.emailLogin")}
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="field">
        {t("parentAccounts.initialPassword")}
        <input
          className="input"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("parentAccounts.passwordPlaceholder")}
          required
        />
      </label>
      <div className="field">
        {t("parentAccounts.children")}
        {children.length === 0 ? (
          <p className="muted footnote-tight">{t("parentAccounts.noChildrenInDb")}</p>
        ) : (
          <div className="checkbox-list">
            {/* Posortowane po nazwisku (patrz /api/children) — "Nazwisko Imię"
                zamiast "Imię Nazwisko", żeby ten porządek było widać. */}
            {children.map((child) => (
              <label key={child.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={childIds.includes(child.id)}
                  onChange={() => toggleChild(child.id)}
                />
                {child.lastName} {child.firstName}
              </label>
            ))}
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? t("parentAccounts.creating") : t("parentAccounts.createAccount")}
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
  const { t } = useLanguage();
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
        throw new Error(body.error ?? t("parentAccounts.saveChangesError"));
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form" style={{ marginTop: "0.75rem" }}>
      <label className="field">
        {t("parentAccounts.parentName")}
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <div className="field">
        {t("parentAccounts.children")}
        <div className="checkbox-list">
          {children.map((child) => (
            <label key={child.id} className="checkbox-row">
              <input type="checkbox" checked={childIds.includes(child.id)} onChange={() => toggleChild(child.id)} />
              {child.lastName} {child.firstName}
            </label>
          ))}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? t("common.saving") : t("parentAccounts.saveChanges")}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useLanguage();
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
        throw new Error(body.error ?? t("parentAccounts.resetError"));
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{t("parentAccounts.resetPasswordTitle")}</h2>
        {done ? (
          <>
            <p className="muted">{t("parentAccounts.resetDone")}</p>
            <div className="form-actions">
              <button type="button" className="btn" onClick={onClose}>
                {t("common.close")}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              {t("parentAccounts.newPassword")}
              <input
                className="input"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("parentAccounts.passwordPlaceholder")}
                required
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <div className="form-actions">
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? t("common.saving") : t("parentAccounts.changePassword")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t("common.cancel")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
