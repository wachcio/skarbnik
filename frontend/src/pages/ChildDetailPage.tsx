import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import type { Child } from "../lib/types";
import { ChildForm, type ChildInput } from "../components/ChildForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ChildPayments } from "../components/ChildPayments";

export function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [child, setChild] = useState<Child | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    apiFetch(`/children/${id}`).then(async (res) => {
      if (res.ok) {
        setChild(await res.json());
      } else {
        setError(t("childDetail.notFound"));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleUpdate(data: ChildInput) {
    const res = await apiFetch(`/children/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? t("childDetail.saveError"));
    }
    setChild(await res.json());
    setEditing(false);
  }

  async function handleDelete() {
    const res = await apiFetch(`/children/${id}`, { method: "DELETE" });
    if (res.ok) {
      navigate("/children", { replace: true });
    } else {
      setError(t("childDetail.deleteError"));
      setConfirmingDelete(false);
    }
  }

  if (error) {
    return (
      <div>
        <button type="button" className="link-back" onClick={() => navigate("/children")}>
          {t("childDetail.backToList")}
        </button>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  if (!child) return <p className="muted">{t("common.loading")}</p>;

  return (
    <div>
      <button type="button" className="link-back" onClick={() => navigate("/children")}>
        {t("childDetail.backToList")}
      </button>

      <div className="page-header">
        <h1>
          {child.firstName} {child.lastName}
        </h1>
        {isAdmin && !editing && (
          <div className="button-group">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              {t("childDetail.edit")}
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmingDelete(true)}>
              {t("childDetail.delete")}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="card form-card">
          <ChildForm
            initial={{
              firstName: child.firstName,
              lastName: child.lastName,
              parentContactEmail: child.parentContactEmail ?? "",
              parentContactPhone: child.parentContactPhone ?? "",
              notes: child.notes ?? "",
            }}
            submitLabel={t("childDetail.saveChanges")}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="card">
          <dl className="detail-fields">
            <div>
              <dt>{t("childDetail.parentEmail")}</dt>
              <dd>{child.parentContactEmail || t("common.none")}</dd>
            </div>
            <div>
              <dt>{t("childDetail.phone")}</dt>
              <dd>{child.parentContactPhone || t("common.none")}</dd>
            </div>
            <div>
              <dt>{t("childDetail.notes")}</dt>
              <dd>{child.notes || t("common.none")}</dd>
            </div>
          </dl>
        </div>
      )}

      <div className="card stack-card">
        <div className="page-header" style={{ marginBottom: "0.4rem" }}>
          <h2 style={{ marginBottom: 0 }}>{t("childDetail.report")}</h2>
          <div className="export-links">
            <a href={`/api/children/${child.id}/report?format=pdf`}>PDF</a>
            <a href={`/api/children/${child.id}/report?format=xlsx`}>Excel</a>
          </div>
        </div>
        <p className="muted footnote-tight" style={{ marginTop: 0 }}>
          {t("childDetail.reportDescription")}
        </p>
      </div>

      <div className="stack-card">
        <ChildPayments childId={child.id} />
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title={t("childDetail.deleteTitle")}
          message={t("childDetail.deleteMessage", { name: `${child.firstName} ${child.lastName}` })}
          confirmLabel={t("childDetail.delete")}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
