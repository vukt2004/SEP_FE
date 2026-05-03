import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cmsComplaintsApi } from "@/services/api/cms/complaints.api";
import { cmsUsersApi } from "@/services/api/cms/users.api";
import { type ComplaintStatus } from "@/types/api/complaints";
import type { CmsComplaintListQuery } from "@/types/api/cms/complaints";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { Search, SlidersHorizontal, Ticket, Hourglass, CheckCircle2, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

const pageSize = 10;
const DEFAULT_AVATAR = "/brand/avatar-fallback.png";
const SOLVED_FILTER_VALUE = "__solved";
const PENDING_FILTER_VALUE = "__pending";

type UserPreview = {
  name: string;
  avatarPath: string | null;
};

type TicketPreview = {
  description: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function ComplaintsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<
    Array<{
      id: string;
      userId: string;
      subject: string;
      category: string;
      description?: string;
      complaintStatus: ComplaintStatus;
      createdAt: string;
    }>
  >([]);
  const [userMap, setUserMap] = useState<Record<string, UserPreview>>({});
  const [ticketPreviewMap, setTicketPreviewMap] = useState<Record<string, TicketPreview>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hoveredTicketId, setHoveredTicketId] = useState("");
  const [previewPos, setPreviewPos] = useState({ x: 0, y: 0 });
  const [keywordInput, setKeywordInput] = useState(searchParams.get("keyword") ?? "");
  const [isKeywordComposing, setIsKeywordComposing] = useState(false);
  const [userNameFilter, setUserNameFilter] = useState(searchParams.get("userName") ?? "");
  const [sortBy, setSortBy] = useState<"id" | "userId" | "subject" | "createdAt" | "status">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, pending: 0, solved: 0 });

  const rawPage = Number(searchParams.get("pageNumber") || "1");
  const pageNumber = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const rawStatus = searchParams.get("status") ?? "";
  const status =
    rawStatus === SOLVED_FILTER_VALUE || rawStatus === PENDING_FILTER_VALUE
      ? rawStatus
      : ((rawStatus as ComplaintStatus | "") ?? "");
  const keyword = searchParams.get("keyword") ?? "";
  const userName = searchParams.get("userName") ?? "";
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
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError("");
        const params: CmsComplaintListQuery = {
          pageNumber,
          pageSize,
          keyword: keyword || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        };
        if (status === SOLVED_FILTER_VALUE) params.statusGroup = "solved";
        else if (status === PENDING_FILTER_VALUE) params.statusGroup = "pending";

        const res = await cmsComplaintsApi.getComplaints(params);
        if (!mounted) return;
        if (!res.data.isSuccess || !res.data.data) {
          setError(res.data.message || t("complaints.failedLoad"));
          return;
        }
        const data = res.data.data;
        setServerTotalPages(Math.max(1, data.totalPages || 1));
        setItems(data.items);
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
  }, [retryToken, pageNumber, keyword, dateFrom, dateTo, status, t]);

  useEffect(() => {
    let mounted = true;
    async function loadStats() {
      const base: CmsComplaintListQuery = {
        pageNumber: 1,
        pageSize: 1,
        keyword: keyword || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      };
      try {
        if (status === SOLVED_FILTER_VALUE) {
          const r = await cmsComplaintsApi.getComplaints({ ...base, statusGroup: "solved" });
          if (!mounted || !r.data.isSuccess || !r.data.data) return;
          const n = r.data.data.totalItems;
          setStats({ total: n, pending: 0, solved: n });
          return;
        }
        if (status === PENDING_FILTER_VALUE) {
          const r = await cmsComplaintsApi.getComplaints({ ...base, statusGroup: "pending" });
          if (!mounted || !r.data.isSuccess || !r.data.data) return;
          const n = r.data.data.totalItems;
          setStats({ total: n, pending: n, solved: 0 });
          return;
        }
        const [allRes, pendRes, solRes] = await Promise.all([
          cmsComplaintsApi.getComplaints(base),
          cmsComplaintsApi.getComplaints({ ...base, statusGroup: "pending" }),
          cmsComplaintsApi.getComplaints({ ...base, statusGroup: "solved" }),
        ]);
        if (!mounted) return;
        setStats({
          total: allRes.data.data?.totalItems ?? 0,
          pending: pendRes.data.data?.totalItems ?? 0,
          solved: solRes.data.data?.totalItems ?? 0,
        });
      } catch {
        if (mounted) setStats({ total: 0, pending: 0, solved: 0 });
      }
    }
    loadStats();
    return () => {
      mounted = false;
    };
  }, [keyword, dateFrom, dateTo, status, retryToken]);

  useEffect(() => {
    if (loading) return;
    if (pageNumber > serverTotalPages && serverTotalPages >= 1) {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("pageNumber", String(serverTotalPages));
        return next;
      });
    }
  }, [loading, pageNumber, serverTotalPages, setSearchParams]);

  useEffect(() => {
    if (items.length === 0) return;
    let ignore = false;
    async function hydrateUsers() {
      const ids = Array.from(new Set(items.map((x) => x.userId).filter(Boolean)));
      const next: Record<string, UserPreview> = {};
      const results = await Promise.allSettled(ids.map((id) => cmsUsersApi.getUserById(id)));
      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const user = result.value.data.data;
        if (!user?.id) return;
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        next[user.id] = {
          name: fullName || user.email || user.id,
          avatarPath: user.avatarPath ?? null,
        };
      });
      if (!ignore) setUserMap(next);
    }
    hydrateUsers();
    return () => {
      ignore = true;
    };
  }, [items]);

  useEffect(() => {
    if (!hoveredTicketId || ticketPreviewMap[hoveredTicketId]) return;
    let ignore = false;
    async function hydrateTicketPreview() {
      try {
        const res = await cmsComplaintsApi.getComplaintById(hoveredTicketId);
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

  /** Server applies keyword, dates, status chip; user name is filtered on the current page only (display names are not indexed server-side). */
  const filteredItems = useMemo(() => {
    const userNameNorm = normalizeText(userName);
    if (!userNameNorm) return items;
    return items.filter((item) => {
      const name = normalizeText(userMap[item.userId]?.name ?? "");
      return name.includes(userNameNorm);
    });
  }, [items, userMap, userName]);
  const pendingCount = stats.pending;
  const solvedCount = stats.solved;
  const totalItems = stats.total;
  const totalPages = serverTotalPages;
  const sortedItems = useMemo(() => {
    const list = [...filteredItems];
    list.sort((a, b) => {
      let va = "";
      let vb = "";
      if (sortBy === "id") {
        va = a.id;
        vb = b.id;
      } else if (sortBy === "userId") {
        va = a.userId;
        vb = b.userId;
      } else if (sortBy === "subject") {
        va = a.subject;
        vb = b.subject;
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
  const pagedItems = sortedItems;
  const empty = useMemo(() => !loading && !error && pagedItems.length === 0, [error, loading, pagedItems.length]);
  const hoveredTicket = useMemo(
    () => sortedItems.find((item) => item.id === hoveredTicketId) ?? null,
    [hoveredTicketId, sortedItems],
  );

  useEffect(() => {
    const nextUserName = userNameFilter.trim();
    if (nextUserName === userName) return;

    const timeout = window.setTimeout(() => {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("pageNumber", "1");
        if (nextUserName) next.set("userName", nextUserName);
        else next.delete("userName");
        return next;
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [setSearchParams, userName, userNameFilter]);

  function updateQuery(key: string, value: string) {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      const currentValue = p.get(key) ?? "";
      if (value) next.set(key, value);
      else next.delete(key);

      const nextValue = next.get(key) ?? "";
      if (nextValue === currentValue) return p;

      next.set("pageNumber", "1");
      return next;
    });
  }

  function handleSort(column: "id" | "userId" | "subject" | "createdAt" | "status") {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  }

  function goToPage(nextPage: number) {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("pageNumber", String(Math.min(Math.max(1, nextPage), totalPages)));
      return next;
    });
  }

  function getPaginationItems(current: number, total: number): Array<number | "..."> {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, "...", total];
    }
    if (current >= total - 3) {
      return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, "...", current - 1, current, current + 1, "...", total];
  }

  return (
    <div style={{ padding: 24, maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16 }}>
      <h1 style={{ margin: 0 }}>{t("complaints.supportTickets")}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))", gap: 12 }}>
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

      {error ? (
        <div style={{ color: "var(--danger)" }}>
          {error}{" "}
          <button type="button" onClick={() => setRetryToken((x) => x + 1)}>
            {t("retry")}
          </button>
        </div>
      ) : null}

      <div style={{ border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", overflow: "hidden" }}>
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
                  { labelKey: "complaints.filter.all", value: "" },
                  { labelKey: "complaints.filter.solved", value: SOLVED_FILTER_VALUE },
                  { labelKey: "complaints.filter.pending", value: PENDING_FILTER_VALUE },
                ].map((s) => (
                  <button
                    key={s.value || "all"}
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
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-2)" }} />
                <input
                  placeholder={t("complaints.cmsSearchPlaceholder")}
                  value={keywordInput}
                  onCompositionStart={() => setIsKeywordComposing(true)}
                  onCompositionEnd={(e) => {
                    setIsKeywordComposing(false);
                    const value = e.currentTarget.value;
                    setKeywordInput(value);
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setKeywordInput(value);
                  }}
                  style={{ padding: "8px 12px 8px 32px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", minWidth: 320, width: 420, maxWidth: "52vw" }}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((v) => !v)}
                style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", background: showAdvancedFilters ? "rgba(59,130,246,0.12)" : "var(--bg)", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                title={t("complaints.filter.toggleAdvanced")}
              >
                <SlidersHorizontal size={14} />
                {t("complaints.filter.button")}
              </button>
            </div>
          </div>
          {showAdvancedFilters ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 8, marginTop: 10 }}>
              <input
                placeholder={t("complaints.filter.userNamePlaceholder")}
                value={userNameFilter}
                onChange={(e) => setUserNameFilter(e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)" }}
              />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => updateQuery("dateFrom", e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)" }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => updateQuery("dateTo", e.target.value)}
                style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg)" }}
              />
            </div>
          ) : null}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("id")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color: "inherit" }}>{t("complaints.table.ticketId")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("userId")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color: "inherit" }}>{t("complaints.table.requestedBy")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("subject")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color: "inherit" }}>{t("complaints.table.subject")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("createdAt")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color: "inherit" }}>{t("complaints.table.createDate")} <ChevronsUpDown size={13} /></button>
                </th>
                <th style={{ textAlign: "left", padding: 12, fontSize: 12, color: "var(--text-2)" }}>
                  <button type="button" onClick={() => handleSort("status")} style={{ border: "none", background: "transparent", padding: 0, display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer", color: "inherit" }}>{t("complaints.table.status")} <ChevronsUpDown size={13} /></button>
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
                  onClick={() => navigate(`/cms/complaints/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/cms/complaints/${c.id}`);
                    }
                  }}
                  tabIndex={0}
                  aria-label={t("complaints.openComplaintAria").replace("{subject}", c.subject)}
                >
                  <td style={{ padding: 12, fontWeight: 700 }}>#{c.id.slice(0, 8)}</td>
                  <td style={{ padding: 12, color: "var(--text-2)" }}>
                    {userMap[c.userId]?.name ?? c.userId.slice(0, 8)}
                  </td>
                  <td style={{ padding: 12 }}>{c.subject}</td>
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
              <button
                type="button"
                disabled={pageNumber <= 1}
                onClick={() => goToPage(pageNumber - 1)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  background: "var(--bg)",
                  color: "var(--text)",
                  cursor: pageNumber <= 1 ? "not-allowed" : "pointer",
                  opacity: pageNumber <= 1 ? 0.6 : 1,
                }}
              >
                {t("previous")}
              </button>
              {getPaginationItems(pageNumber, totalPages).map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} style={{ padding: "0 4px" }}>
                    ...
                  </span>
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
                      cursor: "pointer",
                    }}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={pageNumber >= totalPages}
                onClick={() => goToPage(pageNumber + 1)}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  background: "var(--bg)",
                  color: "var(--text)",
                  cursor: pageNumber >= totalPages ? "not-allowed" : "pointer",
                  opacity: pageNumber >= totalPages ? 0.6 : 1,
                }}
              >
                {t("next")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
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
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>{t("complaints.quickPreview")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={userMap[hoveredTicket.userId]?.avatarPath || DEFAULT_AVATAR}
              alt={userMap[hoveredTicket.userId]?.name || hoveredTicket.userId}
              style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }}
            />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {userMap[hoveredTicket.userId]?.name ?? hoveredTicket.userId.slice(0, 8)}
            </div>
          </div>
          <div style={{ fontWeight: 700 }}>
            {hoveredTicket.category} • {hoveredTicket.userId.replace(/-/g, "").slice(0, 5)}
          </div>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {ticketPreviewMap[hoveredTicket.id]?.description || t("complaints.loadingDescription")}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            {new Date(hoveredTicket.createdAt).toLocaleString()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
