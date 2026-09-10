import { useState, type FormEvent } from "react";
import type { Category } from "../lib/types";
import { useLanguage } from "../context/LanguageContext";

export interface ExpenseInput {
  categoryId: string;
  amount: string;
  spentAt: string;
  description: string;
}

interface ExpenseFormProps {
  categories: Category[];
  initial?: Partial<ExpenseInput>;
  submitLabel: string;
  onSubmit: (data: ExpenseInput) => Promise<void>;
  onCancel?: () => void;
}

export function ExpenseForm({ categories, initial, submitLabel, onSubmit, onCancel }: ExpenseFormProps) {
  const { t } = useLanguage();
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [spentAt, setSpentAt] = useState(initial?.spentAt ?? new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ categoryId, amount, spentAt, description });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.genericError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (categories.length === 0) {
    return <p className="muted footnote-tight">{t("expenseForm.noCategoriesFirst")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form card form-card">
      <div className="form-row">
        <label className="field">
          {t("expenseForm.category")}
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("expenseForm.amount")}
          <input
            className="input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="field">
        {t("expenseForm.when")}
        <input className="input" type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} required />
      </label>
      <label className="field">
        {t("expenseForm.description")}
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("expenseForm.descriptionPlaceholder")}
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? t("common.saving") : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            {t("common.cancel")}
          </button>
        )}
      </div>
    </form>
  );
}
