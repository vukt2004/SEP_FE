import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguageStore } from "@/stores/language.store";
import { emitApiToast } from "@/shared/toast/apiToastBus";
import {
  CoinTransactionTypeEnum,
  orbitCoinApi,
  type OrbitCoinTransaction,
  type TransactionHistoryParams,
  type WalletDashboardGameItem,
  type WalletDashboardSummary,
  type WalletDashboardTrendItem,
} from "@/services/api/learner/orbitcoin.api";

type WalletRole = "Buyer" | "Creator";
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
const ROLE_KEY = "wallet_v2_last_role";
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
  },
} as const;

export default function WalletPageClean() {
  const { locale } = useLanguageStore();
  const t = dict[locale];
  const location = useLocation();
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_WIDTH);
  const [role, setRole] = useState<WalletRole>(() => getInitialRole(location.pathname));
  const [filters, setFilters] = useState<WalletFilters>(defaultFilters());
  const [page, setPage] = useState(1);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [trend, setTrend] = useState<WalletDashboardTrendItem[]>([]);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTx, setSelectedTx] = useState<OrbitCoinTransaction | null>(null);
  const [selectedGame, setSelectedGame] = useState<WalletDashboardGameItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WalletTab>("overview");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("VND");
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);

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
    const nextRole = getInitialRole(location.pathname);
    setRole(nextRole);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem(ROLE_KEY, role);
  }, [role]);

  useEffect(() => {
    setPage(1);
  }, [filters, role]);

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
          orbitCoinApi.getDashboardSummary({ role, from: query.from, to: query.to }),
          orbitCoinApi.getDashboardTrend({ role: "Buyer", bucket: "Day", from: query.from, to: query.to }),
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
  }, [query, role, page]);

  useEffect(() => {
    if (role === "Buyer" && activeTab === "revenue") {
      setActiveTab("overview");
    }
  }, [role, activeTab]);

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
      const header = ["Game Title", "Gross", "Platform Fee", "Net", "Buyers"];
      const body = games.map((g) => [g.gameTitle, g.gross.toFixed(0), g.fee.toFixed(0), g.net.toFixed(0), g.buyersCount.toString()]);
      const csv = [header, ...body].map((line) => line.join(",")).join("\n");
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
      report.document.write(buildPrintFriendlyReport(games, filters.from, filters.to, locale));
      report.document.close();
      report.focus();
      report.print();
      emitApiToast({ type: "success", message: locale === "vi" ? "Báo cáo PDF đã sẵn sàng." : "PDF report is ready." });
    }, 1100);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{t.title}</h1>
          <div style={styles.sub}>{role === "Buyer" ? t.buyerSubtitle : t.creatorSubtitle}</div>
        </div>
        <div style={styles.switchWrap}>
          <button style={roleBtn(role === "Buyer")} onClick={() => switchRole("Buyer", navigate)}>{t.buyer}</button>
          <button style={roleBtn(role === "Creator")} onClick={() => switchRole("Creator", navigate)}>{t.creator}</button>
        </div>
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
        {role === "Creator" ? (
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

      {role === "Creator" && activeTab === "revenue" ? (
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
                  </tr>
                </thead>
                <tbody>
                  {games.map((g) => (
                    <tr key={g.gameId} style={styles.tr} onClick={() => setSelectedGame(g)}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {selectedTx ? (
        <aside style={styles.drawer}>
          <div style={styles.rowHead}>
            <strong>{t.drawerTitle}</strong>
            <button style={styles.btn} onClick={() => setSelectedTx(null)}>{t.close}</button>
          </div>
          <DrawerLine label="ID" value={selectedTx.id} />
          <DrawerLine label={t.status} value={resolveTxStatus(selectedTx, locale, t.statusUnavailable)} />
          <DrawerLine label={t.direction} value={selectedTx.direction ?? t.statusUnavailable} />
          <DrawerLine label={t.category} value={selectedTx.category ?? t.statusUnavailable} />
          <DrawerLine label={t.counterparty} value={selectedTx.counterpartyName || t.statusUnavailable} />
          <DrawerLine label={`${t.amount} (${displayCurrency})`} value={formatTxAmount(selectedTx, exchangeRate, displayCurrency)} />
          <DrawerLine label={t.time} value={new Date(selectedTx.createdAt).toLocaleString()} />
        </aside>
      ) : null}
      {selectedGame ? (
        <aside style={styles.drawer}>
          <div style={styles.rowHead}>
            <strong>{t.gameDetailTitle}</strong>
            <button style={styles.btn} onClick={() => setSelectedGame(null)}>{t.close}</button>
          </div>
          <DrawerLine label={t.game} value={selectedGame.gameTitle} />
          <DrawerLine label={t.buyers} value={String(selectedGame.buyersCount)} />
          <DrawerLine label={t.orders} value={String(selectedGame.ordersCount)} />
          <DrawerLine label={t.pending} value={String(selectedGame.pendingOrdersCount)} />
          <DrawerLine label={t.refunded} value={String(selectedGame.refundedOrdersCount)} />
          <DrawerLine label={`${t.gross} (${displayCurrency})`} value={formatDisplayMoney(selectedGame.gross, exchangeRate, displayCurrency)} />
          <DrawerLine label={`${t.fee} (${displayCurrency})`} value={formatDisplayMoney(selectedGame.fee, exchangeRate, displayCurrency)} />
          <DrawerLine label={`${t.net} (${displayCurrency})`} value={formatDisplayMoney(selectedGame.net, exchangeRate, displayCurrency)} />
          <DrawerLine label={`${t.avgOrder} (${displayCurrency})`} value={formatDisplayMoney(selectedGame.averageOrderValue, exchangeRate, displayCurrency)} />
          <DrawerLine label={t.lastSold} value={selectedGame.lastSoldAt ? new Date(selectedGame.lastSoldAt).toLocaleString() : t.statusUnavailable} />
        </aside>
      ) : null}
    </div>
  );
}

function DrawerLine({ label, value }: { label: string; value: string }) {
  return <div style={styles.drawerLine}><span>{label}</span><strong>{value}</strong></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><div style={styles.sub}>{label}</div><div style={styles.metricValue}>{value}</div></div>;
}

function getInitialRole(pathname: string): WalletRole {
  if (pathname.endsWith("/wallet/creator")) return "Creator";
  if (pathname.endsWith("/wallet/buyer")) return "Buyer";
  const stored = localStorage.getItem(ROLE_KEY);
  return stored === "Creator" ? "Creator" : "Buyer";
}

function switchRole(role: WalletRole, navigate: ReturnType<typeof useNavigate>) {
  navigate(role === "Creator" ? "/app/wallet/creator" : "/app/wallet/buyer");
}

function defaultFilters(): WalletFilters {
  const now = new Date();
  return { from: fmtDate(addDays(now, -30)), to: fmtDate(now), direction: "", category: "", search: "", statuses: [] };
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDate(d: Date) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function roleBtn(active: boolean): CSSProperties { return { ...styles.btn, borderColor: active ? "var(--primary)" : "var(--border)", color: active ? "var(--primary)" : "var(--text)" }; }
function tabBtn(active: boolean): CSSProperties { return { ...styles.btn, borderColor: active ? "var(--primary)" : "var(--border)", color: active ? "var(--primary)" : "var(--text)", fontWeight: active ? 700 : 500 }; }
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
function buildPrintFriendlyReport(games: WalletDashboardGameItem[], from: string, to: string, locale: "en" | "vi") {
  const title = locale === "vi" ? "Báo cáo doanh thu Creator" : "Creator revenue report";
  const rows = games
    .map((g) => `<tr><td>${g.gameTitle}</td><td>${Math.round(g.gross).toLocaleString("en-US")}</td><td>${Math.round(g.fee).toLocaleString("en-US")}</td><td>${Math.round(g.net).toLocaleString("en-US")}</td><td>${g.buyersCount}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial;padding:24px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #bbb;padding:8px;text-align:left;}h1{margin:0 0 8px;}small{color:#666;}</style></head><body><h1>QuackOrbit</h1><h2>${title}</h2><small>${from} - ${to}</small><table><thead><tr><th>Game</th><th>Gross</th><th>Fee</th><th>Net</th><th>Buyers</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
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
  drawer: { position: "fixed", right: 24, top: 100, width: 360, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 12, display: "grid", gap: 8, zIndex: 80 },
  drawerLine: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 13 },
};
