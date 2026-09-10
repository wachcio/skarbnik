import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "../components/SemesterSelect";
import { ExpenseForm, type ExpenseInput } from "../components/ExpenseForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Category, Expense } from "../lib/types";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

export function ExpensesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadExpenses() {
    if (!selectedId) return;
    const res = await apiFetch(`/expenses?semesterId=${selectedId}`);
    if (res.ok) setExpenses(await res.json());
    else setError(t("expenses.loadError"));
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    apiFetch("/categories").then(async (res) => {
      if (res.ok) setCategories(await res.json());
    });
  }, []);

  async function handleCreate(data: ExpenseInput) {
    if (!selectedId) return;
    const res = await apiFetch("/expenses", {
      method: "POST",
      body: JSON.stringify({ ...data, amount: Number(data.amount), semesterId: selectedId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? t("expenses.addError"));
    }
    setShowAddForm(false);
    await loadExpenses();
  }

  async function handleUpdate(id: string, data: ExpenseInput) {
    const res = await apiFetch(`/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ ...data, amount: Number(data.amount) }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? t("expenses.saveError"));
    }
    setEditingId(null);
    await loadExpenses();
  }

  async function handleDelete(id: string) {
    const res = await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      await loadExpenses();
    } else {
      setError(t("expenses.deleteError"));
      setDeletingId(null);
    }
  }

  if (user?.role !== "ADMIN") return <Navigate to="/settings" replace />;
  if (!semesters || !selectedId) return <p className="muted">{t("common.loading")}</p>;

  const activeCategories = categories?.filter((c) => !c.archived) ?? [];
  const total = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <div>
      <div className="page-header">
        <h1>{t("expenses.title")}</h1>
        <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
      </div>

      <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)} style={{ marginBottom: "1rem" }}>
        {showAddForm ? t("common.cancel") : t("expenses.addExpense")}
      </button>

      {showAddForm && categories && (
        <ExpenseForm categories={activeCategories} submitLabel={t("expenses.saveExpense")} onSubmit={handleCreate} />
      )}

      {error && <p className="error-text">{error}</p>}
      {expenses === null && !error && <p className="muted">{t("common.loading")}</p>}
      {expenses?.length === 0 && <p className="muted">{t("expenses.empty")}</p>}

      {expenses && expenses.length > 0 && (
        <p className="muted footnote-tight">{t("expenses.totalThisSemester", { total: currency.format(total) })}</p>
      )}

      <ul className="list stack-card">
        {expenses?.map((expense) =>
          editingId === expense.id && categories ? (
            <li key={expense.id}>
              <ExpenseForm
                categories={activeCategories}
                initial={{
                  categoryId: expense.category.id,
                  amount: expense.amount,
                  spentAt: expense.spentAt.slice(0, 10),
                  description: expense.description ?? "",
                }}
                submitLabel={t("expenses.saveChanges")}
                onSubmit={(data) => handleUpdate(expense.id, data)}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={expense.id} className="card category-item">
              <div className="category-item-header">
                <div>
                  <strong>{expense.category.name}</strong>
                  {expense.category.archived && <span className="badge-archived">{t("reports.archived")}</span>}
                  <div className="muted footnote-tight" style={{ marginTop: "0.15rem" }}>
                    {dateFormatter.format(new Date(expense.spentAt))}
                    {expense.description ? ` · ${expense.description}` : ""}
                  </div>
                </div>
                <span className="amount-paid">{currency.format(Number(expense.amount))}</span>
              </div>
              <div className="button-group">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setEditingId(expense.id)}>
                  {t("common.edit")}
                </button>
                <button type="button" className="btn btn-danger btn-small" onClick={() => setDeletingId(expense.id)}>
                  {t("common.delete")}
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      {deletingId && (
        <ConfirmDialog
          title={t("expenses.deleteTitle")}
          message={t("expenses.deleteMessage")}
          confirmLabel={t("common.delete")}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
