import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSearchParams } from "react-router-dom";
import { cmsMarketplaceReportsApi } from "@/services/api/cms/marketplaceReports.api";
import { cmsOrbitCoinApi } from "@/services/api/cms/orbitcoin.api";
import { useTranslation } from "@/lib/i18n/translations";
import type {
  CmsOrbitCoinInsightsData,
  CmsMarketplaceTransactionItem,
  CmsOrbitCoinTransactionItem,
  CmsEscrowPendingTransaction,
  CmsPagedResponse,
  CmsRevenueOverviewData,
  PaymentsReportGroupBy,
} from "@/types/api/cms/marketplaceReports";

type TxTab = "marketplace" | "orbitcoin";
type FinanceMainTab = "overview" | "transactions";

const formatVnd = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);

const formatOc = (value: number) =>
  `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)} OC`;

function formatDateTime(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN");
}

function toStartOfDayIso(dateInput: string): string {
  return `${dateInput}T00:00:00`;
}

function toEndOfDayIso(dateInput: string): string {
  return `${dateInput}T23:59:59.999`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const FinanceDashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "transactions" ? "transactions" : "overview";
  const [mainTab, setMainTab] = useState<FinanceMainTab>(initialTab);
  const [groupBy, setGroupBy] = useState<PaymentsReportGroupBy>("Day");
  const [activeTab, setActiveTab] = useState<TxTab>("marketplace");
  const [marketStatusFilter, setMarketStatusFilter] = useState("All");
  const [orbitTypeFilter, setOrbitTypeFilter] = useState("All");
  const [marketSearch, setMarketSearch] = useState("");
  const [orbitSearch, setOrbitSearch] = useState("");
  const [marketPage, setMarketPage] = useState(1);
  const [orbitPage, setOrbitPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [revenueOverview, setRevenueOverview] = useState<CmsRevenueOverviewData | null>(null);
  const [marketplaceRows, setMarketplaceRows] = useState<CmsMarketplaceTransactionItem[]>([]);
  const [orbitRows, setOrbitRows] = useState<CmsOrbitCoinTransactionItem[]>([]);
  const [pendingRows, setPendingRows] = useState<CmsEscrowPendingTransaction[]>([]);
  const [pendingMeta, setPendingMeta] = useState<CmsPagedResponse<CmsEscrowPendingTransaction> | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [orbitInsightsData, setOrbitInsightsData] = useState<CmsOrbitCoinInsightsData | null>(null);
  const [marketMeta, setMarketMeta] = useState<CmsPagedResponse<CmsMarketplaceTransactionItem> | null>(null);
  const [orbitMeta, setOrbitMeta] = useState<CmsPagedResponse<CmsOrbitCoinTransactionItem> | null>(null);
  const [exchangeRate, setExchangeRate] = useState(1000);

  const queryParams = useMemo(
    () => ({
      from: from ? toStartOfDayIso(from) : undefined,
      to: to ? toEndOfDayIso(to) : undefined,
      groupBy,
    }),
    [from, to, groupBy],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [revenueRes, marketRes, orbitRes, orbitInsightsRes, rateRes, pendingRes] = await Promise.all([
        cmsMarketplaceReportsApi.getRevenueOverview(queryParams),
        cmsMarketplaceReportsApi.getMarketplaceTransactions({
          pageNumber: marketPage,
          pageSize,
          from: queryParams.from,
          to: queryParams.to,
          paymentStatus: marketStatusFilter !== "All" ? marketStatusFilter : undefined,
          search: marketSearch.trim() || undefined,
        }),
        cmsMarketplaceReportsApi.getOrbitCoinTransactions({
          pageNumber: orbitPage,
          pageSize,
          from: queryParams.from,
          to: queryParams.to,
          transactionType: orbitTypeFilter !== "All" ? orbitTypeFilter : undefined,
          search: orbitSearch.trim() || undefined,
        }),
        cmsMarketplaceReportsApi.getOrbitCoinInsights({ top: 5 }),
        cmsOrbitCoinApi.getExchangeRate(),
        cmsMarketplaceReportsApi.getEscrowPending({
          pageNumber: 1,
          pageSize: 1,
          from: queryParams.from,
          to: queryParams.to,
        }),
      ]);
      setRevenueOverview(revenueRes.data.data ?? null);
      setMarketMeta(marketRes.data.data ?? null);
      setOrbitMeta(orbitRes.data.data ?? null);
      setMarketplaceRows(marketRes.data.data?.items ?? []);
      setOrbitRows(orbitRes.data.data?.items ?? []);
      setOrbitInsightsData(orbitInsightsRes.data?.data ?? null);
      setPendingAmount(pendingRes.data?.data?.totalPendingAmount ?? 0);
      if (rateRes.data?.isSuccess && typeof rateRes.data.data?.rate === "number" && rateRes.data.data.rate > 0) {
        setExchangeRate(rateRes.data.data.rate);
      }
    } finally {
      setLoading(false);
    }
  }, [queryParams, marketPage, orbitPage, pageSize, marketStatusFilter, orbitTypeFilter, marketSearch, orbitSearch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);


  const exportRevenue = async (format: "csv" | "xlsx" | "pdf") => {
    const res = await cmsMarketplaceReportsApi.exportRevenue({ ...queryParams, format });
    downloadBlob(res.data, `finance-revenue-report.${format}`);
  };

  const exportTransactions = async (format: "csv" | "xlsx" | "pdf") => {
    const res = await cmsMarketplaceReportsApi.exportTransactions({
      source: activeTab,
      format,
      from: queryParams.from,
      to: queryParams.to,
    });
    downloadBlob(res.data, `${activeTab}-transactions.${format}`);
  };

  const txRows = activeTab === "marketplace" ? marketplaceRows : orbitRows;
  const displayTxRows = txRows;
  const statusOptions = useMemo(() => {
    if (activeTab === "marketplace") {
      return ["All", "Completed", "Pending", "Failed", "Cancelled", "Refunded"];
    }
    return ["All", "Credit", "Debit"];
  }, [activeTab]);

  const transactionInsights = useMemo(() => {
    const total = displayTxRows.length;
    const completed = displayTxRows.filter((row) =>
      ("paymentStatus" in row ? row.paymentStatus : "Completed").toLowerCase().includes("completed"),
    ).length;
    const pending = displayTxRows.filter((row) =>
      ("paymentStatus" in row ? row.paymentStatus : "").toLowerCase().includes("pending"),
    ).length;
    const totalVnd = displayTxRows.reduce((sum, row) => {
      if ("amountVnd" in row && typeof row.amountVnd === "number" && row.amountVnd > 0) return sum + row.amountVnd;
      if (typeof row.amount === "number") return sum + Math.round(row.amount * exchangeRate);
      return sum;
    }, 0);
    return { total, completed, pending, totalVnd };
  }, [displayTxRows, exchangeRate]);

  const orbitInsights = useMemo(() => ({
    issuedOc: orbitInsightsData?.issuedOc ?? 0,
    consumedOc: orbitInsightsData?.consumedOc ?? 0,
    circulatingEstimate: orbitInsightsData?.circulatingOc ?? 0,
    topOcHolders: (orbitInsightsData?.topHolders ?? []).map((x) => ({
      name: x.userName,
      email: x.userEmail,
      balanceOc: x.balanceOc,
    })),
  }), [orbitInsightsData]);

  const currentSearch = activeTab === "marketplace" ? marketSearch : orbitSearch;
  const currentStatusFilter = activeTab === "marketplace" ? marketStatusFilter : orbitTypeFilter;
  const currentMeta = activeTab === "marketplace" ? marketMeta : orbitMeta;
  const totalPages = Math.max(1, currentMeta?.totalPages ?? 1);
  const currentPage = activeTab === "marketplace" ? marketPage : orbitPage;
  const pendingTotalPages = Math.max(1, pendingMeta?.totalPages ?? 1);
  const pendingAmountDisplay = exchangeRate > 0
    ? formatVnd(Math.round(pendingAmount * exchangeRate))
    : formatOc(pendingAmount);

  const onChangeSearch = (value: string) => {
    if (activeTab === "marketplace") {
      setMarketSearch(value);
      setMarketPage(1);
      return;
    }
    setOrbitSearch(value);
    setOrbitPage(1);
  };

  const onChangeStatus = (value: string) => {
    if (activeTab === "marketplace") {
      setMarketStatusFilter(value);
      setMarketPage(1);
      return;
    }
    setOrbitTypeFilter(value);
    setOrbitPage(1);
  };

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(totalPages, Math.max(1, nextPage));
    if (activeTab === "marketplace") {
      setMarketPage(safePage);
      return;
    }
    setOrbitPage(safePage);
  };

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await cmsMarketplaceReportsApi.getEscrowPending({
        pageNumber: pendingPage,
        pageSize,
        from: queryParams.from,
        to: queryParams.to,
        search: pendingSearch.trim() || undefined,
      });
      const payload = res.data?.data;
      setPendingMeta(payload?.transactions ?? null);
      setPendingRows(payload?.transactions?.items ?? []);
    } catch {
      setPendingError(t("cmsFinance.pending.error"));
    } finally {
      setPendingLoading(false);
    }
  }, [pageSize, pendingPage, pendingSearch, queryParams.from, queryParams.to, t]);

  useEffect(() => {
    if (!pendingOpen) return;
    void loadPending();
  }, [pendingOpen, loadPending]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t("cmsFinance.title")}</h1>
          <p className="text-[var(--text-2)]">{t("cmsFinance.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as PaymentsReportGroupBy)} className="rounded border px-3 py-2">
            <option value="Day">{t("cmsFinance.groupBy.day")}</option>
            <option value="Week">{t("cmsFinance.groupBy.week")}</option>
            <option value="Month">{t("cmsFinance.groupBy.month")}</option>
            <option value="Year">{t("cmsFinance.groupBy.year")}</option>
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border px-3 py-2" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border px-3 py-2" />
          <button onClick={() => void loadData()} className="rounded bg-blue-600 px-4 py-2 text-white">{t("cmsFinance.refresh")}</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button className={`rounded px-3 py-2 ${mainTab === "overview" ? "bg-blue-600 text-white" : "border"}`} onClick={() => setMainTab("overview")}>
          {t("cmsFinance.mainTabs.overview")}
        </button>
        <button className={`rounded px-3 py-2 ${mainTab === "transactions" ? "bg-blue-600 text-white" : "border"}`} onClick={() => setMainTab("transactions")}>
          {t("cmsFinance.mainTabs.transactions")}
        </button>
      </div>

      {mainTab === "overview" ? (
        <>
          <div className="rounded border p-4 bg-[var(--surface)] text-sm text-[var(--text-2)]">{t("cmsFinance.guide.overview")}</div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card title={t("cmsFinance.kpi.gross")} value={formatVnd(revenueOverview?.grossRevenueVnd ?? 0)} />
            <Card
              title={t("cmsFinance.kpi.pendingEscrow")}
              value={pendingAmountDisplay}
              onClick={() => {
                setPendingOpen(true);
                setPendingPage(1);
              }}
            />
            <Card title={t("cmsFinance.kpi.creatorPayout")} value={formatVnd(revenueOverview?.creatorPayoutVnd ?? 0)} />
            <Card title={t("cmsFinance.kpi.netPlatform")} value={formatVnd(revenueOverview?.netPlatformRevenueVnd ?? 0)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t("cmsFinance.charts.netTrend")}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={revenueOverview?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="netPlatformRevenueVnd" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title={t("cmsFinance.charts.transactionsByPeriod")}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueOverview?.trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="transactionCount" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="flex gap-2">
            <button className="rounded border px-3 py-2" onClick={() => void exportRevenue("csv")}>{t("cmsFinance.export.revenueCsv")}</button>
            <button className="rounded border px-3 py-2" onClick={() => void exportRevenue("xlsx")}>{t("cmsFinance.export.revenueXlsx")}</button>
            <button className="rounded border px-3 py-2" onClick={() => void exportRevenue("pdf")}>{t("cmsFinance.export.revenuePdf")}</button>
          </div>
        </>
      ) : (
        <div className="rounded border p-4 bg-[var(--surface)] space-y-4">
          <div className="rounded border p-3 bg-[var(--surface-2)] text-sm text-[var(--text-2)]">{t("cmsFinance.guide.transactions")}</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card title={t("cmsFinance.insights.total")} value={transactionInsights.total} />
            <Card title={t("cmsFinance.insights.completed")} value={transactionInsights.completed} />
            <Card title={t("cmsFinance.insights.pending")} value={transactionInsights.pending} />
            <Card title={t("cmsFinance.insights.totalVnd")} value={formatVnd(transactionInsights.totalVnd)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <button className={`rounded px-3 py-2 ${activeTab === "marketplace" ? "bg-blue-600 text-white" : "border"}`} onClick={() => setActiveTab("marketplace")}>
                {t("cmsFinance.tabs.marketplace")}
              </button>
              <button className={`rounded px-3 py-2 ${activeTab === "orbitcoin" ? "bg-blue-600 text-white" : "border"}`} onClick={() => setActiveTab("orbitcoin")}>
                {t("cmsFinance.tabs.orbitcoin")}
              </button>
            </div>
            <div className="flex gap-2">
              <button className="rounded border px-3 py-2" onClick={() => void exportTransactions("csv")}>{t("cmsFinance.export.csv")}</button>
              <button className="rounded border px-3 py-2" onClick={() => void exportTransactions("xlsx")}>{t("cmsFinance.export.xlsx")}</button>
              <button className="rounded border px-3 py-2" onClick={() => void exportTransactions("pdf")}>{t("cmsFinance.export.pdf")}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-2)]">{t("cmsFinance.filters.statusLabel")}</label>
              <select value={currentStatusFilter} onChange={(e) => onChangeStatus(e.target.value)} className="w-full rounded border px-3 py-2">
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "All" ? t("cmsFinance.filters.all") : option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-[var(--text-2)]">{t("cmsFinance.filters.searchLabel")}</label>
              <input
                type="text"
                value={currentSearch}
                onChange={(e) => onChangeSearch(e.target.value)}
                className="w-full rounded border px-3 py-2"
                placeholder={t("cmsFinance.searchPlaceholder")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-2)]">{t("cmsFinance.filters.pageSizeLabel")}</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  const size = Number(e.target.value) || 10;
                  setPageSize(size);
                  setMarketPage(1);
                  setOrbitPage(1);
                }}
                className="w-full rounded border px-3 py-2"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          {activeTab === "orbitcoin" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card title={t("cmsFinance.orbit.issuedOc")} value={formatOc(orbitInsights.issuedOc)} />
              <Card title={t("cmsFinance.orbit.consumedOc")} value={formatOc(orbitInsights.consumedOc)} />
              <Card title={t("cmsFinance.orbit.circulatingOc")} value={formatOc(orbitInsights.circulatingEstimate)} />
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">{t("cmsFinance.table.time")}</th>
                  <th className="py-2 pr-3">{t("cmsFinance.table.user")}</th>
                  <th className="py-2 pr-3">{t("cmsFinance.table.type")}</th>
                  <th className="py-2 pr-3">{t("cmsFinance.table.status")}</th>
                  <th className="py-2 pr-3">{t("cmsFinance.table.amount")}</th>
                  <th className="py-2 pr-3">{t("cmsFinance.table.note")}</th>
                </tr>
              </thead>
              <tbody>
                {displayTxRows.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="py-2 pr-3">{formatDateTime("paymentStatus" in row ? row.paidAt : row.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{row.userName}</div>
                      <div className="text-xs text-[var(--text-2)]">{row.userEmail}</div>
                    </td>
                    <td className="py-2 pr-3">
                      {"paymentStatus" in row
                        ? row.gameId
                          ? t("cmsFinance.type.gamePurchase")
                          : row.packageId
                            ? t("cmsFinance.type.packagePurchase")
                            : t("cmsFinance.type.marketplace")
                        : row.transactionType === "Credit"
                          ? t("cmsFinance.type.creditOc")
                          : row.transactionType === "Debit"
                            ? t("cmsFinance.type.debitOc")
                            : t("cmsFinance.type.walletAdjustment")}
                    </td>
                    <td className="py-2 pr-3">
                      <StatusBadge
                        statusRaw={"paymentStatus" in row ? row.paymentStatus : "Completed"}
                        label={"paymentStatus" in row ? row.paymentStatus : t("cmsFinance.status.completed")}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">{formatOc(row.amount)}</div>
                      <div className="text-xs text-[var(--text-2)]">
                        {formatVnd(
                          "amountVnd" in row && row.amountVnd > 0
                            ? row.amountVnd
                            : Math.round(row.amount * exchangeRate),
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-xs text-[var(--text-2)]">
                      {"paymentStatus" in row
                        ? row.gameId
                          ? `${t("cmsFinance.entity.game")} - ${shortId(row.gameId)}`
                          : row.packageId
                            ? `${t("cmsFinance.entity.package")} - ${shortId(row.packageId)}`
                            : (row.externalId ?? "-")
                        : (row.note ?? row.relatedEntityType ?? "-")}
                    </td>
                  </tr>
                ))}
                {!loading && displayTxRows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-center text-[var(--text-2)]" colSpan={6}>{t("cmsFinance.emptyTransactions")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-[var(--text-2)]">
              {`${t("cmsFinance.pagination.summaryPrefix")} ${currentPage}/${totalPages} - ${currentMeta?.totalItems ?? displayTxRows.length} ${t("cmsFinance.pagination.summarySuffix")}`}
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                {t("cmsFinance.pagination.previous")}
              </button>
              <span className="text-sm">{currentPage}/{totalPages}</span>
              <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
                {t("cmsFinance.pagination.next")}
              </button>
            </div>
          </div>

          {activeTab === "orbitcoin" ? (
            <div className="rounded border p-4 bg-[var(--surface-2)]">
              <div className="font-semibold mb-2">{t("cmsFinance.orbit.topHoldersTitle")}</div>
              <div className="space-y-2">
                {orbitInsights.topOcHolders.map((user, index) => (
                  <div key={`${user.email}-${index}`} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium">{index + 1}. {user.name}</div>
                      <div className="text-xs text-[var(--text-2)]">{user.email}</div>
                    </div>
                    <div className="font-semibold">{formatOc(user.balanceOc)}</div>
                  </div>
                ))}
                {orbitInsights.topOcHolders.length === 0 ? (
                  <div className="text-sm text-[var(--text-2)]">{t("cmsFinance.emptyTransactions")}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {pendingOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 overflow-y-auto" onClick={() => setPendingOpen(false)}>
          <div className="w-full max-w-6xl rounded border bg-[var(--surface)] p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{t("cmsFinance.pending.title")}</h3>
                <div className="text-sm text-[var(--text-2)]">
                  {t("cmsFinance.pending.subtitle")} {pendingAmountDisplay}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-2"
                  onClick={() => {
                    setPendingSearch("");
                    setPendingPage(1);
                    void loadPending();
                  }}
                >
                  {t("cmsFinance.pending.clear")}
                </button>
                <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={() => setPendingOpen(false)}>
                  {t("cmsFinance.pending.close")}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                value={pendingSearch}
                onChange={(e) => {
                  setPendingSearch(e.target.value);
                  setPendingPage(1);
                }}
                className="w-full md:w-96 rounded border px-3 py-2"
                placeholder={t("cmsFinance.pending.searchPlaceholder")}
              />
              <div className="flex items-center gap-2">
                <button className="rounded border px-3 py-2" onClick={() => void loadPending()}>
                  {t("cmsFinance.refresh")}
                </button>
              </div>
            </div>

            {pendingLoading ? <div className="mt-4 text-sm text-[var(--text-2)]">{t("cmsFinance.pending.loading")}</div> : null}
            {pendingError ? <div className="mt-4 text-sm text-red-600">{pendingError}</div> : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">{t("cmsFinance.table.time")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.pending.columns.game")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.pending.columns.buyer")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.pending.columns.seller")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.table.amount")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.pending.columns.fee")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.pending.columns.net")}</th>
                    <th className="py-2 pr-3">{t("cmsFinance.table.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row) => (
                    <tr key={row.paymentRecordId} className="border-b">
                      <td className="py-2 pr-3">{formatDateTime(row.paidAt)}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.gameTitle || "-"}</div>
                        <div className="text-xs text-[var(--text-2)]">{shortId(row.gameId)}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.buyerName}</div>
                        <div className="text-xs text-[var(--text-2)]">{row.buyerEmail}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.sellerName}</div>
                        <div className="text-xs text-[var(--text-2)]">{row.sellerEmail}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{formatOc(row.amount)}</div>
                        <div className="text-xs text-[var(--text-2)]">{formatVnd(Math.round(row.amount * exchangeRate))}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{formatOc(row.feeAmount)}</div>
                        <div className="text-xs text-[var(--text-2)]">{formatVnd(Math.round(row.feeAmount * exchangeRate))}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{formatOc(row.sellerReceives)}</div>
                        <div className="text-xs text-[var(--text-2)]">{formatVnd(Math.round(row.sellerReceives * exchangeRate))}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <StatusBadge statusRaw={row.paymentStatus} label={row.paymentStatus} />
                      </td>
                    </tr>
                  ))}
                  {!pendingLoading && pendingRows.length === 0 ? (
                    <tr>
                      <td className="py-3 text-center text-[var(--text-2)]" colSpan={8}>{t("cmsFinance.pending.empty")}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-[var(--text-2)]">
                {`${t("cmsFinance.pagination.summaryPrefix")} ${pendingPage}/${pendingTotalPages} - ${pendingMeta?.totalItems ?? pendingRows.length} ${t("cmsFinance.pagination.summarySuffix")}`}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-1 disabled:opacity-50"
                  disabled={pendingPage <= 1}
                  onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                >
                  {t("cmsFinance.pagination.previous")}
                </button>
                <span className="text-sm">{pendingPage}/{pendingTotalPages}</span>
                <button
                  className="rounded border px-3 py-1 disabled:opacity-50"
                  disabled={pendingPage >= pendingTotalPages}
                  onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                >
                  {t("cmsFinance.pagination.next")}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

function Card({ title, value, onClick }: { title: string; value: string | number; onClick?: () => void }) {
  const clickable = Boolean(onClick);
  return (
    <div
      className={`rounded border p-4 bg-[var(--surface)] ${clickable ? "cursor-pointer hover:border-blue-500 hover:shadow-sm" : ""}`}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="text-sm text-[var(--text-2)]">{title}</div>
      <div className="text-2xl font-semibold mt-2">{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4 bg-[var(--surface)]">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

export default FinanceDashboardPage;

function shortId(value?: string): string {
  if (!value) return "-";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function StatusBadge({ statusRaw, label }: { statusRaw: string; label: string }) {
  const lower = statusRaw.toLowerCase();
  const style =
    lower.includes("completed") || lower.includes("success") || lower.includes("resolved")
      ? "bg-green-100 text-green-700"
      : lower.includes("pending")
        ? "bg-amber-100 text-amber-700"
      : lower.includes("failed") || lower.includes("cancel") || lower.includes("refund")
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700";

  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${style}`}>{label}</span>;
}
