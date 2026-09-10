import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { AppHeader } from "./AppHeader";
import { HelpButton } from "./HelpButton";

export function AppShell() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="shell">
      <AppHeader>
        <button type="button" className="btn btn-secondary btn-small" onClick={logout}>
          {t("header.logout")}
        </button>
      </AppHeader>

      <main className="page">
        <Outlet />
      </main>

      <HelpButton />

      <nav className="bottom-nav" aria-label={t("nav.ariaLabel")}>
        {isAdmin && (
          <NavLink to="/reports" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("nav.reports")}
          </NavLink>
        )}
        <NavLink to="/children" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {t("nav.children")}
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {t("nav.payments")}
        </NavLink>
        {isAdmin && (
          <NavLink to="/expenses" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
            {t("nav.expenses")}
          </NavLink>
        )}
        <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
          {t("nav.settings")}
        </NavLink>
      </nav>
    </div>
  );
}
