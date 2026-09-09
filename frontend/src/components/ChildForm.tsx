import { useState, type FormEvent } from "react";

export interface ChildInput {
  firstName: string;
  lastName: string;
  parentContactEmail: string;
  parentContactPhone: string;
  notes: string;
}

interface ChildFormProps {
  initial?: Partial<ChildInput>;
  submitLabel: string;
  onSubmit: (data: ChildInput) => Promise<void>;
  onCancel?: () => void;
}

export function ChildForm({ initial, submitLabel, onSubmit, onCancel }: ChildFormProps) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [parentContactEmail, setParentContactEmail] = useState(initial?.parentContactEmail ?? "");
  const [parentContactPhone, setParentContactPhone] = useState(initial?.parentContactPhone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ firstName, lastName, parentContactEmail, parentContactPhone, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-row">
        <label className="field">
          Imię
          <input
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Nazwisko
          <input
            className="input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="field">
        E-mail rodzica (opcjonalnie)
        <input
          className="input"
          type="email"
          value={parentContactEmail}
          onChange={(e) => setParentContactEmail(e.target.value)}
        />
      </label>
      <label className="field">
        Telefon do rodzica (opcjonalnie)
        <input
          className="input"
          value={parentContactPhone}
          onChange={(e) => setParentContactPhone(e.target.value)}
        />
      </label>
      <label className="field">
        Notatki
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="np. zniżka rodzeństwo, płaci przelewem zbiorczym…"
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
