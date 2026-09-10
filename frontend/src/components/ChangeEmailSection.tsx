import { useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

/** Samodzielna zmiana własnego e-maila (login) — dostępna dla każdego
 * zalogowanego konta, na tych samych zasadach co zmiana hasła: wymaga
 * podania obecnego hasła (patrz backend/src/routes/auth.routes.ts). */
export function ChangeEmailSection() {
  const { user, refreshUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    setSubmitting(true);
    try {
      const res = await apiFetch("/auth/change-email", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się zmienić e-maila.");
      }
      await refreshUser();
      setSuccess(true);
      setCurrentPassword("");
      setNewEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack-card">
      <h2>Zmiana e-maila</h2>
      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        Obecny e-mail (login): {user?.email}
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          Obecne hasło
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          Nowy e-mail
          <input
            className="input"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">E-mail został zmieniony.</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zmień e-mail"}
          </button>
        </div>
      </form>
    </div>
  );
}
