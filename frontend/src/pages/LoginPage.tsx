import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { AppHeader } from "../components/AppHeader";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/", { replace: true });
  }

  return (
    <div className="shell">
      <AppHeader />

      <main className="page page-narrow">
        <form onSubmit={handleSubmit} className="form">
          <h1>{t("login.title")}</h1>
          <label className="field">
            {t("login.email")}
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="field">
            {t("login.password")}
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? t("login.submitting") : t("login.submit")}
          </button>
        </form>

        <p className="muted footnote">
          <a href="/public">{t("login.publicLink")}</a>
        </p>
      </main>
    </div>
  );
}
