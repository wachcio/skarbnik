import { useEffect, useState, type FormEvent } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "./SemesterSelect";
import { ConfirmDialog } from "./ConfirmDialog";
import type { Category, CategoryLedgerRow } from "../lib/types";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

interface ChildPaymentsProps {
  childId: string;
}

export function ChildPayments({ childId }: ChildPaymentsProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [ledger, setLedger] = useState<CategoryLedgerRow[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  async function loadLedger() {
    if (!selectedId) return;
    const res = await apiFetch(`/children/${childId}/ledger?semesterId=${selectedId}`);
    if (res.ok) setLedger(await res.json());
    else setError("Nie udało się pobrać rozliczenia.");
  }

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, childId]);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch("/categories").then(async (res) => {
      if (res.ok) setCategories(await res.json());
    });
  }, [isAdmin]);

  async function handleDeletePayment(paymentId: string) {
    const res = await apiFetch(`/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingPaymentId(null);
      await loadLedger();
    } else {
      setError("Nie udało się usunąć wpłaty.");
      setDeletingPaymentId(null);
    }
  }

  if (!semesters || !selectedId) return <p className="muted">Wczytywanie…</p>;

  const targetTotal = ledger?.reduce((sum, row) => sum + row.target, 0) ?? 0;
  const paidTotal = ledger?.reduce((sum, row) => sum + row.paid, 0) ?? 0;

  return (
    <div>
      <div className="page-header">
        <h2>Składki</h2>
        <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
      </div>

      {error && <p className="error-text">{error}</p>}

      {ledger && (
        <p className="muted footnote-tight" style={{ marginTop: 0, marginBottom: "0.85rem" }}>
          Łącznie: {currency.format(paidTotal)} / {currency.format(targetTotal)}
        </p>
      )}

      {ledger?.length === 0 && <p className="muted">Brak kategorii z ustaloną kwotą na ten semestr.</p>}

      <ul className="list">
        {ledger?.map((row) => (
          <li key={row.categoryId} className="card category-item">
            <div className="category-item-header">
              <strong>
                {row.categoryName}
                {row.archived && <span className="badge-archived"> (zarchiwizowana)</span>}
              </strong>
              <span
                className={
                  row.target === 0 ? "status-pill neutral" : row.remaining > 0 ? "status-pill danger" : "status-pill success"
                }
              >
                {currency.format(row.paid)} / {currency.format(row.target)}
              </span>
            </div>

            {row.payments.length > 0 && (
              <ul className="payment-list">
                {row.payments.map((payment) => (
                  <li key={payment.id} className="payment-row">
                    <span>
                      {dateFormatter.format(new Date(payment.paidAt))} — {currency.format(payment.amount)}
                      {payment.description ? ` · ${payment.description}` : ""}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="link-danger"
                        onClick={() => setDeletingPaymentId(payment.id)}
                      >
                        Usuń
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {isAdmin && (
        <>
          <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)} style={{ marginTop: "0.75rem" }}>
            {showAddForm ? "Anuluj" : "Dodaj wpłatę"}
          </button>

          {showAddForm && categories && (
            <AddPaymentForm
              childId={childId}
              semesterId={selectedId}
              categories={categories.filter((c) => !c.archived)}
              onDone={async () => {
                setShowAddForm(false);
                await loadLedger();
              }}
            />
          )}
        </>
      )}

      {deletingPaymentId && (
        <ConfirmDialog
          title="Usunąć wpłatę?"
          message="Tej operacji nie można cofnąć. Wpłata zniknie z bieżących rozliczeń (zdarzenie zostanie zapisane w logu audytowym)."
          confirmLabel="Usuń"
          onConfirm={() => handleDeletePayment(deletingPaymentId)}
          onCancel={() => setDeletingPaymentId(null)}
        />
      )}
    </div>
  );
}

interface AddPaymentFormProps {
  childId: string;
  semesterId: string;
  categories: Category[];
  onDone: () => Promise<void>;
}

function AddPaymentForm({ childId, semesterId, categories, onDone }: AddPaymentFormProps) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ childId, categoryId, semesterId, amount: Number(amount), paidAt, description }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Nie udało się dodać wpłaty.");
      }
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  if (categories.length === 0) {
    return <p className="muted footnote-tight">Najpierw dodaj co najmniej jedną kategorię składki w ustawieniach.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form card form-card">
      <div className="form-row">
        <label className="field">
          Kategoria
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
        Data wpłaty
        <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
      </label>
      <label className="field">
        Opis (opcjonalnie)
        <input
          className="input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="np. druga rata"
        />
      </label>
      {error && <p className="error-text">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "Zapisywanie…" : "Zapisz wpłatę"}
        </button>
      </div>
    </form>
  );
}
