import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { Settings } from "../lib/types";
import { BackupSection } from "../components/BackupSection";

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch("/settings").then(async (res) => {
      if (res.ok) setSettings(await res.json());
    });
  }, [isAdmin]);

  async function togglePublicView() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch("/settings", {
        method: "PATCH",
        body: JSON.stringify({ publicViewEnabled: !settings.publicViewEnabled }),
      });
      if (!res.ok) throw new Error("Nie udało się zapisać ustawienia.");
      setSettings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Ustawienia</h1>
      <div className="card">
        <dl className="detail-fields">
          <div>
            <dt>Zalogowano jako</dt>
            <dd>{user?.displayName}</dd>
          </div>
          <div>
            <dt>Rola</dt>
            <dd>{user?.role === "ADMIN" ? "Administrator" : "Rodzic"}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{user?.email}</dd>
          </div>
        </dl>
      </div>

      {isAdmin && (
        <>
          <div className="card stack-card">
            <h2>Widok publiczny</h2>
            <div className="tip-box" style={{ marginBottom: "0.85rem" }}>
              <span className="tip-icon">💡</span>
              <span>
                Strona bez logowania z zagregowanymi danymi grupy (zebrano/planowano), dostępna pod{" "}
                <Link to="/public">/public</Link>. Bez żadnych danych osobowych dzieci.
              </span>
            </div>
            {error && <p className="error-text">{error}</p>}
            {settings ? (
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.publicViewEnabled}
                  onChange={togglePublicView}
                  disabled={saving}
                />
                Widok publiczny włączony
              </label>
            ) : (
              <p className="muted">Wczytywanie…</p>
            )}
          </div>

          <div className="card stack-card">
            <h2>Kategorie składek</h2>
            <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              Dodawaj i archiwizuj kategorie, ustawiaj domyślne kwoty na semestr.
            </p>
            <Link to="/categories" className="btn btn-secondary">
              Zarządzaj kategoriami
            </Link>
          </div>

          <div className="card stack-card">
            <h2>Konta rodziców</h2>
            <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              Twórz konta, przypisuj do dzieci, resetuj hasła ręcznie.
            </p>
            <Link to="/users" className="btn btn-secondary">
              Zarządzaj kontami
            </Link>
          </div>

          <BackupSection />
        </>
      )}
    </div>
  );
}
