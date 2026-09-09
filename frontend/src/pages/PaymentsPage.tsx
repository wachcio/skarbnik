import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSemesters } from "../hooks/useSemesters";
import { SemesterSelect } from "../components/SemesterSelect";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { Category, Child } from "../lib/types";

const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

interface PaymentWithRelations {
  id: string;
  amount: string; // Decimal serializowany przez Prisma jako string w JSON
  paidAt: string;
  description: string | null;
  child: { id: string; firstName: string; lastName: string };
  category: { id: string; name: string; archived: boolean };
}

export function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const { semesters, selectedId, setSelectedId } = useSemesters();
  const [payments, setPayments] = useState<PaymentWithRelations[] | null>(null);
  const [children, setChildren] = useState<Child[] | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPayments() {
    if (!selectedId) return;
    const res = await apiFetch(`/payments?semesterId=${selectedId}`);
    if (res.ok) setPayments(await res.json());
    else setError("Nie udało się pobrać wpłat.");
  }

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch("/children").then(async (res) => {
      if (res.ok) setChildren(await res.json());
    });
    apiFetch("/categories").then(async (res) => {
      if (res.ok) setCategories(await res.json());
    });
  }, [isAdmin]);

  async function handleDelete(id: string) {
    const res = await apiFetch(`/payments/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDeletingId(null);
      await loadPayments();
    } else {
      setError("Nie udało się usunąć wpłaty.");
      setDeletingId(null);
    }
  }

  if (!semesters || !selectedId) return <p className="muted">Wczytywanie…</p>;

  const total = payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return (
    <div>
      <div className="page-header">
        <h1>Wpłaty</h1>
        <SemesterSelect semesters={semesters} value={selectedId} onChange={setSelectedId} />
      </div>

      {isAdmin && (
        <>
          <button type="button" className="btn" onClick={() => setShowAddForm((v) => !v)} style={{ marginBottom: "1rem" }}>
            {showAddForm ? "Anuluj" : "Dodaj wpłatę"}
          </button>
          {showAddForm && children && categories && (
            <AddPaymentForm
              children={children}
              categories={categories.filter((c) => !c.archived)}
              semesterId={selectedId}
              onDone={async () => {
                setShowAddForm(false);
                await loadPayments();
              }}
            />
          )}
        </>
      )}

      {error && <p className="error-text">{error}</p>}
      {payments === null && !error && <p className="muted">Wczytywanie…</p>}
      {payments?.length === 0 && (
        <p className="muted">
          {isAdmin ? "Brak wpłat w tym semestrze — dodaj pierwszą powyżej." : "Brak wpłat Twojego dziecka w tym semestrze."}
        </p>
      )}

      {payments && payments.length > 0 && (
        <p className="muted footnote-tight">Łącznie w tym semestrze: {currency.format(total)}</p>
      )}

      <ul className="list stack-card">
        {payments?.map((p) => (
          <li key={p.id} className="card category-item">
            <div className="category-item-header">
              <div>
                <Link to={`/children/${p.child.id}`} className="arrears-child-link">
                  <strong>
                    {p.child.firstName} {p.child.lastName}
                  </strong>
                </Link>
                <div className="muted footnote-tight" style={{ marginTop: "0.15rem" }}>
                  {p.category.name}
                  {p.category.archived && <span className="badge-archived"> (zarchiwizowana)</span>}
                </div>
              </div>
              <span className="amount-paid">{currency.format(Number(p.amount))}</span>
            </div>
            <p className="muted footnote-tight" style={{ marginTop: 0 }}>
              {dateFormatter.format(new Date(p.paidAt))}
              {p.description ? ` · ${p.description}` : ""}
            </p>
            {isAdmin && (
              <button type="button" className="link-danger" onClick={() => setDeletingId(p.id)}>
                Usuń
              </button>
            )}
          </li>
        ))}
      </ul>

      {deletingId && (
        <ConfirmDialog
          title="Usunąć wpłatę?"
          message="Tej operacji nie można cofnąć. Zdarzenie zostanie zapisane w logu audytowym."
          confirmLabel="Usuń"
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}

interface AddPaymentFormProps {
  children: Child[];
  categories: Category[];
  semesterId: string;
  onDone: () => Promise<void>;
}

function AddPaymentForm({ children, categories, semesterId, onDone }: AddPaymentFormProps) {
  const [childId, setChildId] = useState(children[0]?.id ?? "");
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

  if (children.length === 0) {
    return <p className="muted footnote-tight">Najpierw dodaj dziecko w sekcji Dzieci.</p>;
  }
  if (categories.length === 0) {
    return <p className="muted footnote-tight">Najpierw dodaj co najmniej jedną kategorię składki w ustawieniach.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="form card form-card">
      <div className="form-row">
        <label className="field">
          Dziecko
          <select className="input" value={childId} onChange={(e) => setChildId(e.target.value)}>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        </label>
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
      </div>
      <div className="form-row">
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
        <label className="field">
          Data wpłaty
          <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
        </label>
      </div>
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
