import { useLanguage } from "../context/LanguageContext";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  const { t } = useLanguage();
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p className="muted">{message}</p>
        <div className="form-actions">
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
