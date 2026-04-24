import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguageStore } from "@/stores/language.store";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { orbitCoinApi, type OrbitCoinTransaction, type WalletDashboardGameItem } from "@/services/api/learner/orbitcoin.api";
import type { GameDetail } from "@/types/api/learner/maps";

type DisplayCurrency = "VND" | "OC";
type BuyerRow = { name: string; orders: number; grossVnd: number; latestAt: string };
type TrendRow = { period: string; grossVnd: number; netVnd: number };
type StatusRow = { name: string; value: number };

const dict = {
  en: {
    title: "Revenue analytics",
    range: "Range",
    back: "Back to wallet",
    mockOn: "Mock data: ON",
    mockOff: "Mock data: OFF",
    noDescription: "No description.",
    difficulty: "Difficulty",
    price: "Price",
    playCount: "Play count",
    published: "Published",
    yes: "Yes",
    no: "No",
    gross: "Gross",
    net: "Net",
    orders: "Orders",
    refundRate: "Refund rate",
    netMargin: "Net margin",
    revenueTrend: "Revenue trend",
    revenueHint: "Blue curve = gross revenue, green curve = net revenue after platform fee.",
    revenueAxis: "X axis: calendar date | Y axis: monetary value",
    ordersPerDay: "Orders per day",
    ordersHint: "Higher bars indicate stronger purchase volume for that day.",
    ordersAxis: "X axis: day | Y axis: number of orders",
    topBuyers: "Top buyers by gross",
    topBuyersHint: "Compares buyers with the highest spending within the selected period.",
    topBuyersAxis: "X axis: buyer rank | Y axis: total spending",
    statusDistribution: "Transaction status distribution",
    statusHint: "Use this to spot unhealthy ratios of pending or refunded transactions.",
    statusAxis: "Share of total transactions by status",
    buyerList: "Buyer list",
    transactions: "Transactions",
    grossFromRecords: "Gross from records",
    avgAmount: "Avg amount/tx",
    uniqueBuyers: "Unique buyers",
    buyer: "Buyer",
    latestOrder: "Latest order",
    legend: "Legend",
    units: "Unit",
    ordersUnit: "orders/day",
    currencyUnit: "currency value",
    buyersUnit: "top buyers",
    shareUnit: "share (%)",
    grossRevenue: "Gross revenue",
    netRevenue: "Net revenue",
    orderVolume: "Order volume",
    buyerSpend: "Buyer spend",
    completed: "Completed",
    pending: "Pending",
    refunded: "Refunded",
  },
  vi: {
    title: "Phân tích doanh thu",
    range: "Khoảng thời gian",
    back: "Quay lại ví",
    mockOn: "Dữ liệu mẫu: BẬT",
    mockOff: "Dữ liệu mẫu: TẮT",
    noDescription: "Chưa có mô tả.",
    difficulty: "Độ khó",
    price: "Giá",
    playCount: "Lượt chơi",
    published: "Đã xuất bản",
    yes: "Có",
    no: "Không",
    gross: "Doanh thu gộp",
    net: "Thực nhận",
    orders: "Đơn hàng",
    refundRate: "Tỉ lệ hoàn tiền",
    netMargin: "Biên lợi nhuận ròng",
    revenueTrend: "Xu hướng doanh thu",
    revenueHint: "Đường xanh dương = doanh thu gộp, xanh lá = thực nhận sau phí nền tảng.",
    revenueAxis: "Trục X: ngày | Trục Y: giá trị tiền tệ",
    ordersPerDay: "Đơn hàng theo ngày",
    ordersHint: "Cột càng cao cho thấy khối lượng mua trong ngày càng lớn.",
    ordersAxis: "Trục X: ngày | Trục Y: số lượng đơn",
    topBuyers: "Top người mua theo chi tiêu",
    topBuyersHint: "So sánh nhóm khách chi tiêu cao nhất trong khoảng thời gian lọc.",
    topBuyersAxis: "Trục X: thứ hạng người mua | Trục Y: tổng chi tiêu",
    statusDistribution: "Phân bổ trạng thái giao dịch",
    statusHint: "Dùng để nhận biết sớm tỷ lệ pending/refund bất thường.",
    statusAxis: "Tỷ trọng trạng thái trên tổng số giao dịch",
    buyerList: "Danh sách người mua",
    transactions: "Số giao dịch",
    grossFromRecords: "Doanh thu từ bản ghi",
    avgAmount: "Giá trị TB/giao dịch",
    uniqueBuyers: "Người mua duy nhất",
    buyer: "Người mua",
    latestOrder: "Đơn gần nhất",
    legend: "Chú thích",
    units: "Đơn vị",
    ordersUnit: "đơn/ngày",
    currencyUnit: "giá trị tiền tệ",
    buyersUnit: "người mua top",
    shareUnit: "tỷ trọng (%)",
    grossRevenue: "Doanh thu gộp",
    netRevenue: "Doanh thu ròng",
    orderVolume: "Khối lượng đơn",
    buyerSpend: "Chi tiêu người mua",
    completed: "Thành công",
    pending: "Đang xử lý",
    refunded: "Hoàn tiền",
  },
} as const;

