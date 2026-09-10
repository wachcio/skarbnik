import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AppHeader } from "./AppHeader";

export function AppShell() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="shell">
      <AppHeader>
        <button type="button" className="btn btn-secondary btn-small" onClick={logout}>
          Wyloguj
        </button>
      </AppHeader>

      <main className="page">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Nawigacja główna">
        {isAdmin && (
          <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            Raporty
          </NavLink>
        )}
        <NavLink to="/children" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Dzieci
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Wpłaty
        </NavLink>
        {isAdmin && (
          <NavLink to="/expenses" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            Wydatki
          </NavLink>
        )}
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Ustawienia
        </NavLink>
      </nav>
    </div>
  );
}
