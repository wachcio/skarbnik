import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SemesterSummary } from "../lib/types";
import { AppHeader } from "../components/AppHeader";
import { DonutChart } from "../components/DonutChart";
import { useLanguage } from "../context/LanguageContext";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function PublicSummaryPage() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<SemesterSummary | null>(null);
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    apiFetch("/public/summary").then(async (res) => {
      if (res.status === 404) {
        setDisabled(true);
        return;
      }
      if (res.ok) setSummary(await res.json());
    });
  }, []);

  const percent =
    summary && summary.targetTotal > 0 ? Math.min(100, Math.round((summary.collectedTotal / summary.targetTotal) * 100)) : 0;
  const remaining = summary ? Math.max(0, summary.targetTotal - summary.collectedTotal) : 0;

  return (
    <div className="shell">
      <AppHeader />

      <main className="page">
        <h1>{t("public.title")}</h1>

        {disabled && (
          <div className="tip-box">
            <span className="tip-icon">🔒</span>
            <span>{t("public.disabled")}</span>
          </div>
        )}
        {!disabled && !summary && <p className="muted">{t("common.loading")}</p>}

        {summary && (
          <>
            <div className="card">
              <div className="donut-wrap">
                <DonutChart
                  percent={percent}
                  caption={t("public.collectedCaption")}
                  color={percent >= 100 ? "var(--success)" : "var(--accent)"}
                />
                <div className="donut-legend">
                  <div className="donut-legend-row">
                    <span className="muted">{t("public.collected")}</span>
                    <span className="value">{currency.format(summary.collectedTotal)}</span>
                  </div>
                  <div className="donut-legend-row">
                    <span className="muted">{t("public.planned")}</span>
                    <span className="value">{currency.format(summary.targetTotal)}</span>
                  </div>
                  <div className="donut-legend-row">
                    <span className="muted">{t("public.remaining")}</span>
                    <span className="value" style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>
                      {currency.format(remaining)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="muted footnote-tight">
                {t(summary.childCount === 1 ? "public.childCount_one" : "public.childCount_other", {
                  count: summary.childCount,
                })}
              </p>
            </div>

            {summary.byCategory.length > 0 && (
              <div className="card stack-card">
                <h2>{t("public.byCategory")}</h2>
                <ul className="category-breakdown">
                  {summary.byCategory.map((category) => {
                    const hasTarget = category.target > 0;
                    const catPercent = hasTarget ? Math.min(100, Math.round((category.collected / category.target) * 100)) : 0;
                    const done = hasTarget && catPercent >= 100;
                    const pillClass = !hasTarget ? "status-pill neutral" : done ? "status-pill success" : "status-pill danger";
                    return (
                      <li key={category.categoryId}>
                        <div className="category-row-header">
                          <span>{category.name}</span>
                          <span className={pillClass}>
                            {currency.format(category.collected)} / {currency.format(category.target)}
                          </span>
                        </div>
                        <div className="progress-track small">
                          <div className={done ? "progress-fill success" : "progress-fill"} style={{ width: `${catPercent}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}

        <p className="muted footnote">
          <a href="/login">{t("public.loginLink")}</a>
        </p>
      </main>
    </div>
  );
}
