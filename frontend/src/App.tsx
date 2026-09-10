import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { ChildrenListPage } from "./pages/ChildrenListPage";
import { ChildDetailPage } from "./pages/ChildDetailPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ParentAccountsPage } from "./pages/ParentAccountsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { PublicSummaryPage } from "./pages/PublicSummaryPage";
import { HelpPage } from "./pages/HelpPage";
import { AuditLogPage } from "./pages/AuditLogPage";

function RequireAuth({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

/** Strona główna po zalogowaniu: admin trafia na Raporty (pierwsza rzecz,
 * którą chce widzieć skarbnik — stan kasy i postęp zbiórki), rodzic —
 * który nie ma dostępu do raportów — na listę dzieci jak dotychczas. */
function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "ADMIN" ? "/reports" : "/children"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/public" element={<PublicSummaryPage />} />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/children" element={<ChildrenListPage />} />
        <Route path="/children/:id" element={<ChildDetailPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/users" element={<ParentAccountsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/audit-log" element={<AuditLogPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
