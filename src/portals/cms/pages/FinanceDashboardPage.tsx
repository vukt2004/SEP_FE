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
  CmsPagedResponse,
  CmsRevenueOverviewData,
  PaymentsReportGroupBy,
} from "@/types/api/cms/marketplaceReports";

type TxTab = "marketplace" | "orbitcoin";
type FinanceMainTab = "overview" | "transactions";

const isDevLikeHost =
  typeof window !== "undefined" &&
  (window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes(".local"));

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
  return new Date(`${dateInput}T00:00:00`).toISOString();
}

function toEndOfDayIso(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59.999`).toISOString();
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
  const [mockMode, setMockMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revenueOverview, setRevenueOverview] = useState<CmsRevenueOverviewData | null>(null);
  const [marketplaceRows, setMarketplaceRows] = useState<CmsMarketplaceTransactionItem[]>([]);
  const [orbitRows, setOrbitRows] = useState<CmsOrbitCoinTransactionItem[]>([]);
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
      const [revenueRes, marketRes, orbitRes, orbitInsightsRes, rateRes] = await Promise.all([
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
      ]);
      setRevenueOverview(revenueRes.data.data ?? null);
      setMarketMeta(marketRes.data.data ?? null);
      setOrbitMeta(orbitRes.data.data ?? null);
      setMarketplaceRows(marketRes.data.data?.items ?? []);
      setOrbitRows(orbitRes.data.data?.items ?? []);
      setOrbitInsightsData(orbitInsightsRes.data?.data ?? null);
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

  const displayRevenue = useMemo(() => {
    if (!mockMode || !revenueOverview) return revenueOverview;
    const gross = Math.round((revenueOverview.grossRevenueVnd || 1) * 1.35);
    const fee = Math.round((revenueOverview.platformFeeVnd || 1) * 1.28);
    return {
      ...revenueOverview,
      grossRevenueVnd: gross,
      platformFeeVnd: fee,
      creatorPayoutVnd: Math.max(0, gross - fee),
      netPlatformRevenueVnd: fee,
      trend: revenueOverview.trend.map((x, i) => ({
        ...x,
        grossRevenueVnd: Math.round(x.grossRevenueVnd * (0.95 + (i % 4) * 0.07)),
        platformFeeVnd: Math.round(x.platformFeeVnd * (0.9 + (i % 5) * 0.05)),
        transactionCount: Math.max(1, Math.round(x.transactionCount * (0.85 + (i % 3) * 0.1))),
        netPlatformRevenueVnd: Math.round(x.netPlatformRevenueVnd * (0.8 + ((i % 5) + 1) * 0.08)),
      })),
    };
  }, [mockMode, revenueOverview]);

  const mockMarketplaceRows = useMemo<CmsMarketplaceTransactionItem[]>(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `mock-market-${i + 1}`,
        userId: `mock-user-${i + 1}`,
        userName: `Mock User ${i + 1}`,
        userEmail: `mock${i + 1}@quackorbit.dev`,
        gameId: i % 2 === 0 ? `game-${i + 10}` : undefined,
        packageId: i % 2 === 1 ? `package-${i + 10}` : undefined,
        amount: 100 + i * 10,
        amountVnd: 100000 + i * 15000,
        paymentStatus: i % 3 === 0 ? "Pending" : "Completed",
        externalId: `EXT-${1000 + i}`,
        paidAt: new Date(Date.now() - i * 86400000).toISOString(),
      })),
    [],
  );

  const mockOrbitRows = useMemo<CmsOrbitCoinTransactionItem[]>(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `mock-orbit-${i + 1}`,
        userId: `mock-user-${i + 1}`,
        userName: `Mock User ${i + 1}`,
        userEmail: `mock${i + 1}@quackorbit.dev`,
        amount: 50 + i * 5,
        feeAmount: 2 + i,
        balanceAfter: 400 + i * 20,
        transactionType: i % 2 === 0 ? "Credit" : "Debit",
        relatedEntityType: i % 2 === 0 ? "Game" : "Package",
        relatedEntityId: `rel-${i + 1}`,
        note: `Mock note ${i + 1}`,
        createdAt: new Date(Date.now() - i * 43200000).toISOString(),
      })),
    [],
  );

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
  const displayTxRows =
    mockMode
      ? activeTab === "marketplace"
        ? (marketplaceRows.length > 0 ? marketplaceRows : mockMarketplaceRows)
        : (orbitRows.length > 0 ? orbitRows : mockOrbitRows)
      : txRows;
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

  const orbitInsights = useMemo(() => {
    if (mockMode) {
      const issuedOc = mockOrbitRows
        .filter((row) => row.transactionType === "Credit")
        .reduce((sum, row) => sum + Math.max(0, row.amount), 0);
      const consumedOc = mockOrbitRows
        .filter((row) => row.transactionType === "Debit")
        .reduce((sum, row) => sum + Math.max(0, row.amount), 0);
      const topOcHolders = mockOrbitRows
        .map((row) => ({ name: row.userName, email: row.userEmail, balanceOc: Math.max(0, row.balanceAfter ?? row.amount) }))
        .sort((a, b) => b.balanceOc - a.balanceOc)
        .slice(0, 5);
      return {
        issuedOc,
        consumedOc,
        circulatingEstimate: Math.max(0, issuedOc - consumedOc),
        topOcHolders,
      };
    }

    return {
      issuedOc: orbitInsightsData?.issuedOc ?? 0,
      consumedOc: orbitInsightsData?.consumedOc ?? 0,
      circulatingEstimate: orbitInsightsData?.circulatingOc ?? 0,
      topOcHolders: (orbitInsightsData?.topHolders ?? []).map((x) => ({
        name: x.userName,
        email: x.userEmail,
        balanceOc: x.balanceOc,
      })),
    };
  }, [mockMode, mockOrbitRows, orbitInsightsData]);

  const currentSearch = activeTab === "marketplace" ? marketSearch : orbitSearch;
  const currentStatusFilter = activeTab === "marketplace" ? marketStatusFilter : orbitTypeFilter;
  const currentMeta = activeTab === "marketplace" ? marketMeta : orbitMeta;
  const totalPages = Math.max(1, currentMeta?.totalPages ?? 1);
  const currentPage = activeTab === "marketplace" ? marketPage : orbitPage;

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
          {isDevLikeHost ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} />
              {t("cmsFinance.mockData")}
            </label>
          ) : null}
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
            <Card title={t("cmsFinance.kpi.gross")} value={formatVnd(displayRevenue?.grossRevenueVnd ?? 0)} />
            <Card title={t("cmsFinance.kpi.platformFee")} value={formatVnd(displayRevenue?.platformFeeVnd ?? 0)} />
            <Card title={t("cmsFinance.kpi.creatorPayout")} value={formatVnd(displayRevenue?.creatorPayoutVnd ?? 0)} />
            <Card title={t("cmsFinance.kpi.netPlatform")} value={formatVnd(displayRevenue?.netPlatformRevenueVnd ?? 0)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title={t("cmsFinance.charts.netTrend")}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={displayRevenue?.trend ?? []}>
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
                <BarChart data={displayRevenue?.trend ?? []}>
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
    </div>
  );
};

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded border p-4 bg-[var(--surface)]">
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
