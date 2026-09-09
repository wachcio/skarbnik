import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";

export function LoginPage() {
  const { login } = useAuth();
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
    navigate("/children", { replace: true });
  }

  return (
    <div className="shell">
      <header className="app-header">
        <strong>Skarbnik Przedszkolny</strong>
        <ThemeToggle />
      </header>

      <main className="page page-narrow">
        <form onSubmit={handleSubmit} className="form">
          <h1>Logowanie</h1>
          <label className="field">
            E-mail
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
            Hasło
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
            {submitting ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        <p className="muted footnote">
          <a href="/public">Zobacz stan zbiórki bez logowania →</a>
        </p>
      </main>
    </div>
  );
}
