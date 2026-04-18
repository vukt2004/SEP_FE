import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { cmsMarketplaceReportsApi } from "@/services/api/cms/marketplaceReports.api";
import type {
  GetPaymentsReportParams,
  PaymentsReportData,
  PaymentsReportGroupBy,
} from "@/types/api/cms/marketplaceReports";

type RevenueFilters = {
  from: string;
  to: string;
  groupBy: PaymentsReportGroupBy;
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 14,
  padding: 18,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  color: "var(--text-2)",
  fontSize: 13,
  marginBottom: 6,
  display: "block",
};

function toStartOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

function toEndOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999`).toISOString();
}

export const RevenuePage: React.FC = () => {
  const { t, locale } = useTranslation();
  const localeTag = locale === "vi" ? "vi-VN" : "en-US";

  const defaultFilters: RevenueFilters = {
    from: "",
    to: "",
    groupBy: "Day",
  };

  const [filters, setFilters] = useState<RevenueFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<RevenueFilters>(defaultFilters);
  const [report, setReport] = useState<PaymentsReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo<GetPaymentsReportParams>(() => {
    const params: GetPaymentsReportParams = {
      groupBy: appliedFilters.groupBy,
    };

    if (appliedFilters.from) {
      params.from = toStartOfDayIso(appliedFilters.from);
    }

    if (appliedFilters.to) {
      params.to = toEndOfDayIso(appliedFilters.to);
    }

    return params;
  }, [appliedFilters]);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await cmsMarketplaceReportsApi.getPaymentsReport(queryParams);
      if (!data.isSuccess || !data.data) {
        setError(data.message || data.errors?.join(", ") || t("cmsRevenue.failedLoad"));
        return;
      }

      setReport(data.data);
    } catch {
      setError(t("cmsRevenue.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [queryParams, t]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  const maxAmount = useMemo(() => {
    if (!report || report.items.length === 0) return 1;
    return Math.max(...report.items.map((item) => item.amount), 1);
  }, [report]);

  const formatOrbit = (amount: number) => `${amount.toLocaleString(localeTag)} OC`;

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatPeriod = (period: string) => {
    if (filters.groupBy === "Year") {
      return period;
    }

    if (filters.groupBy === "Month") {
      const date = new Date(`${period}-01T00:00:00`);
      if (Number.isNaN(date.getTime())) return period;
      return date.toLocaleDateString(localeTag, { month: "short", year: "numeric" });
    }

    const date = new Date(`${period}T00:00:00`);
    if (Number.isNaN(date.getTime())) return period;
    return date.toLocaleDateString(localeTag, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleApplyFilters = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (filters.from && filters.to && filters.from > filters.to) {
      setError(t("cmsRevenue.invalidDateRange"));
      return;
    }

    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "color-mix(in srgb, var(--primary) 18%, var(--surface))",
            color: "var(--primary)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <BarChart3 size={20} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: "var(--text)" }}>{t("cmsRevenue.title")}</h2>
          <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 14 }}>
            {t("cmsRevenue.subtitle")}
          </p>
        </div>
      </div>

      <form onSubmit={handleApplyFilters} style={{ ...cardStyle, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)" }}>
          <CalendarDays size={16} />
          <strong>{t("cmsRevenue.filters")}</strong>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>{t("cmsRevenue.from")}</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((prev) => ({ ...prev, from: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("cmsRevenue.to")}</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((prev) => ({ ...prev, to: e.target.value }))}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>{t("cmsRevenue.groupBy")}</label>
            <select
              value={filters.groupBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  groupBy: e.target.value as PaymentsReportGroupBy,
                }))
              }
              style={inputStyle}
            >
              <option value="Day">{t("cmsRevenue.groupBy.day")}</option>
              <option value="Month">{t("cmsRevenue.groupBy.month")}</option>
              <option value="Year">{t("cmsRevenue.groupBy.year")}</option>
            </select>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={handleClearFilters}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              borderRadius: 10,
              padding: "9px 13px",
              cursor: "pointer",
            }}
          >
            {t("cmsRevenue.clear")}
          </button>
          <button
            type="button"
            onClick={() => void fetchReport()}
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-2)",
              color: "var(--text)",
              borderRadius: 10,
              padding: "9px 13px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} />
            {t("cmsRevenue.refresh")}
          </button>
          <button
            type="submit"
            style={{
              border: "none",
              background: "var(--primary)",
              color: "white",
              borderRadius: 10,
              padding: "9px 13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("cmsRevenue.apply")}
          </button>
        </div>
      </form>

      {error ? (
        <div
          style={{
            ...cardStyle,
            borderColor: "color-mix(in srgb, var(--danger) 50%, var(--border))",
            color: "var(--danger)",
            background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("cmsRevenue.totalOrbit")}</div>
          <div style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {report ? formatOrbit(report.totalAmount) : "--"}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("cmsRevenue.totalVnd")}</div>
          <div style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {report ? formatVnd(report.totalAmountVnd) : "--"}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>{t("cmsRevenue.totalPayments")}</div>
          <div style={{ color: "var(--text)", fontSize: 24, fontWeight: 700, marginTop: 8 }}>
            {report ? report.totalCount.toLocaleString(localeTag) : "--"}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <strong style={{ color: "var(--text)" }}>{t("cmsRevenue.byPeriod")}</strong>
          {loading ? <span style={{ color: "var(--text-2)", fontSize: 13 }}>{t("loading")}</span> : null}
        </div>

        {!loading && (!report || report.items.length === 0) ? (
          <div style={{ padding: 24, color: "var(--text-2)", textAlign: "center" }}>
            {t("cmsRevenue.empty")}
          </div>
        ) : null}

        {report && report.items.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th style={headerCellStyle}>{t("cmsRevenue.table.period")}</th>
                  <th style={headerCellStyle}>{t("cmsRevenue.table.amount")}</th>
                  <th style={headerCellStyle}>{t("cmsRevenue.table.amountVnd")}</th>
                  <th style={headerCellStyle}>{t("cmsRevenue.table.count")}</th>
                  <th style={headerCellStyle}>{t("cmsRevenue.table.trend")}</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => {
                  const percent = Math.max((item.amount / maxAmount) * 100, 2);

                  return (
                    <tr key={`${item.period}-${filters.groupBy}`} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={bodyCellStyle}>{formatPeriod(item.period)}</td>
                      <td style={bodyCellStyle}>{formatOrbit(item.amount)}</td>
                      <td style={bodyCellStyle}>{formatVnd(item.amountVnd)}</td>
                      <td style={bodyCellStyle}>{item.count.toLocaleString(localeTag)}</td>
                      <td style={bodyCellStyle}>
                        <div
                          style={{
                            width: "100%",
                            maxWidth: 240,
                            height: 10,
                            borderRadius: 999,
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${percent}%`,
                              height: "100%",
                              background:
                                "linear-gradient(90deg, color-mix(in srgb, var(--primary) 70%, #0ea5e9), var(--primary))",
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const headerCellStyle: React.CSSProperties = {
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  textAlign: "left",
  padding: "12px 14px",
};

const bodyCellStyle: React.CSSProperties = {
  color: "var(--text)",
  fontSize: 14,
  padding: "12px 14px",
  verticalAlign: "middle",
};

export default RevenuePage;