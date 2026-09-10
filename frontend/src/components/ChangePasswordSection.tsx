import { useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

/** Samodzielna zmiana własnego hasła — dostępna dla każdego zalogowanego
 * konta (admin i rodzic), w odróżnieniu od resetu hasła INNEJ osoby,
 * który robi wyłącznie admin z poziomu /users. Wymaga podania obecnego
 * hasła (patrz backend/src/routes/auth.routes.ts). */
export function ChangePasswordSection() {
  const { t } = useLanguage();
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
      setError(t("changePassword.mismatch"));
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
        throw new Error(body.error ?? t("changePassword.error"));
      }
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card stack-card">
      <h2>{t("changePassword.title")}</h2>
      <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        {t("changePassword.description")}
      </p>
      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          {t("changePassword.currentPassword")}
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
          {t("changePassword.newPassword")}
          <input
            className="input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t("changePassword.newPasswordPlaceholder")}
            required
          />
        </label>
        <label className="field">
          {t("changePassword.confirmPassword")}
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
        {success && <p className="success-text">{t("changePassword.success")}</p>}
        <div className="form-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? t("common.saving") : t("changePassword.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
