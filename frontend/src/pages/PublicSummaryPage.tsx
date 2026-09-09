import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { SemesterSummary } from "../lib/types";
import { ThemeToggle } from "../components/ThemeToggle";

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
    summary && summary.targetTotal > 0
      ? Math.min(100, Math.round((summary.collectedTotal / summary.targetTotal) * 100))
      : 0;

  return (
    <div className="shell">
      <header className="app-header">
        <strong>Skarbnik Przedszkolny</strong>
        <ThemeToggle />
      </header>

      <main className="page">
        <h1>Stan składek grupy</h1>

        {disabled && <p className="muted">Widok publiczny jest obecnie wyłączony przez administratora.</p>}
        {!disabled && !summary && <p className="muted">Wczytywanie…</p>}

        {summary && (
          <>
            <div className="card">
              <div className="stat-row">
                <div>
                  <span className="stat-value">{currency.format(summary.collectedTotal)}</span>
                  <span className="stat-label">zebrano</span>
                </div>
                <div>
                  <span className="stat-value">{currency.format(summary.targetTotal)}</span>
                  <span className="stat-label">planowane</span>
                </div>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <p className="muted footnote-tight">
                {percent}% zebranej kwoty · {summary.childCount}{" "}
                {summary.childCount === 1 ? "dziecko" : "dzieci"} w grupie
              </p>
            </div>

            {summary.byCategory.length > 0 && (
              <div className="card stack-card">
                <h2>Wg kategorii</h2>
                <ul className="category-breakdown">
                  {summary.byCategory.map((category) => {
                    const catPercent =
                      category.target > 0
                        ? Math.min(100, Math.round((category.collected / category.target) * 100))
                        : 0;
                    return (
                      <li key={category.categoryId}>
                        <div className="category-row-header">
                          <span>{category.name}</span>
                          <span className="muted">
                            {currency.format(category.collected)} / {currency.format(category.target)}
                          </span>
                        </div>
                        <div className="progress-track small">
                          <div className="progress-fill" style={{ width: `${catPercent}%` }} />
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
