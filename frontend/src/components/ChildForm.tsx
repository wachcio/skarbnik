import { useState, type FormEvent } from "react";
import { useLanguage } from "../context/LanguageContext";

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
  const { t } = useLanguage();
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
      setError(err instanceof Error ? err.message : t("childForm.unexpectedError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <div className="form-row">
        <label className="field">
          {t("childForm.firstName")}
          <input
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </label>
        <label className="field">
          {t("childForm.lastName")}
          <input
            className="input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </label>
      </div>
      <label className="field">
        {t("childForm.parentEmail")}
        <input
          className="input"
          type="email"
          value={parentContactEmail}
          onChange={(e) => setParentContactEmail(e.target.value)}
        />
      </label>
      <label className="field">
        {t("childForm.parentPhone")}
        <input
          className="input"
          value={parentContactPhone}
          onChange={(e) => setParentContactPhone(e.target.value)}
        />
      </label>
      <label className="field">
        {t("childForm.notes")}
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("childForm.notesPlaceholder")}
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
