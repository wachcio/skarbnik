import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SemesterSummary } from "../lib/types";
import { ThemeToggle } from "../components/ThemeToggle";
import { DonutChart } from "../components/DonutChart";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function PublicSummaryPage() {
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
      <header className="app-header">
        <strong>Skarbnik Przedszkolny</strong>
        <ThemeToggle />
      </header>

      <main className="page">
        <h1>Stan składek grupy</h1>

        {disabled && (
          <div className="tip-box">
            <span className="tip-icon">🔒</span>
            <span>Widok publiczny jest obecnie wyłączony przez administratora.</span>
          </div>
        )}
        {!disabled && !summary && <p className="muted">Wczytywanie…</p>}

        {summary && (
          <>
            <div className="card">
              <div className="donut-wrap">
                <DonutChart percent={percent} caption="zebrane" color={percent >= 100 ? "var(--success)" : "var(--accent)"} />
                <div className="donut-legend">
                  <div className="donut-legend-row">
                    <span className="muted">Zebrano</span>
                    <span className="value">{currency.format(summary.collectedTotal)}</span>
                  </div>
                  <div className="donut-legend-row">
                    <span className="muted">Planowane</span>
                    <span className="value">{currency.format(summary.targetTotal)}</span>
                  </div>
                  <div className="donut-legend-row">
                    <span className="muted">Do zebrania</span>
                    <span className="value" style={{ color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>
                      {currency.format(remaining)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="muted footnote-tight">
                {summary.childCount} {summary.childCount === 1 ? "dziecko" : "dzieci"} w grupie
              </p>
            </div>

            {summary.byCategory.length > 0 && (
              <div className="card stack-card">
                <h2>Wg kategorii</h2>
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
          <a href="/login">Panel logowania →</a>
        </p>
      </main>
    </div>
  );
}
