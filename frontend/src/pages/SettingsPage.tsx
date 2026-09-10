import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { apiFetch } from "../lib/api";
import type { Settings } from "../lib/types";
import { BackupSection } from "../components/BackupSection";
import { ChangePasswordSection } from "../components/ChangePasswordSection";
import { ChangeEmailSection } from "../components/ChangeEmailSection";
import { AppInfoFooter } from "../components/AppInfoFooter";

export function SettingsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
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
      if (!res.ok) throw new Error(t("settings.publicViewSaveError"));
      setSettings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>{t("settings.title")}</h1>
      <div className="card">
        <dl className="detail-fields">
          <div>
            <dt>{t("settings.loggedInAs")}</dt>
            <dd>{user?.displayName}</dd>
          </div>
          <div>
            <dt>{t("settings.role")}</dt>
            <dd>{user?.role === "ADMIN" ? t("settings.roleAdmin") : t("settings.roleParent")}</dd>
          </div>
          <div>
            <dt>{t("settings.email")}</dt>
            <dd>{user?.email}</dd>
          </div>
        </dl>
      </div>

      {isAdmin && (
        <>
          <div className="card stack-card">
            <h2>{t("settings.publicViewTitle")}</h2>
            <div className="tip-box" style={{ marginBottom: "0.85rem" }}>
              <span className="tip-icon">💡</span>
              <span>{t("settings.publicViewTip")}</span>
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
                {t("settings.publicViewEnabled")}
              </label>
            ) : (
              <p className="muted">{t("common.loading")}</p>
            )}
          </div>

          <div className="card stack-card">
            <h2>{t("settings.categoriesTitle")}</h2>
            <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              {t("settings.categoriesDescription")}
            </p>
            <Link to="/categories" className="btn btn-secondary">
              {t("settings.categoriesManage")}
            </Link>
          </div>

          <div className="card stack-card">
            <h2>{t("settings.parentAccountsTitle")}</h2>
            <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              {t("settings.parentAccountsDescription")}
            </p>
            <Link to="/users" className="btn btn-secondary">
              {t("settings.parentAccountsManage")}
            </Link>
          </div>

          <BackupSection />

          <div className="card stack-card">
            <h2>{t("settings.auditLogTitle")}</h2>
            <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.75rem" }}>
              {t("settings.auditLogDescription")}
            </p>
            <Link to="/audit-log" className="btn btn-secondary">
              {t("settings.auditLogView")}
            </Link>
          </div>
        </>
      )}

      <ChangeEmailSection />
      <ChangePasswordSection />
      <AppInfoFooter />
    </div>
  );
}
