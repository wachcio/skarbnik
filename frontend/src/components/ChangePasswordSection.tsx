import { useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";

/** Samodzielna zmiana własnego hasła — dostępna dla każdego zalogowanego
 * konta (admin i rodzic), w odróżnieniu od resetu hasła INNEJ osoby,
 * który robi wyłącznie admin z poziomu /users. Wymaga podania obecnego
 * hasła (patrz backend/src/routes/auth.routes.ts). */
export function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Nowe hasła nie są identyczne.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się zmienić hasła.");
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack-card">
      <h2>Zmiana hasła</h2>
      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        Zmień hasło do swojego konta.
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
          Nowe hasło
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="min. 10 znaków, 3 z 4: małe/wielkie litery, cyfry, znaki specjalne"
            required
          />
        </label>
        <label className="field">
          Powtórz nowe hasło
          <input
            className="input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">Hasło zostało zmienione.</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? "Zapisywanie…" : "Zmień hasło"}
          </button>
        </div>
      </form>
    </div>
  );
}
