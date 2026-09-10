import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "../components/SemesterSelect";
import { DonutChart } from "../components/DonutChart";
import type { CategorySummary, SemesterSummary, TreasuryBalance, MonthlyExpensesReport } from "../lib/types";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const shortDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

function ExportLinks({ report, semesterId }: { report: "summary" | "arrears" | "expenses-by-month"; semesterId: string }) {
  return (
    <div className="export-links">
      <a href={`/api/reports/export?report=${report}&format=pdf&semesterId=${semesterId}`}>PDF</a>
      <a href={`/api/reports/export?report=${report}&format=xlsx&semesterId=${semesterId}`}>Excel</a>
    </div>
  );
}

interface ArrearsRow {
  childId: string;
  childName: string;
  categoryId: string;
  categoryName: string;
  target: number;
  paid: number;
  remaining: number;
}

export function ReportsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [summary, setSummary] = useState<SemesterSummary | null>(null);
  const [arrears, setArrears] = useState<ArrearsRow[] | null>(null);
  const [monthly, setMonthly] = useState<MonthlyExpensesReport | null>(null);
  const [balance, setBalance] = useState<TreasuryBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    setSummary(null);
    setArrears(null);
    setMonthly(null);
    Promise.all([
      apiFetch(`/reports/summary?semesterId=${selectedId}`),
      apiFetch(`/reports/arrears?semesterId=${selectedId}`),
      apiFetch(`/reports/expenses-by-month?semesterId=${selectedId}`),
    ]).then(async ([summaryRes, arrearsRes, monthlyRes]) => {
      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (arrearsRes.ok) setArrears(await arrearsRes.json());
      if (monthlyRes.ok) setMonthly(await monthlyRes.json());
      if (!summaryRes.ok || !arrearsRes.ok || !monthlyRes.ok) setError(t("reports.loadError"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Stan kasy jest niezależny od wybranego semestru (jedno realne konto
  // skarbnika) — pobierany osobno, raz, bez odświeżania przy zmianie
  // dropdownu.
  useEffect(() => {
    apiFetch("/reports/balance").then(async (res) => {
      if (res.ok) setBalance(await res.json());
    });
  }, []);

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;
  if (!semesters || !selectedId) return <p className="muted">{t("common.loading")}</p>;

  const percent =
    summary && summary.targetTotal > 0
      ? Math.min(100, Math.round((summary.collectedTotal / summary.targetTotal) * 100))
      : 0;

  const arrearsByChild = new Map<string, { childName: string; rows: ArrearsRow[]; total: number }>();
  for (const row of arrears ?? []) {
    const entry = arrearsByChild.get(row.childId) ?? { childName: row.childName, rows: [], total: 0 };
    entry.rows.push(row);
    entry.total += row.remaining;
    arrearsByChild.set(row.childId, entry);
  }

  return (
    <div>
      <div className="page-header">
        <h1>{t("reports.title")}</h1>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="card treasury-balance-card">
        <h2>{t("reports.treasuryTitle")}</h2>
        <p className="muted footnote-tight">{t("reports.treasurySubtitle")}</p>
        {!balance && <p className="muted">{t("common.loading")}</p>}
        {balance && (
          <div className="donut-legend" style={{ marginTop: "0.6rem" }}>
            <div className="donut-legend-row">
              <span className="muted">{t("reports.collectedTotal")}</span>
              <span className="value">{currency.format(balance.collectedTotal)}</span>
            </div>
            <div className="donut-legend-row">
              <span className="muted">{t("reports.spentTotal")}</span>
              <span className="value">{currency.format(balance.spentTotal)}</span>
            </div>
            <div className="donut-legend-row">
              <span className="muted">{t("reports.availableNow")}</span>
              <span className="value" style={{ color: balance.balance >= 0 ? "var(--success)" : "var(--danger)" }}>
                {currency.format(balance.balance)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="page-header" style={{ marginTop: "1.25rem" }}>
        <h2 style={{ marginBottom: 0 }}>{t("reports.semester")}</h2>
        <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: "0.6rem" }}>
          <h2 style={{ marginBottom: 0 }}>{t("reports.summaryTitle")}</h2>
          <ExportLinks report="summary" semesterId={selectedId} />
        </div>
        {!summary && !error && <p className="muted">{t("common.loading")}</p>}
        {summary && (
          <>
            <div className="donut-wrap">
              <DonutChart percent={percent} caption={t("public.collectedCaption")} color={percent >= 100 ? "var(--success)" : "var(--accent)"} />
              <div className="donut-legend">
                <div className="donut-legend-row">
                  <span className="muted">{t("reports.collected")}</span>
                  <span className="value">{currency.format(summary.collectedTotal)}</span>
                </div>
                <div className="donut-legend-row">
                  <span className="muted">{t("reports.planned")}</span>
                  <span className="value">{currency.format(summary.targetTotal)}</span>
                </div>
                <div className="donut-legend-row">
                  <span className="muted">{t("reports.spentThisSemester")}</span>
                  <span className="value">{currency.format(summary.spentTotal ?? 0)}</span>
                </div>
                <div className="donut-legend-row">
                  <span className="muted">{t("reports.childrenInGroup")}</span>
                  <span className="value">{summary.childCount}</span>
                </div>
              </div>
            </div>

            {summary.byCategory.length > 0 && (
              <ul className="category-breakdown stack-card">
                {summary.byCategory.map((category: CategorySummary) => {
                  const hasTarget = category.target > 0;
                  const catPercent = hasTarget ? Math.min(100, Math.round((category.collected / category.target) * 100)) : 0;
                  const done = hasTarget && catPercent >= 100;
                  const pillClass = !hasTarget ? "status-pill neutral" : done ? "status-pill success" : "status-pill danger";
                  return (
                    <li key={category.categoryId}>
                      <div className="category-row-header">
                        <span>
                          {category.name}
                          {category.archived && <span className="badge-archived">{t("reports.archived")}</span>}
                        </span>
                        <span className={pillClass}>
                          {currency.format(category.collected)} / {currency.format(category.target)}
                        </span>
                      </div>
                      <div className="progress-track small">
                        <div className={done ? "progress-fill success" : "progress-fill"} style={{ width: `${catPercent}%` }} />
                      </div>
                      {!!category.spent && (
                        <p className="muted footnote-tight" style={{ marginTop: "0.25rem", marginBottom: 0 }}>
                          {t("reports.spent", { amount: currency.format(category.spent) })}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="card stack-card">
        <div className="page-header" style={{ marginBottom: "0.6rem" }}>
          <h2 style={{ marginBottom: 0 }}>{t("reports.arrearsTitle")}</h2>
          <ExportLinks report="arrears" semesterId={selectedId} />
        </div>
        {!arrears && !error && <p className="muted">{t("common.loading")}</p>}
        {arrears?.length === 0 && <p className="muted">{t("reports.arrearsEmpty")}</p>}

        <ul className="list">
          {Array.from(arrearsByChild.entries()).map(([childId, entry]) => (
            <li key={childId} className="card category-item">
              <div className="category-item-header">
                <Link to={`/children/${childId}`} className="arrears-child-link">
                  <strong>{entry.childName}</strong>
                </Link>
                <span className="status-pill danger">{t("reports.total", { amount: currency.format(entry.total) })}</span>
              </div>
              <ul className="payment-list">
                {entry.rows.map((row) => (
                  <li key={row.categoryId} className="payment-row">
                    <span>{row.categoryName}</span>
                    <span className="status-pill danger">{t("reports.missing", { amount: currency.format(row.remaining) })}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <div className="card stack-card">
        <div className="page-header" style={{ marginBottom: "0.6rem" }}>
          <h2 style={{ marginBottom: 0 }}>{t("reports.expensesByMonthTitle")}</h2>
          <ExportLinks report="expenses-by-month" semesterId={selectedId} />
        </div>
        {!monthly && !error && <p className="muted">{t("common.loading")}</p>}
        {monthly?.months.length === 0 && <p className="muted">{t("reports.expensesByMonthEmpty")}</p>}

        <ul className="list">
          {monthly?.months.map((month) => (
            <li key={month.monthKey} className="card category-item">
              <div className="category-item-header">
                <strong>{month.monthLabel}</strong>
                <span className="status-pill neutral">{t("reports.total", { amount: currency.format(month.total) })}</span>
              </div>
              <ul className="payment-list">
                {month.expenses.map((expense) => (
                  <li key={expense.id} className="payment-row">
                    <span>
                      {expense.categoryName}
                      {expense.categoryArchived && <span className="badge-archived">{t("reports.archived")}</span>}
                      <span className="muted footnote-tight" style={{ display: "block" }}>
                        {shortDate.format(new Date(expense.spentAt))}
                        {expense.description ? ` · ${expense.description}` : ""}
                      </span>
                    </span>
                    <span className="amount-paid">{currency.format(expense.amount)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        {monthly && monthly.months.length > 0 && (
          <p className="muted footnote-tight" style={{ marginTop: "0.6rem" }}>
            {t("reports.totalForSemester", { amount: currency.format(monthly.total) })}
          </p>
        )}
      </div>
    </div>
  );
}
