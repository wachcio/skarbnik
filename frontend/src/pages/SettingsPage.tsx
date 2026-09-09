import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { user } = useAuth();

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
      <p className="muted footnote">
        Zarządzanie kategoriami składek, widokiem publicznym, kontami rodziców i eksportem/importem danych
        — w kolejnym etapie prac.
      </p>
    </div>
  );
}
