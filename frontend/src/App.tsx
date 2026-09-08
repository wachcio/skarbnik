import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { apiFetch } from "./lib/api";

interface Me {
  id: string;
  email: string;
  role: "ADMIN" | "PARENT";
  displayName: string;
  childIds: string[];
}

type Theme = "light" | "dark" | "system";

function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme | null) ?? "system"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage może być niedostępny (np. tryb prywatny) — pomijamy
    }
  }, [theme]);

  return [theme, setThemeState];
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [me, setMe] = useState<Me | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then(setMe)
      .finally(() => setCheckingSession(false));
  }, []);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Nie udało się zalogować.");
        return;
      }
      const meRes = await apiFetch("/auth/me");
      setMe(meRes.ok ? await meRes.json() : null);
    } catch {
      setError("Brak połączenia z serwerem.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    setMe(null);
  }

  if (checkingSession) return null;

  return (
    <div style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <header style={styles.header}>
        <strong>Skarbnik Przedszkolny</strong>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
          aria-label="Motyw"
          style={styles.themeSelect}
        >
          <option value="system">Motyw: systemowy</option>
          <option value="light">Motyw: jasny</option>
          <option value="dark">Motyw: ciemny</option>
        </select>
      </header>

      <main style={styles.main}>
        {!me ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <h1 style={styles.h1}>Logowanie</h1>
            <label style={styles.label}>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Hasło
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                style={styles.input}
              />
            </label>
            {error && <p style={styles.error}>{error}</p>}
            <button type="submit" disabled={submitting} style={styles.button}>
              {submitting ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>
        ) : (
          <div>
            <h1 style={styles.h1}>Cześć, {me.displayName}</h1>
            <p style={styles.muted}>
              Zalogowano jako {me.role === "ADMIN" ? "administrator" : "rodzic"} ({me.email}).
            </p>
            <p style={styles.muted}>
              Reszta ekranów (dzieci, składki, raporty) — w kolejnym etapie prac.
            </p>
            <button onClick={handleLogout} style={styles.button}>
              Wyloguj się
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.75rem",
    padding: "1rem",
    borderBottom: "1px solid var(--line)",
    background: "var(--surface)",
  },
  themeSelect: {
    padding: "0.4rem 0.5rem",
    borderRadius: "6px",
    border: "1px solid var(--line)",
    background: "var(--surface)",
    color: "var(--ink)",
  },
  main: {
    flex: 1,
    padding: "1.5rem",
    maxWidth: 420,
    margin: "0 auto",
    width: "100%",
  },
  form: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  h1: { fontSize: "1.25rem", margin: 0 },
  label: { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.9rem" },
  input: {
    padding: "0.7rem 0.75rem",
    border: "1px solid var(--line)",
    borderRadius: "6px",
    background: "var(--surface)",
    color: "var(--ink)",
  },
  error: { color: "var(--danger)", margin: 0, fontSize: "0.9rem" },
  muted: { color: "var(--ink-muted)" },
  button: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    fontWeight: 600,
    border: "none",
    borderRadius: "6px",
    background: "var(--accent)",
    color: "var(--accent-contrast)",
    cursor: "pointer",
  },
};