export default function WalletRevenueDetailPage() {
  const { locale } = useLanguageStore();
  const t = dict[locale];
  const { gameId = "" } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("VND");
  const [exchangeRate, setExchangeRate] = useState(0);
  const [gameDetail, setGameDetail] = useState<GameDetail | null>(null);
  const [game, setGame] = useState<WalletDashboardGameItem | null>(null);
  const [playCount, setPlayCount] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mockMode, setMockMode] = useState<boolean>(() => {
    const saved = window.localStorage.getItem("walletRevenueMockMode");
    if (saved === "1") return true;
    if (saved === "0") return false;
    return new URLSearchParams(window.location.search).get("mock") === "1";
  });
  const isDevLikeHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const from = searchParams.get("from") || defaultFrom();
  const to = searchParams.get("to") || defaultTo();

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [gamesRes, txRes, rateRes, gameInfoRes, playedLeaderboardRes] = await Promise.all([
          orbitCoinApi.getDashboardGames({ from, to, pageNumber: 1, pageSize: 200 }),
          orbitCoinApi.getTransactionHistory({
            pageNumber: 1,
            pageSize: 500,
            from,
            to,
            relatedEntityType: "Game",
            relatedEntityId: gameId,
          }),
          orbitCoinApi.getExchangeRate(),
          learnerMapsApi.getMapById(gameId),
          learnerMapsApi.getMostPlayedCreatedLeaderboard("Month", 1, 100),
        ]);

        if (!alive) return;
        if (!gamesRes.isSuccess || !txRes.isSuccess) throw new Error("load_failed");

        const matchedGame = (gamesRes.data?.items ?? []).find((item) => item.gameId === gameId) ?? null;
        const playedRow = (playedLeaderboardRes.data?.data?.items ?? []).find((item) => item.gameId === gameId || item.mapId === gameId);
        setGame(matchedGame);
        setGameDetail(gameInfoRes.data?.data ?? null);
        setPlayCount(playedRow?.playCount ?? null);
        setTransactions(txRes.data?.items ?? []);
        setExchangeRate(rateRes.data?.rate ?? 0);
      } catch {
        if (alive) setError("Failed to load revenue analytics.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [from, gameId, to]);

  useEffect(() => {
    window.localStorage.setItem("walletRevenueMockMode", mockMode ? "1" : "0");
  }, [mockMode]);

  const buyerRows = useMemo<BuyerRow[]>(() => {
    const byBuyer = new Map<string, BuyerRow>();
    for (const tx of transactions) {
      const key = (tx.counterpartyName || "Unknown buyer").trim() || "Unknown buyer";
      const current = byBuyer.get(key);
      const amount = Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0);
      if (!current) {
        byBuyer.set(key, {
          name: key,
          orders: 1,
          grossVnd: amount,
          latestAt: tx.createdAt,
        });
        continue;
      }
      current.orders += 1;
      current.grossVnd += amount;
      if (new Date(tx.createdAt).getTime() > new Date(current.latestAt).getTime()) {
        current.latestAt = tx.createdAt;
      }
    }
    return Array.from(byBuyer.values()).sort((a, b) => b.grossVnd - a.grossVnd);
  }, [transactions]);

  const revenueTrend = useMemo<TrendRow[]>(() => {
    const trendMap = new Map<string, TrendRow>();
    for (const tx of transactions) {
      const period = tx.createdAt.slice(0, 10);
      const grossVnd = Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0);
      const feeVnd = Math.abs(tx.feeAmount || 0);
      const current = trendMap.get(period) ?? { period, grossVnd: 0, netVnd: 0 };
      current.grossVnd += grossVnd;
      current.netVnd += Math.max(0, grossVnd - feeVnd);
      trendMap.set(period, current);
    }
    return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [transactions]);
  const orderTrend = useMemo(() => revenueTrend.map((x) => ({ period: x.period, orders: 0 })), [revenueTrend]);
  const orderTrendMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      const period = tx.createdAt.slice(0, 10);
      map.set(period, (map.get(period) ?? 0) + 1);
    }
    return map;
  }, [transactions]);
  const mergedOrderTrend = useMemo(
    () => orderTrend.map((item) => ({ ...item, orders: orderTrendMap.get(item.period) ?? 0 })),
    [orderTrend, orderTrendMap],
  );
  const statusDistribution = useMemo<StatusRow[]>(() => {
    const bucket = new Map<string, number>();
    for (const tx of transactions) {
      const status = tx.status || "Completed";
      bucket.set(status, (bucket.get(status) ?? 0) + 1);
    }
    return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions]);
  const topBuyers = useMemo(() => buyerRows.slice(0, 8), [buyerRows]);
  const displayTransactions = useMemo(
    () => (mockMode && isDevLikeHost ? generateMockTransactions(from, to) : transactions),
    [from, isDevLikeHost, mockMode, to, transactions],
  );
  const displayGame = useMemo(
    () => (mockMode && isDevLikeHost ? buildMockGameSummary(game, displayTransactions) : game),
    [displayTransactions, game, isDevLikeHost, mockMode],
  );
  const displayBuyerRows = useMemo(() => {
    if (!(mockMode && isDevLikeHost)) return buyerRows;
    const byBuyer = new Map<string, BuyerRow>();
    for (const tx of displayTransactions) {
      const key = (tx.counterpartyName || "Unknown buyer").trim() || "Unknown buyer";
      const current = byBuyer.get(key);
      const amount = Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0);
      if (!current) {
        byBuyer.set(key, { name: key, orders: 1, grossVnd: amount, latestAt: tx.createdAt });
      } else {
        current.orders += 1;
        current.grossVnd += amount;
        if (new Date(tx.createdAt).getTime() > new Date(current.latestAt).getTime()) current.latestAt = tx.createdAt;
      }
    }
    return Array.from(byBuyer.values()).sort((a, b) => b.grossVnd - a.grossVnd);
  }, [buyerRows, displayTransactions, isDevLikeHost, mockMode]);
  const displayRevenueTrend = useMemo(
    () => (mockMode && isDevLikeHost ? buildTrendFromTransactions(displayTransactions) : revenueTrend),
    [displayTransactions, isDevLikeHost, mockMode, revenueTrend],
  );
  const displayOrderTrend = useMemo(
    () => (mockMode && isDevLikeHost ? buildOrderTrend(displayRevenueTrend, displayTransactions) : mergedOrderTrend),
    [displayRevenueTrend, displayTransactions, isDevLikeHost, mergedOrderTrend, mockMode],
  );
  const displayStatusDistribution = useMemo(
    () => (mockMode && isDevLikeHost ? buildStatusDistribution(displayTransactions) : statusDistribution),
    [displayTransactions, isDevLikeHost, mockMode, statusDistribution],
  );
  const displayTopBuyers = useMemo(
    () => (mockMode && isDevLikeHost ? displayBuyerRows.slice(0, 8) : topBuyers),
    [displayBuyerRows, isDevLikeHost, mockMode, topBuyers],
  );
  const chartStatusDistribution = useMemo(
    () => displayStatusDistribution.map((item) => ({ ...item, name: mapStatusLabel(item.name, t) })),
    [displayStatusDistribution, t],
  );

  const txStats = useMemo(() => {
    const source = mockMode && isDevLikeHost ? displayTransactions : transactions;
    const successTx = source.filter((tx) => (tx.status ?? "Completed").toLowerCase() !== "failed");
    const total = successTx.length;
    const grossVnd = successTx.reduce((sum, tx) => sum + Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0), 0);
    const avg = total > 0 ? grossVnd / total : 0;
    return { total, grossVnd, avg };
  }, [displayTransactions, isDevLikeHost, mockMode, transactions]);

  const netMargin = displayGame && displayGame.gross > 0 ? (displayGame.net / displayGame.gross) * 100 : 0;
  const refundRate = displayGame && displayGame.ordersCount > 0 ? (displayGame.refundedOrdersCount / displayGame.ordersCount) * 100 : 0;
  const imageCandidates = useMemo(() => {
    const urls = [
      gameDetail?.avatarUrl,
      ...(gameDetail?.gallery?.map((item) => item.url) ?? []),
    ].filter((value): value is string => Boolean(value && value.trim().length > 0));
    return Array.from(new Set(urls));
  }, [gameDetail?.avatarUrl, gameDetail?.gallery]);
  const [imageIndex, setImageIndex] = useState(0);
  useEffect(() => {
    setImageIndex(0);
  }, [imageCandidates]);
  const gameImage = imageCandidates[imageIndex] ?? "";

  return (
    <div style={styles.page}>
      <div style={styles.head}>
        <div>
          <h1 style={styles.title}>Revenue analytics</h1>
          <h1 style={styles.title}>{t.title}</h1>
          <div style={styles.sub}>{t.range}: {from} - {to}</div>
        </div>
        <div style={styles.actions}>
          {isDevLikeHost ? (
            <button style={btn(mockMode)} onClick={() => setMockMode((v) => !v)}>
              {mockMode ? t.mockOn : t.mockOff}
            </button>
          ) : null}
          <button style={btn(displayCurrency === "VND")} onClick={() => setDisplayCurrency("VND")}>VND</button>
          <button style={btn(displayCurrency === "OC")} onClick={() => setDisplayCurrency("OC")}>OC</button>
          <Link style={styles.btn} to="/app/wallet">{t.back}</Link>
        </div>
      </div>

      {loading ? <div style={styles.card}>Loading...</div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {!loading && !error ? (
        <>
          <section style={styles.card}>
            <div style={styles.hero}>
              {gameImage ? (
                <img
                  src={gameImage}
                  alt={game?.gameTitle || "Game"}
                  style={styles.cover}
                  onError={(e) => {
                    if (imageIndex < imageCandidates.length - 1) {
                      setImageIndex((prev) => prev + 1);
                      return;
                    }
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null}
              <div style={{ display: "grid", gap: 6 }}>
                <h3 style={styles.cardTitle}>{game?.gameTitle || gameDetail?.title || "Selected game"}</h3>
                <div style={styles.sub}>{gameDetail?.description || t.noDescription}</div>
                <div style={styles.metaRow}>
                  <span style={styles.badge}>{t.difficulty}: {gameDetail?.difficulty ?? "-"}</span>
                  <span style={styles.badge}>
                    {t.price}: {formatOcAsDisplayMoney(gameDetail?.price ?? 0, exchangeRate, displayCurrency)}
                  </span>
                  <span style={styles.badge}>{t.playCount}: {playCount ?? "-"}</span>
                  <span style={styles.badge}>{t.published}: {gameDetail?.isPublished ? t.yes : t.no}</span>
                </div>
              </div>
            </div>
            <div style={styles.miniStats}>
              <Kpi label={t.gross} value={formatMoney(displayGame?.gross ?? 0, exchangeRate, displayCurrency)} />
              <Kpi label={t.net} value={formatMoney(displayGame?.net ?? 0, exchangeRate, displayCurrency)} />
              <Kpi label={t.orders} value={String(displayGame?.ordersCount ?? 0)} />
              <Kpi label={t.refundRate} value={`${refundRate.toFixed(1)}%`} />
              <Kpi label={t.netMargin} value={`${netMargin.toFixed(1)}%`} />
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.chartHead}>
              <h3 style={styles.cardTitle}>{t.revenueTrend}</h3>
              <div style={styles.chartHint}>{t.revenueHint}</div>
              <div style={styles.chartAxisHint}>{t.revenueAxis}</div>
            </div>
            <div style={styles.chartWithLegend}>
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <AreaChart data={displayRevenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatMoney(Number(value), exchangeRate, displayCurrency)} />
                    <Area type="monotone" dataKey="grossVnd" stroke="#2563eb" fill="#2563eb33" />
                    <Area type="monotone" dataKey="netVnd" stroke="#16a34a" fill="#16a34a33" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                title={t.legend}
                unitLabel={t.units}
                unitValue={t.currencyUnit}
                items={[
                  { label: t.grossRevenue, color: "#2563eb" },
                  { label: t.netRevenue, color: "#16a34a" },
                ]}
              />
            </div>
          </section>

          <section style={styles.chartGrid}>
            <div style={styles.card}>
              <div style={styles.chartHead}>
                <h3 style={styles.cardTitle}>{t.ordersPerDay}</h3>
                <div style={styles.chartHint}>{t.ordersHint}</div>
                <div style={styles.chartAxisHint}>{t.ordersAxis}</div>
              </div>
              <div style={styles.chartWithLegend}>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={displayOrderTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="orders" fill="#7c3aed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend
                  title={t.legend}
                  unitLabel={t.units}
                  unitValue={t.ordersUnit}
                  items={[
                    { label: t.orderVolume, color: "#7c3aed" },
                  ]}
                />
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.chartHead}>
                <h3 style={styles.cardTitle}>{t.topBuyers}</h3>
                <div style={styles.chartHint}>{t.topBuyersHint}</div>
                <div style={styles.chartAxisHint}>{t.topBuyersAxis}</div>
              </div>
              <div style={styles.chartWithLegend}>
                <div style={{ width: "100%", height: 260 }}>
                  <ResponsiveContainer>
                    <BarChart data={displayTopBuyers}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip formatter={(value) => formatMoney(Number(value), exchangeRate, displayCurrency)} />
                      <Bar dataKey="grossVnd" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ChartLegend
                  title={t.legend}
                  unitLabel={t.units}
                  unitValue={t.buyersUnit}
                  items={[
                    { label: t.buyerSpend, color: "#f59e0b" },
                  ]}
                />
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <div style={styles.chartHead}>
              <h3 style={styles.cardTitle}>{t.statusDistribution}</h3>
              <div style={styles.chartHint}>{t.statusHint}</div>
              <div style={styles.chartAxisHint}>{t.statusAxis}</div>
            </div>
            <div style={styles.chartWithLegend}>
              <div style={styles.pieWrap}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartStatusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={96} label>
                      {chartStatusDistribution.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                title={t.legend}
                unitLabel={t.units}
                unitValue={t.shareUnit}
                items={chartStatusDistribution.map((item, index) => ({
                  label: `${item.name} (${item.value})`,
                  color: STATUS_COLORS[index % STATUS_COLORS.length],
                }))}
              />
            </div>
          </section>

          <section style={styles.card}>
            <h3 style={styles.cardTitle}>{t.buyerList}</h3>
            <div style={styles.kpiGrid}>
              <Kpi label={t.transactions} value={String(txStats.total)} />
              <Kpi label={t.grossFromRecords} value={formatMoney(txStats.grossVnd, exchangeRate, displayCurrency)} />
              <Kpi label={t.avgAmount} value={formatMoney(txStats.avg, exchangeRate, displayCurrency)} />
              <Kpi label={t.uniqueBuyers} value={String(displayBuyerRows.length)} />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>{t.buyer}</th>
                    <th style={styles.th}>{t.orders}</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>{t.gross}</th>
                    <th style={styles.th}>{t.latestOrder}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBuyerRows.map((buyer) => (
                    <tr key={buyer.name}>
                      <td style={styles.td}>{buyer.name}</td>
                      <td style={styles.td}>{buyer.orders}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>{formatMoney(buyer.grossVnd, exchangeRate, displayCurrency)}</td>
                      <td style={styles.td}>{new Date(buyer.latestAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function buildTrendFromTransactions(source: OrbitCoinTransaction[]): TrendRow[] {
  const trendMap = new Map<string, TrendRow>();
  for (const tx of source) {
    const period = tx.createdAt.slice(0, 10);
    const grossVnd = Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0);
    // feeAmount in transaction is OC; when aggregating VND trend, use VND-equivalent fee.
    const feeVnd = grossVnd * 0.05;
    const current = trendMap.get(period) ?? { period, grossVnd: 0, netVnd: 0 };
    current.grossVnd += grossVnd;
    current.netVnd += Math.max(0, grossVnd - feeVnd);
    trendMap.set(period, current);
  }
  return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function buildOrderTrend(trend: TrendRow[], source: OrbitCoinTransaction[]) {
  const map = new Map<string, number>();
  for (const tx of source) {
    const period = tx.createdAt.slice(0, 10);
    map.set(period, (map.get(period) ?? 0) + 1);
  }
  return trend.map((item) => ({ period: item.period, orders: map.get(item.period) ?? 0 }));
}

function buildStatusDistribution(source: OrbitCoinTransaction[]): StatusRow[] {
  const bucket = new Map<string, number>();
  for (const tx of source) {
    const status = tx.status || "Completed";
    bucket.set(status, (bucket.get(status) ?? 0) + 1);
  }
  return Array.from(bucket.entries()).map(([name, value]) => ({ name, value }));
}

function buildMockGameSummary(base: WalletDashboardGameItem | null, source: OrbitCoinTransaction[]): WalletDashboardGameItem {
  const gross = source.reduce((sum, tx) => sum + Math.max(0, tx.amountVnd ?? tx.amountVND ?? 0), 0);
  const fee = gross * 0.05;
  const orders = source.length;
  const buyers = new Set(source.map((tx) => tx.counterpartyName || "Unknown")).size;
  const refunded = source.filter((tx) => (tx.status || "").toLowerCase() === "refunded").length;
  const pending = source.filter((tx) => (tx.status || "").toLowerCase() === "pending").length;
  return {
    gameId: base?.gameId ?? "mock-game",
    gameTitle: base?.gameTitle ?? "Mock Revenue Game",
    buyersCount: buyers,
    ordersCount: orders,
    pendingOrdersCount: pending,
    refundedOrdersCount: refunded,
    gross,
    fee,
    net: gross - fee,
    averageOrderValue: orders > 0 ? gross / orders : 0,
    lastSoldAt: source[0]?.createdAt ?? null,
  };
}

function generateMockTransactions(from: string, to: string): OrbitCoinTransaction[] {
  const start = new Date(from);
  const end = new Date(to);
  const days = Math.max(7, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const buyers = ["Nguyen Van A", "Tran Thi B", "Le Minh C", "Pham D", "Hoang E", "Vo F", "Bui G", "Do H"];
  const statuses = ["Completed", "Pending", "Refunded", "Completed", "Completed", "Completed"];
  const list: OrbitCoinTransaction[] = [];
  for (let dayOffset = 0; dayOffset < days; dayOffset += 1) {
    const d0 = new Date(start);
    d0.setDate(d0.getDate() + dayOffset);
    const daySeed = Math.sin(dayOffset * 0.55) * 0.2 + Math.cos(dayOffset * 0.22) * 0.15;
    const weekendBoost = d0.getDay() === 0 || d0.getDay() === 6 ? 1.22 : 1;
    const spikeBoost = dayOffset % 9 === 0 ? 1.42 : dayOffset % 13 === 0 ? 1.3 : 1;
    const dailyOrders = Math.max(2, Math.min(12, Math.round((5 + daySeed * 6) * weekendBoost * spikeBoost)));
    for (let j = 0; j < dailyOrders; j += 1) {
      const i = dayOffset * 20 + j;
      const d = new Date(d0);
      d.setHours(8 + ((j * 3 + dayOffset) % 12), (j * 11 + dayOffset * 7) % 60, 0, 0);
      const base = 18000 + ((i * 997) % 105000);
      const intraDayFactor = 0.82 + ((j % 5) * 0.07);
      const amountVnd = Math.round(base * weekendBoost * spikeBoost * intraDayFactor);
      const status = statuses[(i * 7 + dayOffset) % statuses.length];
      list.push({
        id: `mock-${dayOffset}-${j}`,
        amount: Math.max(1, Math.round(amountVnd / 1000)),
        amountVnd,
        amountVND: amountVnd,
        transactionType: 1,
        direction: "In",
        category: "GameRevenue",
        relatedEntityType: "Game",
        relatedEntityId: "mock-game",
        paymentRecordId: null,
        gameId: "mock-game",
        packageId: null,
        counterpartyName: buyers[(i + j) % buyers.length],
        grossAmount: amountVnd,
        netAmount: Math.round(amountVnd * 0.95),
        feeAmount: Math.round(amountVnd * 0.05),
        status,
        balanceAfter: null,
        note: dayOffset % 11 === 0 ? "Mock campaign spike order" : "Mock order",
        createdAt: d.toISOString(),
      });
    }
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div style={styles.kpi}><div style={styles.sub}>{label}</div><div style={styles.kpiValue}>{value}</div></div>;
}

function ChartLegend({
  title,
  unitLabel,
  unitValue,
  items,
}: {
  title: string;
  unitLabel: string;
  unitValue: string;
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <aside style={styles.legendBox}>
      <div style={styles.legendTitle}>{title}</div>
      <div style={styles.legendUnit}><strong>{unitLabel}:</strong> {unitValue}</div>
      <div style={styles.legendList}>
        {items.map((item) => (
          <div key={item.label} style={styles.legendItem}>
            <span style={{ ...styles.legendSwatch, background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function formatMoney(vnd: number, exchangeRate: number, currency: DisplayCurrency) {
  if (currency === "OC" && exchangeRate > 0) return `${(vnd / exchangeRate).toLocaleString("en-US", { maximumFractionDigits: 2 })} OC`;
  return `${Math.round(vnd).toLocaleString("en-US")} VND`;
}

function formatOcAsDisplayMoney(oc: number, exchangeRate: number, currency: DisplayCurrency) {
  if (currency === "OC") return `${oc.toLocaleString("en-US", { maximumFractionDigits: 2 })} OC`;
  if (exchangeRate > 0) return formatMoney(oc * exchangeRate, exchangeRate, "VND");
  return `${oc.toLocaleString("en-US", { maximumFractionDigits: 2 })} OC`;
}

function defaultFrom() {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  return toDateInput(now);
}

function defaultTo() {
  return toDateInput(new Date());
}

function toDateInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function btn(active: boolean): CSSProperties {
  return { ...styles.btn, borderColor: active ? "var(--primary)" : "var(--border)", color: active ? "var(--primary)" : "var(--text)" };
}

function mapStatusLabel(status: string, t: (typeof dict)["vi"] | (typeof dict)["en"]) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return t.completed;
  if (normalized === "pending") return t.pending;
  if (normalized === "refunded") return t.refunded;
  return status;
}

const styles: Record<string, CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "0 20px 28px", display: "grid", gap: 12 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  actions: { display: "flex", gap: 8, alignItems: "center" },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  sub: { fontSize: 12, color: "var(--muted)" },
  card: {
    border: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
    borderRadius: 14,
    background: "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, #ffffff 8%), var(--surface))",
    padding: 14,
    display: "grid",
    gap: 12,
    boxShadow: "0 6px 20px rgba(15, 23, 42, 0.06)",
  },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(380px,1fr))", gap: 10 },
  chartWithLegend: { display: "grid", gridTemplateColumns: "1fr 180px", gap: 8, alignItems: "start" },
  hero: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, alignItems: "start" },
  cover: {
    width: 220,
    height: 140,
    objectFit: "cover",
    borderRadius: 12,
    border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
    background: "var(--surface-2)",
    boxShadow: "0 10px 24px rgba(2, 6, 23, 0.14)",
  },
  metaRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  badge: {
    border: "1px solid color-mix(in srgb, var(--border) 72%, transparent)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    background: "color-mix(in srgb, var(--surface-2) 92%, #ffffff 8%)",
    fontWeight: 600,
  },
  cardTitle: { margin: 0, fontSize: 16 },
  chartHead: { display: "grid", gap: 4 },
  chartHint: { fontSize: 12, color: "var(--muted)" },
  chartAxisHint: { fontSize: 11, color: "var(--muted)", fontStyle: "italic" },
  legendBox: { padding: "4px 2px", background: "transparent", display: "grid", gap: 6 },
  legendTitle: { fontWeight: 700, fontSize: 13, color: "var(--text)" },
  legendUnit: { fontSize: 11, color: "var(--muted)" },
  legendList: { display: "grid", gap: 6 },
  legendItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text)" },
  legendSwatch: { width: 10, height: 10, borderRadius: 2, display: "inline-block" },
  miniStats: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 },
  kpi: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", padding: 10 },
  kpiValue: { fontWeight: 800 },
  btn: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "7px 10px", cursor: "pointer", textDecoration: "none" },
  error: { color: "var(--danger)", fontWeight: 700 },
  pieWrap: { width: "100%", height: 300 },
  tableWrap: { width: "100%", overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 580 },
  th: { textAlign: "left", fontSize: 12, color: "var(--muted)", borderBottom: "1px solid var(--border)", padding: "8px 10px", whiteSpace: "nowrap" },
  td: { padding: "8px 10px", borderBottom: "1px solid var(--border)", fontSize: 13, whiteSpace: "nowrap" },
};

const STATUS_COLORS = ["#16a34a", "#f59e0b", "#ef4444", "#2563eb", "#7c3aed", "#06b6d4"];
