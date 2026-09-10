import { useState, type FormEvent } from "react";
import type { Category } from "../lib/types";

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
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  if (categories.length === 0) {
    return <p className="muted footnote-tight">Najpierw dodaj co najmniej jedną kategorię w ustawieniach.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form card form-card">
      <div className="form-row">
        <label className="field">
          Na co (kategoria)
          <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Kwota
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
        Kiedy
        <input className="input" type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} required />
      </label>
      <label className="field">
        Opis (opcjonalnie)
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="np. bilety wstępu, zakup nagród"
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Zapisywanie…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Anuluj
          </button>
        )}
      </div>
    </form>
  );
}
