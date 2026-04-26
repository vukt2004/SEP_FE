import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { useLanguageStore } from "@/stores/language.store";
import { emitApiToast } from "@/shared/toast/apiToastBus";
import { getCurrentUserPlan } from "@/lib/auth/subscriptionPlan";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import {
  CoinTransactionTypeEnum,
  orbitCoinApi,
  type OrbitCoinTransaction,
  type TransactionHistoryParams,
  type WalletDashboardGameItem,
  type WalletDashboardSummary,
  type WalletDashboardTrendItem,
} from "@/services/api/learner/orbitcoin.api";

type WalletFilters = {
  from: string;
  to: string;
  direction: "" | "In" | "Out";
  category: "" | "Topup" | "BuyPackage" | "BuyGame" | "GameRevenue";
  search: string;
  statuses: string[];
};
type WalletTab = "overview" | "transactions" | "revenue";
type DisplayCurrency = "VND" | "OC";

const PAGE_SIZE = 20;
const MOBILE_WIDTH = 768;
const categoryMap: Record<Exclude<WalletFilters["category"], "">, number> = {
  Topup: CoinTransactionTypeEnum.EarnDeposit,
  BuyPackage: CoinTransactionTypeEnum.SpendPackagePurchase,
  BuyGame: CoinTransactionTypeEnum.SpendMapPurchase,
  GameRevenue: CoinTransactionTypeEnum.EarnMapSold,
};
const statusPriority = ["Completed", "Pending", "Failed"];

const dict = {
  en: {
    title: "Wallet",
    buyer: "Buyer",
    creator: "Creator",
    buyerSubtitle: "Track balance and spending",
    creatorSubtitle: "Revenue and payout visibility",
    balance: "Current balance",
    spent: "Total spent (period)",
    pendingAmount: "Pending amount",
    allFlow: "All flow",
    allStatus: "All status",
    allType: "All types",
    search: "Search transaction/game/counterparty",
    transactions: "Transactions",
    creatorGames: "Creator revenue",
    loadMore: "Load more",
    exportCsv: "Export CSV",
    exportPdf: "Export PDF",
    noCreator: "No creator data yet.",
    noCreatorHint: "Register as creator to unlock creator dashboard.",
    registerCreator: "Become creator",
    drawerTitle: "Transaction details",
    clearFilters: "Clear filters",
    trend: "Cashflow trend",
    overviewTab: "Overview",
    time: "Time",
    description: "Description",
    category: "Category",
    direction: "Direction",
    status: "Status",
    counterparty: "Counterparty",
    counterpartyHint: "Other side of the transaction",
    amount: "Amount",
    game: "Game",
    buyers: "Buyers",
    orders: "Orders",
    pending: "Pending",
    refunded: "Refunded",
    grossVnd: "Gross (VND)",
    feeVnd: "Fee (VND)",
    netVnd: "Net (VND)",
    aovVnd: "AOV (VND)",
    lastSold: "Last sold",
    close: "Close",
    transaction: "Transaction",
    statusUnavailable: "Not available",
    gameDetailTitle: "Revenue detail",
    gross: "Gross",
    fee: "Platform fee",
    net: "Net",
    avgOrder: "Average order value",
    showVnd: "VND",
    showOc: "OC",
    exchangeRate: "Exchange rate",
    viewAnalytics: "View analytics",
    invoice: "Invoice",
    downloadPdf: "Download PDF",
    invoiceNo: "Invoice No.",
    issuedAt: "Issued at",
    note: "Note",
    buyerLabel: "Buyer / Purchaser",
    sellerLabel: "Seller / Receiver",
    partnerLabel: "Transaction partner",
    signedBuyer: "Buyer signature",
    signedSeller: "Seller signature",
    accountHolder: "Account holder",
    platformLabel: "Platform",
    topUp: "Top up",
    topUpPrompt: "Enter OrbitCoin amount",
    topUpInvalid: "Please enter an amount greater than 0.",
    topUpRedirecting: "Redirecting to payment...",
    topUpFailed: "Unable to start top-up. Please try again.",
    topUpAmountLabel: "Amount (OC)",
    topUpQuickSelect: "Quick select",
    topUpConfirm: "Proceed to payment",
    cancel: "Cancel",
    topUpPreview: "You pay",
    topUpInstant: "Top-up is credited right after successful payment.",
    securePayment: "Secure payment",
    paymentGateway: "Gateway: PayOS",
  },
  vi: {
    title: "Ví",
    buyer: "Người mua",
    creator: "Người bán",
    buyerSubtitle: "Theo dõi số dư và chi tiêu",
    creatorSubtitle: "Doanh thu và trạng thái thanh toán",
    balance: "Số dư hiện tại",
    spent: "Tổng chi trong kỳ",
    pendingAmount: "Số tiền đang chờ",
    allFlow: "Tất cả luồng tiền",
    allStatus: "Tất cả trạng thái",
    allType: "Tất cả loại",
    search: "Tìm theo mã giao dịch/game/đối tượng",
    transactions: "Giao dịch",
    creatorGames: "Doanh thu creator",
    loadMore: "Xem thêm",
    exportCsv: "Xuất CSV",
    exportPdf: "Xuất PDF",
    noCreator: "Chưa có dữ liệu creator.",
    noCreatorHint: "Đăng ký creator để mở dashboard doanh thu.",
    registerCreator: "Đăng ký Creator",
    drawerTitle: "Chi tiết giao dịch",
    clearFilters: "Xóa lọc",
    trend: "Xu hướng thu chi",
    overviewTab: "Tổng quan",
    time: "Thời gian",
    description: "Mô tả",
    category: "Danh mục",
    direction: "Chiều",
    status: "Trạng thái",
    counterparty: "Đối tác giao dịch",
    counterpartyHint: "Bên còn lại của giao dịch",
    amount: "Số tiền",
    game: "Game",
    buyers: "Người mua",
    orders: "Đơn hàng",
    pending: "Đang chờ",
    refunded: "Hoàn tiền",
    grossVnd: "Doanh thu gộp (VND)",
    feeVnd: "Phí nền tảng (VND)",
    netVnd: "Thực nhận (VND)",
    aovVnd: "Trung bình đơn (VND)",
    lastSold: "Lần bán gần nhất",
    close: "Đóng",
    transaction: "Giao dịch",
    statusUnavailable: "Chưa có",
    gameDetailTitle: "Chi tiết doanh thu",
    gross: "Doanh thu gộp",
    fee: "Phí nền tảng",
    net: "Thực nhận",
    avgOrder: "Giá trị trung bình mỗi đơn",
    showVnd: "VND",
    showOc: "OC",
    exchangeRate: "Tỷ giá",
    viewAnalytics: "Xem phân tích",
    invoice: "Hóa đơn",
    downloadPdf: "Tải PDF",
    invoiceNo: "Mã hóa đơn",
    issuedAt: "Ngày lập",
    note: "Ghi chú",
    buyerLabel: "Người mua",
    sellerLabel: "Người bán",
    partnerLabel: "Đối tác giao dịch",
    signedBuyer: "Người mua ký tên",
    signedSeller: "Người bán ký tên",
    accountHolder: "Chủ tài khoản",
    platformLabel: "Nền tảng",
    topUp: "Nạp tiền",
    topUpPrompt: "Nhập số OrbitCoin muốn nạp",
    topUpInvalid: "Vui lòng nhập số tiền lớn hơn 0.",
    topUpRedirecting: "Đang chuyển sang cổng thanh toán...",
    topUpFailed: "Không thể khởi tạo nạp tiền. Vui lòng thử lại.",
    topUpAmountLabel: "Số tiền (OC)",
    topUpQuickSelect: "Chọn nhanh",
    topUpConfirm: "Tiếp tục thanh toán",
    cancel: "Hủy",
    topUpPreview: "Bạn sẽ thanh toán",
    topUpInstant: "Tiền sẽ được cộng ngay sau khi thanh toán thành công.",
    securePayment: "Thanh toán bảo mật",
    paymentGateway: "Cổng thanh toán: PayOS",
  },
} as const;

