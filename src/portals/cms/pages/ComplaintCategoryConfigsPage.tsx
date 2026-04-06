import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { cmsComplaintsApi } from "@/services/api/cms/complaints.api";
import type { CmsComplaintCategoryConfigItem } from "@/types/api/cms/complaints";
import { Modal } from "@/portals/cms/components/Modal";
import { useTranslation } from "@/lib/i18n/translations";

type CategoryFormState = {
  categoryKey: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  sortOrder: number;
};

const EMPTY_FORM: CategoryFormState = {
  categoryKey: "",
  displayName: "",
  description: "",
  isEnabled: true,
  sortOrder: 0,
};

function normalizeKey(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "");
}

function validateForm(form: CategoryFormState, isCreateMode: boolean, t: (key: string) => string) {
  const errors: Record<string, string> = {};

  if (isCreateMode) {
    if (!form.categoryKey.trim())
      errors.categoryKey = t("complaints.cms.validation.categoryKeyRequired");
    else if (!/^[a-zA-Z0-9_-]{1,100}$/.test(form.categoryKey)) {
      errors.categoryKey = t("complaints.cms.validation.categoryKeyInvalid");
    }
  }

  if (!form.displayName.trim())
    errors.displayName = t("complaints.cms.validation.displayNameRequired");
  else if (form.displayName.trim().length > 150)
    errors.displayName = t("complaints.cms.validation.displayNameMax");

  if (form.description.trim().length > 500)
    errors.description = t("complaints.cms.validation.descriptionMax");

  if (!Number.isFinite(form.sortOrder))
    errors.sortOrder = t("complaints.cms.validation.sortOrderInvalid");

  return errors;
}

export default function ComplaintCategoryConfigsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<CmsComplaintCategoryConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(true);
  const [form, setForm] = useState<CategoryFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName),
      ),
    [items],
  );

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await cmsComplaintsApi.getCategoryConfigs();
      if (!response.data.isSuccess || !response.data.data) {
        setError(response.data.message || t("complaints.cms.error.load"));
        return;
      }
      setItems(response.data.data);
    } catch {
      setError(t("complaints.cms.error.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 2600);
    return () => window.clearTimeout(timer);
  }, [success]);

  function openCreateModal() {
    setIsCreateMode(true);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  }

  function openEditModal(item: CmsComplaintCategoryConfigItem) {
    setIsCreateMode(false);
    setForm({
      categoryKey: item.categoryKey,
      displayName: item.displayName,
      description: item.description ?? "",
      isEnabled: item.isEnabled,
      sortOrder: item.sortOrder,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: CategoryFormState = {
      ...form,
      categoryKey: normalizeKey(form.categoryKey),
      displayName: form.displayName.trim(),
      description: form.description.trim(),
    };
    const errors = validateForm(payload, isCreateMode, t);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      const res = await cmsComplaintsApi.upsertCategoryConfig(payload.categoryKey, {
        displayName: payload.displayName,
        description: payload.description || undefined,
        isEnabled: payload.isEnabled,
        sortOrder: payload.sortOrder,
      });

      if (!res.data.isSuccess) {
        setFormErrors({ submit: res.data.message || t("complaints.cms.error.save") });
        return;
      }

      setIsModalOpen(false);
      setSuccess(res.data.message || t("complaints.cms.success.saved"));
      await fetchItems();
    } catch {
      setFormErrors({ submit: t("complaints.cms.error.save") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: CmsComplaintCategoryConfigItem) {
    const confirmed = window.confirm(
      t("complaints.cms.confirmDelete")
        .replace("{displayName}", item.displayName)
        .replace("{categoryKey}", item.categoryKey),
    );
    if (!confirmed) return;

    try {
      setSubmitting(true);
      const res = await cmsComplaintsApi.deleteCategoryConfig(item.categoryKey);
      if (!res.data.isSuccess) {
        setError(res.data.message || t("complaints.cms.error.delete"));
        return;
      }
      setSuccess(res.data.message || t("complaints.cms.success.deleted"));
      await fetchItems();
    } catch {
      setError(t("complaints.cms.error.delete"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{ padding: "24px", maxWidth: "1280px", margin: "0 auto", display: "grid", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: "var(--text)" }}>{t("complaints.cms.title")}</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-2)" }}>
            {t("complaints.cms.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={fetchItems}
            disabled={loading}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "8px 12px",
              background: "var(--surface)",
              color: "var(--text)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            <RefreshCw size={14} />
            {t("complaints.cms.refresh")}
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "8px 12px",
              background: "var(--primary)",
              color: "white",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            {t("complaints.cms.newCategory")}
          </button>
        </div>
      </div>

      {success ? (
        <div
          style={{
            border: "1px solid rgba(34,197,94,0.35)",
            borderRadius: 10,
            padding: 10,
            color: "#16a34a",
            background: "var(--surface)",
          }}
        >
          {success}
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: 10,
            padding: 10,
            color: "var(--danger)",
            background: "var(--surface)",
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.categoryKey")}
                </th>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.displayName")}
                </th>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.description")}
                </th>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.sort")}
                </th>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.enabled")}
                </th>
                <th
                  style={{ textAlign: "left", padding: 12, color: "var(--text-2)", fontSize: 12 }}
                >
                  {t("complaints.cms.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {!loading && sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{ padding: 20, textAlign: "center", color: "var(--text-2)" }}
                  >
                    {t("complaints.cms.empty")}
                  </td>
                </tr>
              ) : null}

              {sortedItems.map((item) => (
                <tr key={item.categoryKey} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: 12, fontFamily: "monospace" }}>{item.categoryKey}</td>
                  <td style={{ padding: 12, fontWeight: 600 }}>{item.displayName}</td>
                  <td style={{ padding: 12, color: "var(--text-2)" }}>
                    {item.description || t("complaints.cms.table.none")}
                  </td>
                  <td style={{ padding: 12 }}>{item.sortOrder}</td>
                  <td style={{ padding: 12 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        padding: "4px 10px",
                        fontSize: 12,
                        color: item.isEnabled ? "#16a34a" : "var(--text-2)",
                        background: item.isEnabled ? "rgba(34,197,94,0.12)" : "var(--bg)",
                      }}
                    >
                      {item.isEnabled ? t("complaints.cms.enabled") : t("complaints.cms.disabled")}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        style={{
                          border: "1px solid var(--border)",
                          background: "var(--bg)",
                          color: "var(--text)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <Pencil size={13} />
                        {t("edit")}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => handleDelete(item)}
                        style={{
                          border: "1px solid rgba(239,68,68,0.35)",
                          background: "rgba(239,68,68,0.08)",
                          color: "var(--danger)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          cursor: submitting ? "not-allowed" : "pointer",
                          display: "inline-flex",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={13} />
                        {t("complaints.cms.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!submitting) setIsModalOpen(false);
        }}
        title={
          isCreateMode ? t("complaints.cms.modal.createTitle") : t("complaints.cms.modal.editTitle")
        }
        maxWidth="680px"
      >
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
                {t("complaints.cms.table.categoryKey")}
              </label>
              <input
                value={form.categoryKey}
                disabled={!isCreateMode}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    categoryKey: normalizeKey(e.target.value),
                  }))
                }
                maxLength={100}
                placeholder={t("complaints.cms.placeholder.categoryKey")}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: isCreateMode
                    ? "var(--bg)"
                    : "color-mix(in srgb, var(--bg) 80%, #000000 0%)",
                  color: "var(--text)",
                }}
              />
              {formErrors.categoryKey ? (
                <span style={{ color: "var(--danger)", fontSize: 12 }}>
                  {formErrors.categoryKey}
                </span>
              ) : null}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
                {t("complaints.cms.table.sort")}
              </label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(e.target.value),
                  }))
                }
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              {formErrors.sortOrder ? (
                <span style={{ color: "var(--danger)", fontSize: 12 }}>{formErrors.sortOrder}</span>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
              {t("complaints.cms.table.displayName")}
            </label>
            <input
              value={form.displayName}
              onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
              maxLength={150}
              placeholder={t("complaints.cms.placeholder.displayName")}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 12px",
                background: "var(--bg)",
                color: "var(--text)",
              }}
            />
            {formErrors.displayName ? (
              <span style={{ color: "var(--danger)", fontSize: 12 }}>{formErrors.displayName}</span>
            ) : null}
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ color: "var(--text)", fontWeight: 600, fontSize: 13 }}>
              {t("complaints.cms.table.description")}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              maxLength={500}
              placeholder={t("complaints.cms.placeholder.description")}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 12px",
                background: "var(--bg)",
                color: "var(--text)",
                resize: "vertical",
              }}
            />
            {formErrors.description ? (
              <span style={{ color: "var(--danger)", fontSize: 12 }}>{formErrors.description}</span>
            ) : null}
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "var(--text)",
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={form.isEnabled}
              onChange={(e) => setForm((prev) => ({ ...prev, isEnabled: e.target.checked }))}
            />
            {t("complaints.cms.enableForLearner")}
          </label>

          {formErrors.submit ? (
            <div style={{ color: "var(--danger)", fontSize: 13 }}>{formErrors.submit}</div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 14px",
                background: "var(--bg)",
                color: "var(--text)",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                border: "none",
                borderRadius: 10,
                padding: "10px 14px",
                background: "var(--primary)",
                color: "white",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting
                ? t("saving")
                : isCreateMode
                  ? t("complaints.cms.modal.create")
                  : t("complaints.cms.modal.update")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
