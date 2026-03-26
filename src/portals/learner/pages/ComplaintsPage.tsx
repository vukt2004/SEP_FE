import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import type { ComplaintStatus } from "@/types/api/complaints";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { validateCreateComplaintForm } from "@/shared/components/complaints/complaint.utils";
import { Search, SlidersHorizontal, Ticket, Hourglass, CheckCircle2, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

const pageSize = 10;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ComplaintsPage() {
  const commonCategories = [
    "Bug Report",
    "Payment/Billing",
    "Account/Login",
    "Feature Request",
    "Performance",
    "UI/UX",
    "Other",
  ] as const;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<
    Array<{
      id: string;
      subject: string;
      category: string;
      complaintStatus: ComplaintStatus;
      createdAt: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState({ subject: "", category: "", description: "" });
  const [categoryOption, setCategoryOption] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hoveredTicketId, setHoveredTicketId] = useState<string>("");
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [ticketPreviewMap, setTicketPreviewMap] = useState<Record<string, { description: string }>>({});
  const [keywordInput, setKeywordInput] = useState(searchParams.get("keyword") ?? "");
  const [isKeywordComposing, setIsKeywordComposing] = useState(false);
  const [sortBy, setSortBy] = useState<"id" | "subject" | "category" | "createdAt" | "status">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const pageNumber = Number(searchParams.get("pageNumber") || "1");
  const status = (searchParams.get("status") as ComplaintStatus | null) ?? "";
  const keyword = searchParams.get("keyword") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  useEffect(() => {
    setKeywordInput(keyword);
  }, [keyword]);

  useEffect(() => {
    if (isKeywordComposing) return;
    const timeout = window.setTimeout(() => {
      updateQuery("keyword", keywordInput.normalize("NFC"));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [isKeywordComposing, keywordInput]);

  useEffect(() => {
    if (!createSuccess) return;
    const id = window.setTimeout(() => setCreateSuccess(""), 2800);
    return () => window.clearTimeout(id);
  }, [createSuccess]);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError("");
        const first = await learnerComplaintsApi.getComplaints({ pageNumber: 1, pageSize: 100 });
        if (!mounted) return;
        if (!first.data.isSuccess || !first.data.data) {
          setError(first.data.message || t("complaints.failedLoad"));
          return;
        }
        let all = [...first.data.data.items];
        const pages = first.data.data.totalPages || 1;
        if (pages > 1) {
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, idx) =>
              learnerComplaintsApi.getComplaints({ pageNumber: idx + 2, pageSize: 100 }),
            ),
          );
          rest.forEach((res) => {
            if (res.data.isSuccess && res.data.data) all = all.concat(res.data.data.items);
          });
        }
        if (!mounted) return;
        setItems(all);
      } catch {
        if (!mounted) return;
        setError(t("complaints.failedLoad"));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [retryToken, t]);

  const filteredItems = useMemo(() => {
    const keywordNorm = normalizeText(keyword);
    return items.filter((item) => {
      if (status && item.complaintStatus !== status) return false;
      if (dateFrom && new Date(item.createdAt) < new Date(dateFrom)) return false;
      if (dateTo && new Date(item.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;
      if (keywordNorm) {
        const haystack = normalizeText([item.subject, item.category].join(" "));
        if (!haystack.includes(keywordNorm)) return false;
      }
      return true;
    });
  }, [dateFrom, dateTo, items, keyword, status]);

  const pendingCount = useMemo(
    () => filteredItems.filter((x) => x.complaintStatus === "Open" || x.complaintStatus === "InProgress").length,
    [filteredItems],
  );
  const solvedCount = useMemo(
    () => filteredItems.filter((x) => x.complaintStatus === "Resolved").length,
    [filteredItems],
  );
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let va = "";
      let vb = "";
      if (sortBy === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortBy === "subject") {
        va = a.subject;
        vb = b.subject;
      } else if (sortBy === "category") {
        va = a.category;
        vb = b.category;
      } else if (sortBy === "status") {
        va = a.complaintStatus;
        vb = b.complaintStatus;
      } else {
        va = a.createdAt;
        vb = b.createdAt;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredItems, sortBy, sortDir]);
  const pagedItems = useMemo(
    () => sortedItems.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
    [pageNumber, sortedItems],
  );
  const empty = useMemo(() => !loading && !error && pagedItems.length === 0, [error, loading, pagedItems.length]);
  const hoveredTicket = useMemo(
    () => pagedItems.find((item) => item.id === hoveredTicketId) ?? null,
    [hoveredTicketId, pagedItems],
  );

  useEffect(() => {
    if (!hoveredTicketId || ticketPreviewMap[hoveredTicketId]) return;
    let ignore = false;
    async function hydrateTicketPreview() {
      try {
        const res = await learnerComplaintsApi.getComplaintById(hoveredTicketId);
        const detail = res.data.data;
        if (!res.data.isSuccess || !detail || ignore) return;
        setTicketPreviewMap((prev) => ({
          ...prev,
          [hoveredTicketId]: { description: detail.description || "" },
        }));
      } catch {
        // ignore preview errors
      }
    }
    hydrateTicketPreview();
    return () => {
      ignore = true;
    };
  }, [hoveredTicketId, ticketPreviewMap]);

  function updateQuery(key: string, value: string) {
    setSearchParams((p) => {
      p.set("pageNumber", "1");
      if (value) p.set(key, value);
      else p.delete(key);
      return p;
    });
  }

  function goToPage(nextPage: number) {
    setSearchParams((p) => {
      p.set("pageNumber", String(Math.min(Math.max(1, nextPage), totalPages)));
      return p;
    });
  }

  function handleSort(column: "id" | "subject" | "category" | "createdAt" | "status") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  function getPaginationItems(current: number, total: number): Array<number | "..."> {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const errors = validateCreateComplaintForm(createForm);
    setFieldErrors(errors);
    setCreateError("");
    setCreateSuccess("");
    if (Object.keys(errors).length > 0) return;
    try {
      setCreating(true);
      const res = await learnerComplaintsApi.createComplaint(createForm);
      if (!res.data.isSuccess) {
        setCreateError(res.data.message || t("complaints.failedCreate"));
        return;
      }
      setCreateForm({ subject: "", category: "", description: "" });
      setCategoryOption("");
      setCreateSuccess(res.data.message || t("complaints.createSuccess"));
      setRetryToken((x) => x + 1);
    } catch {
      setCreateError(t("complaints.failedCreate"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ position: "relative", display: "grid", gap: 16 }}>
      {createSuccess ? (
        <div
          style={{
            position: "fixed",
            top: 86,
            right: 24,
            zIndex: 60,
            minWidth: 280,
            maxWidth: 420,
            border: "1px solid rgba(34,197,94,0.35)",
            background: "var(--surface)",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={17} color="#16a34a" />
          <span style={{ fontSize: 14, color: "var(--text)" }}>{createSuccess}</span>
          <button
            type="button"
            onClick={() => setCreateSuccess("")}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      ) : null}

      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(900px 520px at 12% 12%, rgba(37,99,235,0.16), transparent 62%), radial-gradient(780px 520px at 86% 18%, rgba(249,115,22,0.12), transparent 64%), radial-gradient(680px 520px at 70% 86%, rgba(56,189,248,0.10), transparent 66%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 96%, #ffffff) 0%, var(--bg) 100%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(0.2px)",
        }}
      />
      <h1 style={{ margin: 0, position: "relative", zIndex: 1 }}>{t("complaints.mySupportTickets")}</h1>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
          gap: 12,
        }}
      >
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(99, 102, 241, 0.12)", color: "#6366f1", display: "grid", placeItems: "center" }}>
            <Ticket size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{totalItems}</div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("complaints.totalTickets")}</div>
          </div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(245, 158, 11, 0.13)", color: "#d97706", display: "grid", placeItems: "center" }}>
            <Hourglass size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{pendingCount}</div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("complaints.pendingTickets")}</div>
          </div>
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(34, 197, 94, 0.13)", color: "#16a34a", display: "grid", placeItems: "center" }}>
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{solvedCount}</div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("complaints.solvedTickets")}</div>
          </div>
        </div>
      </div>

      <section
        style={{
          position: "relative",
          zIndex: 1,
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 16,
          background: "var(--surface)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: showCreateForm ? 14 : 0 }}>
          <h3 style={{ margin: 0 }}>{t("complaints.createTicket")}</h3>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((v) => !v);
              setCreateError("");
              setFieldErrors({});
            }}
            style={{
              border: "none",
              borderRadius: 10,
              padding: "9px 14px",
              background: showCreateForm ? "var(--bg)" : "var(--primary)",
              color: showCreateForm ? "var(--text)" : "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {showCreateForm ? "Close" : t("complaints.createTicket")}
          </button>
        </div>
        {showCreateForm ? (
          <form onSubmit={handleCreate} style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {t("complaints.subject")}
              </label>
              <input
                placeholder={t("complaints.subjectPlaceholder")}
                value={createForm.subject}
                onChange={(e) => setCreateForm((p) => ({ ...p, subject: e.target.value }))}
                maxLength={200}
                style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--bg)", color: "var(--text)" }}
              />
              {fieldErrors.subject ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{fieldErrors.subject}</div> : null}
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                {t("complaints.category")}
              </label>
              <select
                value={categoryOption}
                onChange={(e) => {
                  const next = e.target.value;
                  setCategoryOption(next);
                  if (next !== "Other") setCreateForm((p) => ({ ...p, category: next }));
                  else setCreateForm((p) => ({ ...p, category: "" }));
                }}
                style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--bg)", color: "var(--text)" }}
              >
                <option value="">{t("complaints.selectCategory")}</option>
                {commonCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`complaints.category.${cat}`)}
                  </option>
                ))}
              </select>
              {categoryOption === "Other" ? (
                <input
                  placeholder={t("complaints.customCategoryPlaceholder")}
                  value={createForm.category}
                  onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value }))}
                  maxLength={50}
                  style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--bg)", color: "var(--text)" }}
                />
              ) : null}
              {fieldErrors.category ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{fieldErrors.category}</div> : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
              {t("complaints.description")}
            </label>
            <textarea
              placeholder={t("complaints.descriptionPlaceholder")}
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              maxLength={5000}
              rows={6}
              style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--bg)", color: "var(--text)", resize: "vertical" }}
            />
            {fieldErrors.description ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{fieldErrors.description}</div> : null}
          </div>

          {createError ? <div style={{ color: "var(--danger)" }}>{createError}</div> : null}
          <div style={{ display: "flex", justifyContent: "end" }}>
            <button
              disabled={creating}
              type="submit"
              style={{ border: "none", borderRadius: 10, padding: "10px 16px", background: "var(--primary)", color: "white", fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.75 : 1 }}
            >
              {creating ? t("submitting") : t("complaints.createTicket")}
            </button>
          </div>
          </form>
        ) : null}
      </section>

      {error ? (
        <div style={{ position: "relative", zIndex: 1, color: "var(--danger)" }}>
          {error} <button onClick={() => setRetryToken((x) => x + 1)}>{t("retry")}</button>
        </div>
      ) : null}

      <section
        style={{
          position: "relative",
          zIndex: 1,
          border: "1px solid var(--border)",
          borderRadius: 14,
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{t("complaints.supportTickets")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 4,
                  borderRadius: 12,
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                {[
                  { label: t("complaints.filter.all"), value: "" },
                  { label: t("complaints.filter.solved"), value: "Resolved" },
                  { label: t("complaints.filter.pending"), value: "Open" },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => updateQuery("status", s.value)}
                    style={{
                      minWidth: 74,
                      border: "none",
                      borderRadius: 10,
                      padding: "7px 12px",
                      background: status === s.value ? "var(--surface)" : "transparent",
                      color: status === s.value ? "var(--text)" : "var(--text-2)",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)" }} />
                <input
                  placeholder={t("complaints.searchPlaceholder")}
                  value={keywordInput}
                  onCompositionStart={() => setIsKeywordComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsKeywordComposing(false);
                    setKeywordInput(e.currentTarget.value);
                  }}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  style={{ padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", minWidth: 320, width: 420, maxWidth: "52vw" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((v) => !v)}
                style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", background: showAdvancedFilters ? "rgba(59,130,246,0.12)" : "var(--bg)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
              >
                <SlidersHorizontal size={14} />
                {t("complaints.filter.button")}
              </button>
            </div>
          </div>
          {showAdvancedFilters ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 8, marginTop: 10 }}>
              <input type="date" value={dateFrom} onChange={(e) => updateQuery("dateFrom", e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)" }} />
              <input type="date" value={dateTo} onChange={(e) => updateQuery("dateTo", e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)" }} />
            </div>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("id")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", cursor: "pointer" }}>{t("complaints.table.ticketId")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("subject")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", cursor: "pointer" }}>{t("complaints.table.subject")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("category")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", cursor: "pointer" }}>{t("complaints.table.category")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("createdAt")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", cursor: "pointer" }}>{t("complaints.table.createDate")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("status")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, color: "inherit", cursor: "pointer" }}>{t("complaints.table.status")} <ChevronsUpDown size={13} /></button>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.map((c) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: hoveredTicketId === c.id ? "color-mix(in srgb, var(--primary) 8%, transparent)" : "transparent",
                  }}
                  onMouseEnter={() => setHoveredTicketId(c.id)}
                  onMouseMove={(e) => setPreviewPos({ x: e.clientX + 16, y: e.clientY + 16 })}
                  onMouseLeave={() => setHoveredTicketId((prev) => (prev === c.id ? "" : prev))}
                  onClick={() => navigate(`/app/complaints/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/app/complaints/${c.id}`);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Open complaint ${c.subject}`}
                >
                  <td style={{ padding: 12, fontWeight: 700 }}>#{c.id.slice(0, 8)}</td>
                  <td style={{ padding: 12 }}>{c.subject}</td>
                  <td style={{ padding: 12, color: "var(--text-2)" }}>{c.category}</td>
                  <td style={{ padding: 12, color: "var(--text-2)" }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 12 }}>
                    <ComplaintStatusBadge status={c.complaintStatus} />
                  </td>
                </tr>
              ))}
              {empty ? (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: "center", color: "var(--text-2)" }}>
                    {t("complaints.noComplaints")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {!empty ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, padding: 12, color: "var(--text-2)", fontSize: 13 }}>
            <span>
              {t("complaints.page")} {pageNumber} {t("of")} {totalPages}
            </span>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <button type="button" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
                {t("previous")}
              </button>
              {getPaginationItems(pageNumber, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`}>...</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    style={{
                      minWidth: 34,
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      background: item === pageNumber ? "var(--primary)" : "var(--bg)",
                      color: item === pageNumber ? "white" : "var(--text)",
                      fontWeight: item === pageNumber ? 700 : 500,
                    }}
                  >
                    {item}
                  </button>
                ),
              )}
              <button type="button" disabled={pageNumber >= totalPages} onClick={() => goToPage(pageNumber + 1)}>
                {t("next")}
              </button>
            </div>
          </div>
        ) : null}
      </section>
      {hoveredTicket ? (
        <div
          style={{
            position: "fixed",
            left: previewPos.x,
            top: previewPos.y,
            zIndex: 80,
            pointerEvents: "none",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 12px",
            background: "var(--surface)",
            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
            display: "grid",
            gap: 4,
            maxWidth: 360,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>Quick preview</div>
          <div style={{ fontWeight: 700 }}>
            {hoveredTicket.category} • {hoveredTicket.id.replace(/-/g, "").slice(0, 5)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {ticketPreviewMap[hoveredTicket.id]?.description || "Loading description..."}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            {new Date(hoveredTicket.createdAt).toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