export default function WalletPageClean() {
  const navigate = useNavigate();
  const { locale } = useLanguageStore();
  const t = dict[locale];
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_WIDTH);
  const [filters, setFilters] = useState<WalletFilters>(defaultFilters());
  const [page, setPage] = useState(1);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [trend, setTrend] = useState<WalletDashboardTrendItem[]>([]);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<OrbitCoinTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<WalletTab>("overview");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("VND");
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("10");
  const dashboardRole = activeTab === "revenue" && isCreator ? "Creator" : "Buyer";

  const statusOptions = useMemo(() => {
    const dynamic = availableStatuses.length > 0
      ? availableStatuses
      : Array.from(new Set(transactions.map((x) => x.status).filter(Boolean) as string[]));
    const ordered = [...statusPriority.filter((x) => dynamic.includes(x)), ...dynamic.filter((x) => !statusPriority.includes(x))];
    return ordered;
  }, [transactions, availableStatuses]);

  const hasMore = transactions.length < totalCount;
  const canAccessCreator = (summary?.grossRevenue ?? 0) > 0 || games.length > 0;
  const filteredTransactions = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filters.direction && tx.direction !== filters.direction) return false;
      if (filters.category && tx.category !== filters.category) return false;
      if (filters.statuses.length > 0) {
        const status = resolveTxStatus(tx, locale, t.statusUnavailable);
        const statusRaw = tx.status ?? "";
        const match = filters.statuses.some((s) =>
          s.toLowerCase() === statusRaw.toLowerCase() || s.toLowerCase() === status.toLowerCase(),
        );
        if (!match) return false;
      }
      if (term) {
        const hay = [tx.note, tx.category, tx.counterpartyName, tx.id].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [transactions, filters, locale, t.statusUnavailable]);
  const query = useMemo<TransactionHistoryParams>(
    () => ({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      from: filters.from,
      to: filters.to,
      direction: filters.direction || undefined,
      categories: filters.category ? [categoryMap[filters.category]] : undefined,
      statuses: filters.statuses.length > 0 ? filters.statuses : undefined,
      search: filters.search.trim() || undefined,
    }),
    [filters, page],
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_WIDTH);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const plan = await getCurrentUserPlan(false, "learner");
        if (!alive) return;
        setIsCreator(plan === "creator" || plan === "pro");
      } catch {
        if (!alive) return;
        setIsCreator(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await learnerProfileApi.getProfile();
        if (!alive || !res.isSuccess || !res.data) return;
        const fullName = [res.data.firstName, res.data.lastName].filter(Boolean).join(" ").trim();
        setCurrentUserDisplayName(fullName);
      } catch {
        if (alive) setCurrentUserDisplayName("");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setError(null);
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const [balanceRes, txRes, summaryRes, trendRes, gamesRes, exchangeRateRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory(query),
          orbitCoinApi.getDashboardSummary({ role: dashboardRole, from: query.from, to: query.to }),
          orbitCoinApi.getDashboardTrend({ role: dashboardRole, bucket: "Day", from: query.from, to: query.to }),
          orbitCoinApi.getDashboardGames({ from: query.from, to: query.to, pageNumber: 1, pageSize: 100 }),
          orbitCoinApi.getExchangeRate(),
        ]);
        if (!alive) return;
        if (!balanceRes.isSuccess || !txRes.isSuccess || !summaryRes.isSuccess || !trendRes.isSuccess || !gamesRes.isSuccess) {
          throw new Error("load");
        }
        setBalance(balanceRes.data?.balance ?? 0);
        setSummary(summaryRes.data ?? null);
        setTrend(trendRes.data?.items ?? []);
        setGames(
          [...(gamesRes.data?.items ?? [])].sort((a, b) => b.net - a.net),
        );
        setTotalCount(txRes.data?.totalCount ?? 0);
        setAvailableStatuses(txRes.data?.availableStatuses ?? []);
        setExchangeRate(exchangeRateRes.data?.rate ?? 0);
        const nextItems = txRes.data?.items ?? [];
        setTransactions((prev) => (page === 1 ? nextItems : [...prev, ...nextItems]));
      } catch {
        if (alive) setError("Failed to load wallet data.");
      } finally {
        if (alive) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [query, dashboardRole, page]);

  useEffect(() => {
    if (!isCreator && activeTab === "revenue") {
      setActiveTab("overview");
    }
  }, [isCreator, activeTab]);

  useEffect(() => {
    if (!isMobile || !hasMore || loadingMore || loading) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first?.isIntersecting) {
        setPage((p) => p + 1);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [isMobile, hasMore, loadingMore, loading]);

  const handleExportCsv = () => {
    if (!isValidExportWindow(filters.from, filters.to) || games.length > 10000) {
      emitApiToast({ type: "error", message: locale === "vi" ? "Export vượt giới hạn cho phép." : "Export exceeds allowed limits." });
      return;
    }
    emitApiToast({ type: "warning", message: locale === "vi" ? "Đang chuẩn bị file CSV..." : "Preparing CSV export..." });
    window.setTimeout(() => {
      const generatedAt = new Date().toISOString();
      const totals = buildCreatorTotals(games);
      const reportMeta = [
        ["Report Name", locale === "vi" ? "Bao cao doanh thu Creator" : "Creator Revenue Report"],
        ["Generated At (UTC)", generatedAt],
        ["Period From", filters.from],
        ["Period To", filters.to],
        ["Exchange Rate (VND/OC)", exchangeRate.toFixed(2)],
        ["Total Games", String(games.length)],
        ["Total Gross (VND)", Math.round(totals.gross).toString()],
        ["Total Fee (VND)", Math.round(totals.fee).toString()],
        ["Total Net (VND)", Math.round(totals.net).toString()],
        ["Total Orders", String(totals.orders)],
        ["Total Buyers", String(totals.buyers)],
      ];
      const header = [
        "Rank",
        "Game ID",
        "Game Title",
        "Buyers",
        "Orders",
        "Pending Orders",
        "Refunded Orders",
        "Refund Rate (%)",
        "Gross (VND)",
        "Fee (VND)",
        "Net (VND)",
        "AOV (VND)",
        "Take Rate (%)",
        "Last Sold At",
      ];
      const body = games.map((g, idx) => [
        String(idx + 1),
        g.gameId,
        g.gameTitle,
        g.buyersCount.toString(),
        g.ordersCount.toString(),
        g.pendingOrdersCount.toString(),
        g.refundedOrdersCount.toString(),
        (g.ordersCount > 0 ? (g.refundedOrdersCount / g.ordersCount) * 100 : 0).toFixed(2),
        Math.round(g.gross).toString(),
        Math.round(g.fee).toString(),
        Math.round(g.net).toString(),
        Math.round(g.averageOrderValue).toString(),
        (g.gross > 0 ? (g.fee / g.gross) * 100 : 0).toFixed(2),
        g.lastSoldAt ? new Date(g.lastSoldAt).toISOString() : "",
      ]);
      const csv = [
        ...reportMeta.map((row) => row.map(csvEscape).join(",")),
        "",
        header.map(csvEscape).join(","),
        ...body.map((line) => line.map(csvEscape).join(",")),
      ].join("\n");
      downloadBlob(csv, "text/csv;charset=utf-8", `creator-wallet-${filters.from}-${filters.to}.csv`);
      emitApiToast({ type: "success", message: locale === "vi" ? "CSV đã sẵn sàng." : "CSV export is ready." });
    }, 1000);
  };

  const handleExportPdf = () => {
    if (!isValidExportWindow(filters.from, filters.to) || games.length > 10000) {
      emitApiToast({ type: "error", message: locale === "vi" ? "Export vượt giới hạn cho phép." : "Export exceeds allowed limits." });
      return;
    }
    emitApiToast({ type: "warning", message: locale === "vi" ? "Đang tạo báo cáo PDF..." : "Preparing PDF export..." });
    window.setTimeout(() => {
      const report = window.open("", "_blank", "width=1024,height=768");
      if (!report) return;
      report.document.write(buildPrintFriendlyReport(games, filters.from, filters.to, locale, exchangeRate));
      report.document.close();
      report.focus();
      report.print();
      emitApiToast({ type: "success", message: locale === "vi" ? "Báo cáo PDF đã sẵn sàng." : "PDF report is ready." });
    }, 1100);
  };

  const handleDownloadTransactionPdf = (tx: OrbitCoinTransaction) => {
    const report = window.open("", "_blank", "width=980,height=760");
    if (!report) return;
    report.document.write(
      buildTransactionInvoiceHtml(tx, locale, t, exchangeRate, displayCurrency, currentUserDisplayName),
    );
    report.document.close();
    report.focus();
    report.print();
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount.trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      emitApiToast({ type: "error", message: t.topUpInvalid });
      return;
    }
    setIsToppingUp(true);
    try {
      const res = await orbitCoinApi.deposit({ amountOrbitCoin: amount });
      if (res.isSuccess && res.data?.checkoutUrl) {
        emitApiToast({ type: "success", message: t.topUpRedirecting });
        window.location.href = res.data.checkoutUrl;
        return;
      }
      emitApiToast({ type: "error", message: t.topUpFailed });
    } catch {
      emitApiToast({ type: "error", message: t.topUpFailed });
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{t.title}</h1>
          <div style={styles.sub}>{activeTab === "revenue" ? t.creatorSubtitle : t.buyerSubtitle}</div>
        </div>
        <button
          style={styles.primaryBtn}
          onClick={() => setShowTopUpModal(true)}
          disabled={isToppingUp}
        >
          {isToppingUp ? "..." : t.topUp}
        </button>
      </header>

      <section style={styles.metrics}>
        <Metric
          label={t.balance}
          value={formatDisplayMoney(
            summary?.currentBalanceVnd ?? summary?.currentBalance ?? (balance * exchangeRate),
            exchangeRate,
            displayCurrency,
          )}
        />
        <Metric label={t.spent} value={formatDisplayMoney(summary?.totalOut ?? 0, exchangeRate, displayCurrency)} />
        <Metric label={t.pendingAmount} value={formatDisplayMoney(summary?.pendingBalance ?? 0, exchangeRate, displayCurrency)} />
      </section>
      <section style={styles.tabs}>
        <button style={tabBtn(displayCurrency === "VND")} onClick={() => setDisplayCurrency("VND")}>{t.showVnd}</button>
        <button style={tabBtn(displayCurrency === "OC")} onClick={() => setDisplayCurrency("OC")}>{t.showOc}</button>
        <div style={styles.rateText}>
          {t.exchangeRate}: {exchangeRate > 0 ? `1 OC = ${fmtVnd(exchangeRate)}` : t.statusUnavailable}
        </div>
      </section>

      <section style={styles.filters}>
        <input style={styles.input} type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
        <input style={styles.input} type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
        <select style={styles.input} value={filters.direction} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value as WalletFilters["direction"] }))}>
          <option value="">{t.allFlow}</option><option value="In">In</option><option value="Out">Out</option>
        </select>
        <select style={styles.input} value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value as WalletFilters["category"] }))}>
          <option value="">{t.allType}</option><option value="Topup">Topup</option><option value="BuyPackage">Buy package</option><option value="BuyGame">Buy game</option><option value="GameRevenue">Game revenue</option>
        </select>
        <select
          style={styles.input}
          value={filters.statuses[0] ?? ""}
          onChange={(e) => setFilters((p) => ({ ...p, statuses: e.target.value ? [e.target.value] : [] }))}
        >
          <option value="">{t.allStatus}</option>
          {statusOptions.map((status) => <option key={status} value={status}>{friendlyStatus(status, locale)}</option>)}
        </select>
        <input
          style={{ ...styles.input, minWidth: 260 }}
          placeholder={t.search}
          value={filters.search}
          onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
        />
        <button style={styles.btn} onClick={() => setFilters(defaultFilters())}>{t.clearFilters}</button>
      </section>

      <section style={styles.tabs}>
        <button style={tabBtn(activeTab === "overview")} onClick={() => setActiveTab("overview")}>{t.overviewTab}</button>
        <button style={tabBtn(activeTab === "transactions")} onClick={() => setActiveTab("transactions")}>{t.transactions}</button>
        {isCreator ? (
          <button style={tabBtn(activeTab === "revenue")} onClick={() => setActiveTab("revenue")}>{t.creatorGames}</button>
        ) : null}
      </section>

      {activeTab === "overview" ? (
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>{t.trend} ({displayCurrency})</h3>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip formatter={(value) => formatDisplayMoney(Number(value), exchangeRate, displayCurrency)} />
                <Area type="monotone" dataKey="inflow" stroke="#16a34a" fill="#16a34a33" />
                <Area type="monotone" dataKey="outflow" stroke="#dc2626" fill="#dc262633" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {activeTab === "transactions" ? (
        <section style={styles.panel}>
          <h3 style={styles.panelTitle}>{t.transactions}</h3>
          {loading ? <div style={styles.sub}>Loading...</div> : null}
          {error ? <div style={styles.err}>{error}</div> : null}
          {!loading && !error && transactions.length === 0 ? (
            <div style={styles.notice}>
              <div style={styles.noticeTitle}>{locale === "vi" ? "Không có giao dịch phù hợp." : "No matching transactions."}</div>
              <div style={styles.sub}>{locale === "vi" ? "Thử đổi bộ lọc hoặc xóa tìm kiếm để xem thêm dữ liệu." : "Adjust filters or clear search to see more data."}</div>
            </div>
          ) : null}
          {filteredTransactions.length > 0 ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t.time}</th>
                    <th style={styles.th}>{t.description}</th>
                    <th style={styles.th}>{t.category}</th>
                    <th style={styles.th}>{t.direction}</th>
                    <th style={styles.th}>{t.status}</th>
                    <th style={styles.th} title={t.counterpartyHint}>{t.counterparty}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} style={styles.tr} onClick={() => setSelectedTx(tx)}>
                      <td style={styles.td}>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td style={styles.td}>{tx.note || t.transaction}</td>
                      <td style={styles.td}>{tx.category || t.statusUnavailable}</td>
                      <td style={styles.td}>{tx.direction || t.statusUnavailable}</td>
                      <td style={styles.td}>{resolveTxStatus(tx, locale, t.statusUnavailable)}</td>
                      <td style={styles.td}>{tx.counterpartyName || t.statusUnavailable}</td>
                      <td style={{ ...styles.td, textAlign: "right", color: tx.direction === "In" ? "var(--success)" : "var(--warning)" }}>
                        {formatTxAmount(tx, exchangeRate, displayCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!isMobile && hasMore ? (
            <button style={styles.btn} disabled={loadingMore} onClick={() => setPage((p) => p + 1)}>
              {loadingMore ? "Loading..." : t.loadMore}
            </button>
          ) : null}
          {isMobile ? <div ref={sentinelRef} style={{ height: 1 }} /> : null}
        </section>
      ) : null}

      {isCreator && activeTab === "revenue" ? (
        <section style={styles.panel}>
          <div style={styles.rowHead}>
            <h3 style={styles.panelTitle}>{t.creatorGames}</h3>
            <div style={styles.switchWrap}>
              <button style={styles.btn} onClick={handleExportCsv}>{t.exportCsv}</button>
              <button style={styles.btn} onClick={handleExportPdf}>{t.exportPdf}</button>
            </div>
          </div>
          {!canAccessCreator ? (
            <div style={styles.notice}>
              <div style={styles.noticeTitle}>{t.noCreator}</div>
              <div style={styles.sub}>{t.noCreatorHint}</div>
              <button style={{ ...styles.btn, marginTop: 8 }}>{t.registerCreator}</button>
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t.game}</th>
                    <th style={styles.th}>{t.buyers}</th>
                    <th style={styles.th}>{t.orders}</th>
                    <th style={styles.th}>{t.pending}</th>
                    <th style={styles.th}>{t.refunded}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{`${t.gross} (${displayCurrency})`}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{`${t.fee} (${displayCurrency})`}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{`${t.net} (${displayCurrency})`}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{`${t.avgOrder} (${displayCurrency})`}</th>
                    <th style={styles.th}>{t.lastSold}</th>
                    <th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr
                      key={g.gameId}
                      style={styles.tr}
                      onClick={() =>
                        navigate(`/app/wallet/revenue/${g.gameId}?from=${filters.from}&to=${filters.to}`)
                      }
                    >
                      <td style={styles.td}>{g.gameTitle}</td>
                      <td style={styles.td}>{g.buyersCount}</td>
                      <td style={styles.td}>{g.ordersCount}</td>
                      <td style={styles.td}>{g.pendingOrdersCount}</td>
                      <td style={styles.td}>{g.refundedOrdersCount}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{formatDisplayMoney(g.gross, exchangeRate, displayCurrency)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{formatDisplayMoney(g.fee, exchangeRate, displayCurrency)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{formatDisplayMoney(g.net, exchangeRate, displayCurrency)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{formatDisplayMoney(g.averageOrderValue, exchangeRate, displayCurrency)}</td>
                      <td style={styles.td}>{g.lastSoldAt ? new Date(g.lastSoldAt).toLocaleString() : t.statusUnavailable}</td>
                      <td style={styles.td}>
                        <button style={styles.btn}>{t.viewAnalytics}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {showTopUpModal ? (
        <div style={styles.overlay} onClick={() => !isToppingUp && setShowTopUpModal(false)}>
          <div style={styles.topUpModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.topUpHero}>
              <div>
                <div style={styles.topUpTitle}>{"✨ "}{t.topUp}</div>
                <div style={styles.sub}>{t.topUpPrompt}</div>
              </div>
              <button
                style={styles.iconBtn}
                onClick={() => setShowTopUpModal(false)}
                disabled={isToppingUp}
              >
                x
              </button>
            </div>
            <div style={{ ...styles.sub, fontWeight: 600 }}>{t.topUpQuickSelect}</div>
            <div style={styles.switchWrap}>
              {[10, 20, 50, 100].map((value) => (
                <button
                  key={value}
                  style={topUpChipBtn(topUpAmount === String(value))}
                  onClick={() => setTopUpAmount(String(value))}
                  disabled={isToppingUp}
                >
                  {value} OC
                </button>
              ))}
            </div>
            <div style={styles.topUpInputWrap}>
              <label style={styles.sub}>{t.topUpAmountLabel}</label>
              <input
                type="number"
                min={1}
                step={1}
                style={styles.input}
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                disabled={isToppingUp}
              />
            </div>
            <div style={styles.topUpPreviewCard}>
              <span style={styles.sub}>{t.topUpPreview}</span>
              <strong>
                {Number.isFinite(Number(topUpAmount)) && Number(topUpAmount) > 0
                  ? formatDisplayMoney(Number(topUpAmount) * exchangeRate, exchangeRate, "VND")
                  : "--"}
              </strong>
            </div>
            <div style={styles.topUpMetaRow}>
              <span style={styles.metaBadge}>{t.securePayment}</span>
              <span style={styles.metaBadge}>{t.paymentGateway}</span>
            </div>
            <div style={styles.sub}>{t.topUpInstant}</div>
            <div style={styles.topUpActions}>
              <button
                style={styles.btn}
                onClick={() => setShowTopUpModal(false)}
                disabled={isToppingUp}
              >
                {t.cancel}
              </button>
            <button style={styles.primaryBtn} onClick={handleTopUp} disabled={isToppingUp}>
              {isToppingUp ? "..." : t.topUpConfirm}
            </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedTx ? (
        <aside style={styles.drawer}>
          <div style={styles.rowHead}>
            <strong>{t.invoice}</strong>
            <div style={styles.switchWrap}>
              <button style={styles.btn} onClick={() => handleDownloadTransactionPdf(selectedTx)}>{t.downloadPdf}</button>
              <button style={styles.btn} onClick={() => setSelectedTx(null)}>{t.close}</button>
            </div>
          </div>
          <TransactionInvoice
            tx={selectedTx}
            locale={locale}
            t={t}
            exchangeRate={exchangeRate}
            displayCurrency={displayCurrency}
            currentUserDisplayName={currentUserDisplayName}
          />
        </aside>
      ) : null}
    </div>
  );
}

function TransactionInvoice({
  tx,
  locale,
  t,
  exchangeRate,
  displayCurrency,
  currentUserDisplayName,
}: {
  tx: OrbitCoinTransaction;
  locale: "en" | "vi";
  t: (typeof dict)["en"] | (typeof dict)["vi"];
  exchangeRate: number;
  displayCurrency: DisplayCurrency;
  currentUserDisplayName: string;
}) {
  const issuedAt = new Date(tx.createdAt).toLocaleString();
  const unitPrice = Math.abs(tx.amountVnd ?? tx.amountVND ?? Math.round(Math.abs(tx.amount) * exchangeRate));
  const qty = 1;
  const amountText = formatTxAmount(tx, exchangeRate, displayCurrency);
  const counterparty = tx.counterpartyName || t.statusUnavailable;
  const currentAccount = currentUserDisplayName || (locale === "vi" ? "Bạn" : "You");
  const normalizedCounterparty = counterparty.trim().toLowerCase();
  const isSystemCounterparty = normalizedCounterparty === "system";
  const buyerName = tx.direction === "Out" ? currentAccount : counterparty;
  const sellerName = tx.direction === "Out" ? counterparty : currentAccount;
  const showPartnerRow = !isSystemCounterparty
    && normalizedCounterparty !== buyerName.trim().toLowerCase()
    && normalizedCounterparty !== sellerName.trim().toLowerCase();
  return (
    <div style={styles.invoicePaper}>
      <div style={styles.invoiceTop}>
        <div>
          <div style={styles.invoiceBrand}>QUACKORBIT TECHNOLOGY</div>
          <div style={styles.invoiceMeta}>Tax code: 1234567890</div>
          <div style={styles.invoiceMeta}>Address: Ho Chi Minh City, Vietnam</div>
          <div style={styles.invoiceMeta}>Email: contact@quackorbit.vn</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={styles.invoiceDocTitle}>{t.invoice.toUpperCase()}</div>
          <div style={styles.invoiceMeta}>{t.invoiceNo}: {tx.id.slice(0, 8).toUpperCase()}</div>
          <div style={styles.invoiceMeta}>{t.issuedAt}: {issuedAt}</div>
          <div style={styles.invoiceMeta}>{t.status}: {resolveTxStatus(tx, locale, t.statusUnavailable)}</div>
        </div>
      </div>
      {isSystemCounterparty ? (
        <div style={styles.invoicePartyRow}>
          <div><strong>{t.accountHolder}:</strong> {currentAccount}</div>
          <div><strong>{t.platformLabel}:</strong> QuackOrbit Platform</div>
        </div>
      ) : (
        <>
          <div style={styles.invoicePartyRow}>
            <div><strong>{t.buyerLabel}:</strong> {buyerName}</div>
            <div><strong>{t.sellerLabel}:</strong> {sellerName}</div>
          </div>
          {showPartnerRow ? <div style={styles.invoiceMeta}><strong>{t.partnerLabel}:</strong> {counterparty}</div> : null}
        </>
      )}
      <table style={styles.invoiceTable}>
        <thead>
          <tr>
            <th style={styles.invoiceTh}>No.</th>
            <th style={styles.invoiceTh}>Description</th>
            <th style={styles.invoiceTh}>Qty</th>
            <th style={styles.invoiceTh}>Unit Price (VND)</th>
            <th style={styles.invoiceTh}>Amount ({displayCurrency})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.invoiceTd}>1</td>
            <td style={styles.invoiceTd}>{tx.note || tx.category || t.transaction}</td>
            <td style={styles.invoiceTd}>{qty}</td>
            <td style={styles.invoiceTd}>{Math.round(unitPrice).toLocaleString("en-US")}</td>
            <td style={styles.invoiceTd}>{amountText}</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.invoiceFooter}>
        <div><strong>{t.direction}:</strong> {tx.direction ?? t.statusUnavailable}</div>
        <div><strong>{t.category}:</strong> {tx.category ?? t.statusUnavailable}</div>
        <div><strong>{t.note}:</strong> {tx.note || t.statusUnavailable}</div>
      </div>
      <div style={styles.invoiceSignRow}>
        <div style={styles.invoiceSignCol}><strong>{t.signedBuyer}</strong></div>
        <div style={styles.invoiceSignCol}><strong>{t.signedSeller}</strong></div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><div style={styles.sub}>{label}</div><div style={styles.metricValue}>{value}</div></div>;
}

function defaultFilters(): WalletFilters {
  const now = new Date();
  return { from: fmtDate(addDays(now, -30)), to: fmtDate(now), direction: "", category: "", search: "", statuses: [] };
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(d: Date) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function tabBtn(active: boolean): CSSProperties { return { ...styles.btn, borderColor: active ? "var(--primary)" : "var(--border)", color: active ? "var(--primary)" : "var(--text)", fontWeight: active ? 700 : 500 }; }
function topUpChipBtn(active: boolean): CSSProperties {
  return {
    ...styles.btn,
    borderColor: active ? "var(--primary)" : "var(--border)",
    color: active ? "var(--primary)" : "var(--text)",
    background: active ? "color-mix(in srgb, var(--primary) 12%, var(--surface))" : "var(--surface)",
    fontWeight: active ? 700 : 500,
  };
}
function fmtVnd(amount: number) { return `${Math.round(amount).toLocaleString("en-US")} VND`; }
function fmtOc(amount: number) { return `${Number(amount.toFixed(2)).toLocaleString("en-US")} OC`; }
function formatDisplayMoney(amountVnd: number, exchangeRate: number, currency: DisplayCurrency) {
  if (currency === "OC" && exchangeRate > 0) {
    return fmtOc(amountVnd / exchangeRate);
  }
  return fmtVnd(amountVnd);
}
function formatTxAmount(tx: OrbitCoinTransaction, exchangeRate: number, currency: DisplayCurrency) {
  const sign = tx.amount < 0 ? "-" : "+";
  const amountVnd = tx.amountVnd != null
    ? Math.abs(tx.amountVnd)
    : exchangeRate > 0
      ? Math.abs(tx.amount) * exchangeRate
      : null;
  if (amountVnd == null) return `${Math.round(tx.amount).toLocaleString("en-US")} OC`;
  return `${sign}${formatDisplayMoney(amountVnd, exchangeRate, currency)}`;
}
function resolveTxStatus(tx: OrbitCoinTransaction, locale: "en" | "vi", fallback: string) {
  if (tx.status) return friendlyStatus(tx.status, locale);
  if (tx.relatedEntityType?.toLowerCase() === "payment") return friendlyStatus("Pending", locale);
  return friendlyStatus("Completed", locale) || fallback;
}
function friendlyStatus(status: string, locale: "en" | "vi") {
  const map: Record<string, string> = locale === "vi"
    ? { Completed: "Thành công", Pending: "Đang xử lý", Failed: "Thất bại", Refunded: "Hoàn tiền" }
    : { Completed: "Completed", Pending: "Pending", Failed: "Failed", Refunded: "Refunded" };
  return map[status] ?? status;
}
function isValidExportWindow(from: string, to: string) {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diff = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 90;
}
function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
function buildPrintFriendlyReport(
  games: WalletDashboardGameItem[],
  from: string,
  to: string,
  locale: "en" | "vi",
  exchangeRate: number,
) {
  const title = locale === "vi" ? "Báo cáo doanh thu Creator" : "Creator revenue report";
  const generatedAt = new Date().toISOString();
  const totals = buildCreatorTotals(games);
  const rows = games
    .map((g, index) => {
      const refundRate = g.ordersCount > 0 ? ((g.refundedOrdersCount / g.ordersCount) * 100).toFixed(2) : "0.00";
      const takeRate = g.gross > 0 ? ((g.fee / g.gross) * 100).toFixed(2) : "0.00";
      return `<tr>
        <td>${index + 1}</td>
        <td>${g.gameTitle}</td>
        <td>${g.buyersCount}</td>
        <td>${g.ordersCount}</td>
        <td>${g.pendingOrdersCount}</td>
        <td>${g.refundedOrdersCount}</td>
        <td>${refundRate}%</td>
        <td>${Math.round(g.gross).toLocaleString("en-US")}</td>
        <td>${Math.round(g.fee).toLocaleString("en-US")}</td>
        <td>${Math.round(g.net).toLocaleString("en-US")}</td>
        <td>${Math.round(g.averageOrderValue).toLocaleString("en-US")}</td>
        <td>${takeRate}%</td>
        <td>${g.lastSoldAt ? new Date(g.lastSoldAt).toLocaleString() : "-"}</td>
      </tr>`;
    })
    .join("");
  return `<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Arial;padding:24px;color:#0f172a;}
    h1{margin:0 0 6px;}
    h2{margin:0 0 10px;color:#334155;}
    .meta{font-size:13px;color:#475569;line-height:1.6;margin-bottom:10px;}
    .kpi{display:grid;grid-template-columns:repeat(3,minmax(160px,1fr));gap:8px;margin:10px 0 14px;}
    .kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:#f8fafc;font-size:13px;}
    table{border-collapse:collapse;width:100%;}
    th,td{border:1px solid #94a3b8;padding:7px 8px;text-align:left;font-size:12px;}
    th{background:#e2e8f0;}
    .foot{margin-top:10px;font-size:11px;color:#64748b;}
  </style></head><body>
    <h1>QuackOrbit</h1>
    <h2>${title}</h2>
    <div class="meta">
      <div><strong>Period:</strong> ${from} - ${to}</div>
      <div><strong>Generated At (UTC):</strong> ${generatedAt}</div>
      <div><strong>Exchange Rate:</strong> 1 OC = ${Math.round(exchangeRate).toLocaleString("en-US")} VND</div>
    </div>
    <div class="kpi">
      <div><strong>Total Games:</strong> ${games.length}</div>
      <div><strong>Total Gross (VND):</strong> ${Math.round(totals.gross).toLocaleString("en-US")}</div>
      <div><strong>Total Fee (VND):</strong> ${Math.round(totals.fee).toLocaleString("en-US")}</div>
      <div><strong>Total Net (VND):</strong> ${Math.round(totals.net).toLocaleString("en-US")}</div>
      <div><strong>Total Orders:</strong> ${totals.orders.toLocaleString("en-US")}</div>
      <div><strong>Total Buyers:</strong> ${totals.buyers.toLocaleString("en-US")}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>#</th><th>Game</th><th>Buyers</th><th>Orders</th><th>Pending</th><th>Refunded</th><th>Refund %</th>
          <th>Gross</th><th>Fee</th><th>Net</th><th>AOV</th><th>Take rate %</th><th>Last sold</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">Internal analytics export - QuackOrbit Creator Wallet</div>
  </body></html>`;
}

function buildCreatorTotals(games: WalletDashboardGameItem[]) {
  return games.reduce(
    (acc, g) => {
      acc.gross += g.gross;
      acc.fee += g.fee;
      acc.net += g.net;
      acc.orders += g.ordersCount;
      acc.buyers += g.buyersCount;
      return acc;
    },
    { gross: 0, fee: 0, net: 0, orders: 0, buyers: 0 },
  );
}

function csvEscape(value: string) {
  const escaped = value.replaceAll("\"", "\"\"");
  return `"${escaped}"`;
}

function buildTransactionInvoiceHtml(
  tx: OrbitCoinTransaction,
  locale: "en" | "vi",
  t: (typeof dict)["en"] | (typeof dict)["vi"],
  exchangeRate: number,
  displayCurrency: DisplayCurrency,
  currentUserDisplayName: string,
) {
  const issuedAt = new Date(tx.createdAt).toLocaleString();
  const safe = (v: string) => v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const amountText = formatTxAmount(tx, exchangeRate, displayCurrency);
  const unitPrice = Math.round(Math.abs(tx.amountVnd ?? tx.amountVND ?? Math.round(Math.abs(tx.amount) * exchangeRate)));
  const counterparty = tx.counterpartyName || t.statusUnavailable;
  const currentAccount = currentUserDisplayName || (locale === "vi" ? "Bạn" : "You");
  const normalizedCounterparty = counterparty.trim().toLowerCase();
  const isSystemCounterparty = normalizedCounterparty === "system";
  const buyerName = tx.direction === "Out" ? currentAccount : counterparty;
  const sellerName = tx.direction === "Out" ? counterparty : currentAccount;
  const showPartnerRow = !isSystemCounterparty
    && normalizedCounterparty !== buyerName.trim().toLowerCase()
    && normalizedCounterparty !== sellerName.trim().toLowerCase();
  return `<!doctype html><html><head><title>${safe(t.invoice)}</title><style>
  body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}
  .top{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #cbd5e1;padding-bottom:12px;margin-bottom:12px;}
  .brand{font-weight:800;font-size:18px;}
  .meta{font-size:13px;color:#334155;line-height:1.5;}
  .title{font-size:26px;font-weight:900;color:#b91c1c;letter-spacing:0.3px;}
  .party{display:flex;justify-content:space-between;font-size:13px;padding:8px 0;margin-bottom:10px;}
  table{border-collapse:collapse;width:100%;}
  th,td{border:1px solid #94a3b8;padding:9px 10px;font-size:13px;}
  th{background:#f1f5f9;text-align:left;}
  .sum{margin-top:12px;font-size:13px;line-height:1.6;}
  </style></head><body>
  <div class="top">
    <div>
      <div class="brand">QUACKORBIT TECHNOLOGY</div>
      <div class="meta">Tax code: 1234567890</div>
      <div class="meta">Address: Ho Chi Minh City, Vietnam</div>
      <div class="meta">Email: contact@quackorbit.vn</div>
    </div>
    <div style="text-align:right">
      <div class="title">${safe(t.invoice.toUpperCase())}</div>
      <div class="meta">${safe(t.invoiceNo)}: ${safe(tx.id.slice(0, 8).toUpperCase())}</div>
      <div class="meta">${safe(t.issuedAt)}: ${safe(issuedAt)}</div>
      <div class="meta">${safe(t.status)}: ${safe(resolveTxStatus(tx, locale, t.statusUnavailable))}</div>
    </div>
  </div>
  ${
    isSystemCounterparty
      ? `<div class="party">
    <div><strong>${safe(t.accountHolder)}:</strong> ${safe(currentAccount)}</div>
    <div><strong>${safe(t.platformLabel)}:</strong> QuackOrbit Platform</div>
  </div>`
      : `<div class="party">
    <div><strong>${safe(t.buyerLabel)}:</strong> ${safe(buyerName)}</div>
    <div><strong>${safe(t.sellerLabel)}:</strong> ${safe(sellerName)}</div>
  </div>
  ${
    showPartnerRow
      ? `<div class="meta" style="margin-bottom:8px"><strong>${safe(t.partnerLabel)}:</strong> ${safe(counterparty)}</div>`
      : ""
  }`
  }
  <table>
    <thead><tr><th>No.</th><th>Description</th><th>Qty</th><th>Unit Price (VND)</th><th>Amount (${safe(displayCurrency)})</th></tr></thead>
    <tbody><tr><td>1</td><td>${safe(tx.note || tx.category || t.transaction)}</td><td>1</td><td>${unitPrice.toLocaleString("en-US")}</td><td>${safe(amountText)}</td></tr></tbody>
  </table>
  <div class="sum">
    <div><strong>${safe(t.direction)}:</strong> ${safe(tx.direction ?? t.statusUnavailable)}</div>
    <div><strong>${safe(t.category)}:</strong> ${safe(tx.category ?? t.statusUnavailable)}</div>
    <div><strong>${safe(t.note)}:</strong> ${safe(tx.note || t.statusUnavailable)}</div>
  </div>
  <div class="party" style="margin-top:18px">
    <div><strong>${safe(t.signedBuyer)}</strong></div>
    <div><strong>${safe(t.signedSeller)}</strong></div>
  </div>
  </body></html>`;
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "0 20px 28px", display: "grid", gap: 12, position: "relative" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  sub: { color: "var(--muted)", fontSize: 12 },
  switchWrap: { display: "flex", gap: 8 },
  btn: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "7px 10px", cursor: "pointer" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 },
  metric: { border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10 },
  metricValue: { fontWeight: 800, marginTop: 2 },
  filters: { display: "flex", flexWrap: "wrap", gap: 8, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10 },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  rateText: { fontSize: 12, color: "var(--muted)", display: "flex", alignItems: "center", marginLeft: 4 },
  input: { border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", background: "var(--surface-2)", color: "var(--text)" },
  panel: { border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10, display: "grid", gap: 8 },
  panelTitle: { margin: 0, fontSize: 16 },
  row: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6, gap: 8 },
  rowBtn: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6, background: "transparent", borderTop: "none", borderLeft: "none", borderRight: "none", color: "var(--text)", cursor: "pointer", textAlign: "left" },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 },
  err: { color: "var(--danger)", fontWeight: 700 },
  notice: { border: "1px dashed var(--border)", borderRadius: 8, padding: 12, background: "var(--surface-2)" },
  noticeTitle: { fontWeight: 700, marginBottom: 4 },
  tableWrap: { width: "100%", overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 980 },
  th: { textAlign: "left", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)", padding: "10px 12px", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderBottom: "1px solid var(--border)", fontSize: 13, whiteSpace: "nowrap" },
  tr: { cursor: "pointer" },
  primaryBtn: { border: "none", borderRadius: 8, background: "var(--primary)", color: "#fff", padding: "8px 12px", cursor: "pointer", fontWeight: 700 },
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.55)", backdropFilter: "blur(3px)", display: "grid", placeItems: "center", zIndex: 90 },
  topUpModal: { width: "min(460px, 92vw)", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: 16, display: "grid", gap: 12, boxShadow: "0 24px 48px rgba(2,6,23,0.25)" },
  topUpHero: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8, padding: 10, borderRadius: 10, background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 22%, transparent), color-mix(in srgb, var(--success) 18%, transparent))" },
  topUpTitle: { fontWeight: 800, fontSize: 18, lineHeight: 1.2 },
  topUpInputWrap: { display: "grid", gap: 6 },
  topUpPreviewCard: { border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface-2)", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  topUpMetaRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  metaBadge: { border: "1px solid var(--border)", borderRadius: 999, padding: "4px 10px", fontSize: 12, color: "var(--muted)", background: "var(--surface-2)" },
  topUpActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
  iconBtn: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "4px 8px", cursor: "pointer", lineHeight: 1, fontSize: 14, color: "var(--muted)" },
  drawer: { position: "fixed", right: 24, top: 58, width: 760, maxHeight: "88vh", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: 16, display: "grid", gap: 10, zIndex: 80, boxShadow: "0 20px 40px rgba(2,6,23,0.22)" },
  invoicePaper: { border: "1px solid #94a3b8", borderRadius: 10, background: "#fff", color: "#0f172a", padding: 14, display: "grid", gap: 10 },
  invoiceTop: { display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #cbd5e1", paddingBottom: 8 },
  invoiceBrand: { fontSize: 18, fontWeight: 900, letterSpacing: 0.4 },
  invoiceDocTitle: { fontSize: 26, fontWeight: 900, color: "#b91c1c", lineHeight: 1.1 },
  invoiceMeta: { fontSize: 13, lineHeight: 1.45, color: "#334155" },
  invoicePartyRow: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 },
  invoiceTable: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  invoiceTh: { border: "1px solid #94a3b8", background: "#f1f5f9", padding: "8px 9px", textAlign: "left" },
  invoiceTd: { border: "1px solid #94a3b8", padding: "8px 9px", verticalAlign: "top" },
  invoiceFooter: { borderTop: "1px solid #cbd5e1", paddingTop: 8, fontSize: 13, lineHeight: 1.6 },
  invoiceSignRow: { display: "flex", justifyContent: "space-between", marginTop: 14, borderTop: "1px dashed #cbd5e1", paddingTop: 10 },
  invoiceSignCol: { width: "46%", textAlign: "center", minHeight: 48, display: "grid", alignItems: "start" },
};
