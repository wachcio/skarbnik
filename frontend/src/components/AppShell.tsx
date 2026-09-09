import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

export function AppShell() {
  const { logout } = useAuth();

  return (
    <div className="shell">
      <header className="app-header">
        <strong>Skarbnik Przedszkolny</strong>
        <ThemeToggle />
      </header>

      <main className="page">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Nawigacja główna">
        <NavLink to="/children" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Dzieci
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Wpłaty
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          Ustawienia
        </NavLink>
        <button type="button" className="nav-item" onClick={logout}>
          Wyloguj
        </button>
      </nav>
    </div>
  );
}
