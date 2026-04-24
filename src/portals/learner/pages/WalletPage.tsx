import { useEffect, useMemo, useState } from "react";
import {
  CoinTransactionTypeEnum,
  orbitCoinApi,
  type OrbitCoinTransaction,
  type TransactionHistoryParams,
  type WalletDashboardGameItem,
  type WalletDashboardSummary,
} from "@/services/api/learner/orbitcoin.api";

type WalletRole = "Buyer" | "Creator";
type WalletFilters = {
  from: string;
  to: string;
  direction: "" | "In" | "Out";
  category: "" | "Topup" | "BuyPackage" | "BuyGame" | "GameRevenue";
};

const PAGE_SIZE = 12;
const categoryMap: Record<Exclude<WalletFilters["category"], "">, number> = {
  Topup: CoinTransactionTypeEnum.Credit,
  BuyPackage: 3,
  BuyGame: 2,
  GameRevenue: 1,
};

export default function WalletPage() {
  const [role, setRole] = useState<WalletRole>("Buyer");
  const [filters, setFilters] = useState<WalletFilters>(defaultFilters());
  const [page, setPage] = useState(1);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo<TransactionHistoryParams>(() => ({
    pageNumber: page,
    pageSize: PAGE_SIZE,
    from: filters.from,
    to: filters.to,
    direction: filters.direction || undefined,
    categories: filters.category ? [categoryMap[filters.category]] : undefined,
  }), [filters, page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, txRes, summaryRes, gamesRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory(query),
          orbitCoinApi.getDashboardSummary({ role, from: query.from, to: query.to }),
          orbitCoinApi.getDashboardGames({ from: query.from, to: query.to, pageNumber: 1, pageSize: 5 }),
        ]);
        if (!alive) return;
        if (!balanceRes.isSuccess || !txRes.isSuccess || !summaryRes.isSuccess || !gamesRes.isSuccess) throw new Error("load");
        setBalance(balanceRes.data?.balance ?? 0);
        setSummary(summaryRes.data ?? null);
        setTransactions(txRes.data?.items ?? []);
        setTotalPages(Math.max(1, Math.ceil((txRes.data?.totalCount ?? 0) / PAGE_SIZE)));
        setGames(gamesRes.data?.items ?? []);
      } catch {
        if (alive) setError("Failed to load wallet.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [query, role]);

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Wallet</h1>
          <div style={styles.sub}>{role === "Buyer" ? "Top-up and spending" : "Creator revenue overview"}</div>
        </div>
        <div style={styles.switchWrap}>
          <button style={roleBtn(role === "Buyer")} onClick={() => setRole("Buyer")}>Buyer</button>
          <button style={roleBtn(role === "Creator")} onClick={() => setRole("Creator")}>Creator</button>
        </div>
      </div>

      <div style={styles.metrics}>
        <Metric label="Balance" value={`${balance.toLocaleString("en-US")} OC`} />
        <Metric label="In" value={`${(summary?.totalIn ?? 0).toLocaleString("en-US")} OC`} />
        <Metric label="Out" value={`${(summary?.totalOut ?? 0).toLocaleString("en-US")} OC`} />
        <Metric label="Net" value={`${(summary?.netFlow ?? 0).toLocaleString("en-US")} OC`} />
      </div>

      <div style={styles.filters}>
        <input style={styles.input} type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} />
        <input style={styles.input} type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} />
        <select style={styles.input} value={filters.direction} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value as WalletFilters["direction"] }))}>
          <option value="">All flow</option><option value="In">In</option><option value="Out">Out</option>
        </select>
        <select style={styles.input} value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value as WalletFilters["category"] }))}>
          <option value="">All types</option><option value="Topup">Topup</option><option value="BuyPackage">Buy package</option><option value="BuyGame">Buy game</option><option value="GameRevenue">Game revenue</option>
        </select>
      </div>

      {role === "Creator" && (
        <div style={styles.panel}>
          <h3 style={styles.panelTitle}>Creator games</h3>
          {games.length === 0 ? <div style={styles.sub}>No data.</div> : games.map((g) => (
            <div key={g.gameId} style={styles.row}>
              <span>{g.gameTitle}</span>
              <span>{g.gross.toLocaleString("en-US")} OC</span>
            </div>
          ))}
        </div>
      )}

      <div style={styles.panel}>
        <h3 style={styles.panelTitle}>Transactions</h3>
        {loading ? <div style={styles.sub}>Loading...</div> : error ? <div style={styles.err}>{error}</div> : transactions.map((tx) => (
          <div key={tx.id} style={styles.row}>
            <span>{tx.note || tx.category || "Transaction"}</span>
            <span style={{ color: tx.amount >= 0 ? "var(--success)" : "var(--warning)" }}>{tx.amount.toLocaleString("en-US")} OC</span>
          </div>
        ))}
        <div style={styles.pager}>
          <button style={styles.btn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span style={styles.sub}>Page {page}/{totalPages}</span>
          <button style={styles.btn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={styles.metric}><div style={styles.sub}>{label}</div><div style={styles.metricValue}>{value}</div></div>;
}

function defaultFilters(): WalletFilters {
  const now = new Date();
  return { from: fmt(addDays(now, -30)), to: fmt(now), direction: "", category: "" };
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d: Date) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function roleBtn(active: boolean): React.CSSProperties { return { ...styles.btn, borderColor: active ? "var(--primary)" : "var(--border)", color: active ? "var(--primary)" : "var(--text)" }; }

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1180, margin: "0 auto", padding: "0 20px 28px", display: "grid", gap: 10 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  sub: { color: "var(--muted)", fontSize: 12 },
  switchWrap: { display: "flex", gap: 8 },
  btn: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "7px 10px", cursor: "pointer" },
  metrics: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 },
  metric: { border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10 },
  metricValue: { fontWeight: 800, marginTop: 2 },
  filters: { display: "flex", flexWrap: "wrap", gap: 8, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10 },
  input: { border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", background: "var(--surface-2)", color: "var(--text)" },
  panel: { border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", padding: 10, display: "grid", gap: 8 },
  panelTitle: { margin: 0, fontSize: 16 },
  row: { display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 },
  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  err: { color: "var(--danger)", fontWeight: 700 },
};
import { useEffect, useMemo, useState } from "react";
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
type DatePreset = "7d" | "30d" | "90d" | "ytd";

type WalletFilters = {
  from: string;
  to: string;
  direction: "" | "In" | "Out";
  category: "" | "Topup" | "BuyPackage" | "BuyGame" | "GameRevenue" | "Refund" | "SystemFee" | "AdminAdjustment";
  status: "" | "Pending" | "Completed" | "Refunded";
};

const PAGE_SIZE = 12;

const categoryMap: Record<NonNullable<WalletFilters["category"]>, number> = {
  Topup: CoinTransactionTypeEnum.Credit,
  BuyPackage: 3,
  BuyGame: 2,
  GameRevenue: 1,
  Refund: 5,
  SystemFee: 4,
  AdminAdjustment: 6,
};

export default function WalletPage() {
  const [role, setRole] = useState<WalletRole>("Buyer");
  const [filters, setFilters] = useState<WalletFilters>(() => getDefaultFilters());
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [trend, setTrend] = useState<WalletDashboardTrendItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);

  const [topUpAmount, setTopUpAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const query = useMemo<TransactionHistoryParams>(() => {
    const categories = filters.category ? [categoryMap[filters.category]] : undefined;
    return {
      pageNumber: page,
      pageSize: PAGE_SIZE,
      from: filters.from,
      to: filters.to,
      direction: filters.direction || undefined,
      categories,
      status: filters.status || undefined,
    };
  }, [filters, page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, txRes, summaryRes, trendRes, gamesRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory(query),
          orbitCoinApi.getDashboardSummary({ role, from: query.from, to: query.to }),
          orbitCoinApi.getDashboardTrend({ role, from: query.from, to: query.to, bucket: "Day" }),
          orbitCoinApi.getDashboardGames({ from: query.from, to: query.to, pageNumber: 1, pageSize: 6 }),
        ]);

        if (!alive) return;
        if (!balanceRes.isSuccess || !txRes.isSuccess || !summaryRes.isSuccess || !trendRes.isSuccess || !gamesRes.isSuccess) {
          throw new Error("wallet_load_failed");
        }

        setBalance(balanceRes.data?.balance ?? 0);
        setSummary(summaryRes.data ?? null);
        setTransactions(txRes.data?.items ?? []);
        setTotalPages(Math.max(1, Math.ceil((txRes.data?.totalCount ?? 0) / PAGE_SIZE)));
        setTrend(trendRes.data?.items ?? []);
        setGames(gamesRes.data?.items ?? []);
      } catch {
        if (alive) setError("Cannot load wallet data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [query, role]);

  const applyPreset = (preset: DatePreset) => {
    const now = new Date();
    const to = formatDate(now);
    let from = formatDate(addDays(now, -30));
    if (preset === "7d") from = formatDate(addDays(now, -7));
    if (preset === "90d") from = formatDate(addDays(now, -90));
    if (preset === "ytd") from = `${now.getFullYear()}-01-01`;
    setFilters((prev) => ({ ...prev, from, to }));
    setPage(1);
  };

  const onTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setIsToppingUp(true);
    try {
      const res = await orbitCoinApi.deposit({ amountOrbitCoin: amount });
      if (res.isSuccess && res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Wallet</h1>
          <p style={styles.subtitle}>
            {role === "Buyer" ? "Track top-up and spending." : "Track game revenue and platform fee."}
          </p>
        </div>
        <div style={styles.roleSwitch}>
          <button style={switchBtn(role === "Buyer")} onClick={() => setRole("Buyer")}>Buyer</button>
          <button style={switchBtn(role === "Creator")} onClick={() => setRole("Creator")}>Creator</button>
        </div>
      </header>

      <section style={styles.strip}>
        <Metric label="Balance" value={`${balance.toLocaleString("en-US")} OC`} />
        <Metric label="In" value={`${(summary?.totalIn ?? 0).toLocaleString("en-US")} OC`} />
        <Metric label="Out" value={`${(summary?.totalOut ?? 0).toLocaleString("en-US")} OC`} />
        <Metric label="Net" value={`${(summary?.netFlow ?? 0).toLocaleString("en-US")} OC`} />
        {role === "Creator" && (
          <>
            <Metric label="Gross" value={`${(summary?.grossRevenue ?? 0).toLocaleString("en-US")} OC`} />
            <Metric label="Fee" value={`${(summary?.platformFee ?? 0).toLocaleString("en-US")} OC`} />
          </>
        )}
      </section>

      <section style={styles.filters}>
        <div style={styles.filterRow}>
          <button style={styles.ghostBtn} onClick={() => applyPreset("7d")}>7D</button>
          <button style={styles.ghostBtn} onClick={() => applyPreset("30d")}>30D</button>
          <button style={styles.ghostBtn} onClick={() => applyPreset("90d")}>90D</button>
          <button style={styles.ghostBtn} onClick={() => applyPreset("ytd")}>YTD</button>
          <input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} style={styles.input} />
          <input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} style={styles.input} />
          <select value={filters.direction} onChange={(e) => setFilters((p) => ({ ...p, direction: e.target.value as WalletFilters["direction"] }))} style={styles.input}>
            <option value="">All flow</option>
            <option value="In">In</option>
            <option value="Out">Out</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value as WalletFilters["category"] }))} style={styles.input}>
            <option value="">All categories</option>
            <option value="Topup">Topup</option>
            <option value="BuyPackage">Buy package</option>
            <option value="BuyGame">Buy game</option>
            <option value="GameRevenue">Game revenue</option>
          </select>
          <button style={styles.ghostBtn} onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? "Hide advanced" : "Advanced"}
          </button>
        </div>
        {showAdvanced && (
          <div style={styles.filterRow}>
            <select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as WalletFilters["status"] }))} style={styles.input}>
              <option value="">All status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        )}
      </section>

      <section style={styles.main}>
        {role === "Buyer" && (
          <div style={styles.block}>
            <h3 style={styles.blockTitle}>Top up</h3>
            <div style={styles.filterRow}>
              {[10, 50, 100, 500].map((v) => (
                <button key={v} style={styles.ghostBtn} onClick={() => setTopUpAmount(String(v))}>{v} OC</button>
              ))}
              <input
                type="number"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                placeholder="Amount"
                style={styles.input}
              />
              <button style={styles.primaryBtn} onClick={onTopUp} disabled={isToppingUp}>
                {isToppingUp ? "Redirecting..." : "Top up"}
              </button>
            </div>
          </div>
        )}

        {role === "Creator" && (
          <div style={styles.block}>
            <h3 style={styles.blockTitle}>Your games revenue</h3>
            {games.length === 0 ? (
              <div style={styles.muted}>No creator revenue in selected range.</div>
            ) : (
              <div style={styles.list}>
                {games.map((g) => (
                  <div key={g.gameId} style={styles.row}>
                    <div>
                      <div style={styles.rowTitle}>{g.gameTitle}</div>
                      <div style={styles.muted}>{g.buyersCount} buyers • {g.ordersCount} orders</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={styles.rowValue}>{g.gross.toLocaleString("en-US")} OC</div>
                      <div style={styles.muted}>Fee {g.fee.toLocaleString("en-US")} / Net {g.net.toLocaleString("en-US")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={styles.block}>
          <h3 style={styles.blockTitle}>Transactions</h3>
          {loading ? (
            <div style={styles.muted}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : transactions.length === 0 ? (
            <div style={styles.muted}>No transactions found.</div>
          ) : (
            <>
              <div style={styles.list}>
                {transactions.map((tx) => (
                  <div key={tx.id} style={styles.row}>
                    <div>
                      <div style={styles.rowTitle}>{tx.note || tx.category || "Transaction"}</div>
                      <div style={styles.muted}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ ...styles.rowValue, color: tx.amount >= 0 ? "var(--success)" : "var(--warning)" }}>
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount.toLocaleString("en-US")} OC
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.pager}>
                <button style={styles.ghostBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
                <span style={styles.muted}>Page {page}/{totalPages}</span>
                <button style={styles.ghostBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
              </div>
            </>
          )}
        </div>
      </section>

      <section style={styles.block}>
        <h3 style={styles.blockTitle}>Trend (10 latest points)</h3>
        <TrendInline role={role} items={trend} />
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricLabel}>{label}</div>
      <div style={styles.metricValue}>{value}</div>
    </div>
  );
}

function TrendInline({ role, items }: { role: WalletRole; items: WalletDashboardTrendItem[] }) {
  const data = items.slice(-10);
  if (data.length === 0) return <div style={styles.muted}>No trend data.</div>;

  const maxValue = Math.max(
    ...data.map((x) =>
      role === "Buyer"
        ? Math.max(Math.abs(x.net), x.inflow, x.outflow)
        : Math.max(Math.abs(x.netRevenue), x.grossRevenue)),
    1,
  );

  return (
    <div style={styles.list}>
      {data.map((item) => {
        const value = role === "Buyer" ? item.net : item.netRevenue;
        const width = Math.max(10, (Math.abs(value) / maxValue) * 100);
        return (
          <div key={item.period} style={styles.trendRow}>
            <span style={{ ...styles.muted, minWidth: 88 }}>{item.period}</span>
            <div style={styles.trendTrack}>
              <div
                style={{
                  ...styles.trendBar,
                  width: `${width}%`,
                  background: value >= 0 ? "var(--success)" : "var(--warning)",
                }}
              />
            </div>
            <span style={styles.muted}>{value.toLocaleString("en-US")}</span>
          </div>
        );
      })}
    </div>
  );
}

function getDefaultFilters(): WalletFilters {
  const now = new Date();
  return {
    from: formatDate(addDays(now, -30)),
    to: formatDate(now),
    direction: "",
    category: "",
    status: "",
  };
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function switchBtn(active: boolean): React.CSSProperties {
  return {
    ...styles.ghostBtn,
    borderColor: active ? "var(--primary)" : "var(--border)",
    color: active ? "var(--primary)" : "var(--text)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1220, margin: "0 auto", padding: "0 20px 28px", display: "grid", gap: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  subtitle: { margin: "3px 0 0", color: "var(--muted)", fontSize: 13 },
  roleSwitch: { display: "flex", gap: 8 },

  strip: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 8,
    border: "1px solid var(--border)",
    borderRadius: 12,
    background: "var(--surface)",
    padding: 10,
  },
  metric: { padding: "8px 10px", borderRight: "1px solid var(--border)" },
  metricLabel: { color: "var(--muted)", fontSize: 12 },
  metricValue: { fontSize: 18, fontWeight: 800, marginTop: 2 },

  filters: { border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 10, display: "grid", gap: 8 },
  filterRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  input: { border: "1px solid var(--border)", borderRadius: 8, padding: "7px 9px", background: "var(--surface-2)", color: "var(--text)" },
  ghostBtn: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", color: "var(--text)", padding: "7px 10px", cursor: "pointer" },
  primaryBtn: { border: "none", borderRadius: 8, background: "var(--primary)", color: "#fff", padding: "8px 12px", cursor: "pointer", fontWeight: 700 },

  main: { display: "grid", gap: 10 },
  block: { border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: 12 },
  blockTitle: { margin: "0 0 8px", fontSize: 16 },
  list: { display: "grid", gap: 8 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--surface-2)" },
  rowTitle: { fontWeight: 700, fontSize: 14 },
  rowValue: { fontWeight: 800, fontSize: 14 },
  muted: { color: "var(--muted)", fontSize: 12 },
  error: { color: "var(--danger)", fontWeight: 700 },
  pager: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 },

  trendRow: { display: "flex", alignItems: "center", gap: 8 },
  trendTrack: { flex: 1, height: 8, borderRadius: 999, background: "var(--surface-2)" },
  trendBar: { height: "100%", borderRadius: 999 },
};
/* export default function WalletPage() {
  return <div>Wallet UI is being refreshed.</div>;
}
*/
import { useEffect, useMemo, useState } from "react";
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
type DatePreset = "7d" | "30d" | "90d" | "ytd" | "custom";

type Filters = {
  direction: "" | "In" | "Out";
  category: "" | "Topup" | "BuyPackage" | "BuyGame" | "GameRevenue" | "Refund" | "SystemFee" | "AdminAdjustment";
  status: "" | "Pending" | "Completed" | "Refunded";
  minAmount: string;
  maxAmount: string;
  from: string;
  to: string;
  preset: DatePreset;
};

const PAGE_SIZE = 15;

const categoryMap: Record<string, number> = {
  Topup: CoinTransactionTypeEnum.Credit,
  BuyGame: 2,
  BuyPackage: 3,
  GameRevenue: 1,
  Refund: 5,
  SystemFee: 4,
  AdminAdjustment: 6,
};

export default function WalletPage() {
  const [role, setRole] = useState<WalletRole>("Buyer");
  const [filters, setFilters] = useState<Filters>(() => loadFiltersFromUrl());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [trend, setTrend] = useState<WalletDashboardTrendItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<OrbitCoinTransaction | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);

  const queryParams = useMemo(() => buildQueryParams(filters, page), [filters, page]);

  useEffect(() => {
    syncUrl(role, filters, page);
  }, [role, filters, page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, txRes, summaryRes, trendRes, gameRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory(queryParams),
          orbitCoinApi.getDashboardSummary({ role, from: queryParams.from, to: queryParams.to }),
          orbitCoinApi.getDashboardTrend({ role, from: queryParams.from, to: queryParams.to, bucket: "Day" }),
          orbitCoinApi.getDashboardGames({ from: queryParams.from, to: queryParams.to, pageNumber: 1, pageSize: 8 }),
        ]);

        if (!alive) return;
        if (!balanceRes.isSuccess || !txRes.isSuccess || !summaryRes.isSuccess || !trendRes.isSuccess || !gameRes.isSuccess) {
          throw new Error("load_failed");
        }

        setBalance(balanceRes.data?.balance ?? 0);
        setSummary(summaryRes.data ?? null);
        setTransactions(txRes.data?.items ?? []);
        setTotalPages(Math.max(1, Math.ceil((txRes.data?.totalCount ?? 0) / PAGE_SIZE)));
        setTrend(trendRes.data?.items ?? []);
        setGames(gameRes.data?.items ?? []);
      } catch {
        if (alive) setError("Không thể tải dữ liệu ví. Vui lòng thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [role, queryParams]);

  const applyPreset = (preset: DatePreset) => {
    const now = new Date();
    const to = toDateInput(now);
    let from = toDateInput(addDays(now, -30));
    if (preset === "7d") from = toDateInput(addDays(now, -7));
    if (preset === "90d") from = toDateInput(addDays(now, -90));
    if (preset === "ytd") from = `${now.getFullYear()}-01-01`;
    setFilters((prev) => ({ ...prev, preset, from, to }));
    setPage(1);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, preset: key === "from" || key === "to" ? "custom" : prev.preset }));
    setPage(1);
  };

  const clearFilters = () => {
    const now = new Date();
    setFilters({
      direction: "",
      category: "",
      status: "",
      minAmount: "",
      maxAmount: "",
      from: toDateInput(addDays(now, -30)),
      to: toDateInput(now),
      preset: "30d",
    });
    setPage(1);
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setIsToppingUp(true);
    try {
      const res = await orbitCoinApi.deposit({ amountOrbitCoin: amount });
      if (res.isSuccess && res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } finally {
      setIsToppingUp(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Ví</h1>
          <p style={styles.subtitle}>
            {role === "Buyer"
              ? "Theo dõi nạp tiền, chi tiêu và dòng tiền ròng."
              : "Theo dõi doanh thu game, phí nền tảng và lợi nhuận thực nhận."}
          </p>
        </div>
        <div style={styles.tabGroup}>
          <button style={tabBtn(role === "Buyer")} onClick={() => setRole("Buyer")}>Buyer</button>
          <button style={tabBtn(role === "Creator")} onClick={() => setRole("Creator")}>Creator</button>
        </div>
      </header>

      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <strong>Tổng quan</strong>
          <span style={styles.hint}>{filters.from} → {filters.to}</span>
        </div>
        <div style={styles.kpiGrid}>
          <Kpi label="Số dư hiện tại" value={balance} unit="OC" />
          <Kpi label="Tiền vào" value={summary?.totalIn ?? 0} unit="OC" />
          <Kpi label="Tiền ra" value={summary?.totalOut ?? 0} unit="OC" />
          <Kpi label="Dòng tiền ròng" value={summary?.netFlow ?? 0} unit="OC" />
        </div>
        {role === "Creator" && (
          <div style={styles.creatorGrid}>
            <Kpi label="Doanh thu gộp" value={summary?.grossRevenue ?? 0} unit="OC" />
            <Kpi label="Phí hệ thống" value={summary?.platformFee ?? 0} unit="OC" />
            <Kpi label="Doanh thu ròng" value={summary?.netRevenue ?? 0} unit="OC" />
            <Kpi label="Người mua" value={summary?.uniqueBuyers ?? 0} />
            <Kpi label="Lượt bán" value={summary?.unitsSold ?? 0} />
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <strong>Bộ lọc</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.secondaryBtn} onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Ẩn nâng cao" : "Nâng cao"}
            </button>
            <button style={styles.secondaryBtn} onClick={clearFilters}>Reset</button>
          </div>
        </div>
        <div style={styles.presetRow}>
          {(["7d", "30d", "90d", "ytd"] as DatePreset[]).map((preset) => (
            <button key={preset} style={presetBtn(filters.preset === preset)} onClick={() => applyPreset(preset)}>{preset.toUpperCase()}</button>
          ))}
        </div>
        <div style={styles.filterRow}>
          <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} style={styles.input} />
          <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} style={styles.input} />
          <select value={filters.direction} onChange={(e) => updateFilter("direction", e.target.value as Filters["direction"])} style={styles.input}>
            <option value="">Tất cả chiều tiền</option>
            <option value="In">Tiền vào</option>
            <option value="Out">Tiền ra</option>
          </select>
          <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value as Filters["category"])} style={styles.input}>
            <option value="">Tất cả loại</option>
            <option value="Topup">Nạp tiền</option>
            <option value="BuyPackage">Mua gói</option>
            <option value="BuyGame">Mua game</option>
            <option value="GameRevenue">Doanh thu game</option>
            <option value="Refund">Hoàn tiền</option>
            <option value="SystemFee">Phí hệ thống</option>
            <option value="AdminAdjustment">Điều chỉnh admin</option>
          </select>
        </div>
        {showAdvanced && (
          <div style={styles.filterRow}>
            <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value as Filters["status"])} style={styles.input}>
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
            <input type="number" value={filters.minAmount} onChange={(e) => updateFilter("minAmount", e.target.value)} style={styles.input} placeholder="Số tiền tối thiểu" />
            <input type="number" value={filters.maxAmount} onChange={(e) => updateFilter("maxAmount", e.target.value)} style={styles.input} placeholder="Số tiền tối đa" />
          </div>
        )}
      </section>

      <div style={styles.mainGrid}>
        <section style={styles.card}>
          {role === "Buyer" && (
            <>
              <h3 style={styles.sectionTitle}>Nạp tiền</h3>
              <div style={styles.presetRow}>
                {[10, 50, 100, 500].map((v) => (
                  <button key={v} style={styles.secondaryBtn} onClick={() => setTopUpAmount(String(v))}>{v} OC</button>
                ))}
              </div>
              <div style={styles.topUpRow}>
                <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} style={styles.input} placeholder="Nhập số OrbitCoin" />
                <button style={styles.primaryBtn} onClick={handleTopUp} disabled={isToppingUp}>{isToppingUp ? "Đang chuyển..." : "Nạp tiền"}</button>
              </div>
            </>
          )}
          {role === "Creator" && (
            <>
              <h3 style={styles.sectionTitle}>Game bạn đã bán</h3>
              {games.length === 0 ? <div style={styles.hint}>Không có dữ liệu trong khoảng này.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {games.map((g) => (
                    <div key={g.gameId} style={styles.gameRow}>
                      <div>
                        <div style={styles.gameTitle}>{g.gameTitle}</div>
                        <div style={styles.hint}>{g.buyersCount} người mua • {g.ordersCount} lượt</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={styles.amountText}>{g.gross.toLocaleString("en-US")} OC</div>
                        <div style={styles.hint}>Fee {g.fee.toLocaleString("en-US")} • Net {g.net.toLocaleString("en-US")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <TrendChart role={role} items={trend} />
        </section>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Lịch sử giao dịch</h3>
          {loading ? <div style={styles.hint}>Đang tải dữ liệu...</div> : error ? <div style={styles.error}>{error}</div> : transactions.length === 0 ? (
            <div style={styles.hint}>Không có giao dịch phù hợp.</div>
          ) : (
            <>
              <div style={styles.tableHeader}><span>Nội dung</span><span>Số tiền</span></div>
              <div style={{ display: "grid", gap: 8 }}>
                {transactions.map((tx) => (
                  <button key={tx.id} style={styles.txRow} onClick={() => setSelectedTx(tx)}>
                    <div style={{ textAlign: "left" }}>
                      <div style={styles.gameTitle}>{tx.note || tx.category || "Giao dịch"}</div>
                      <div style={styles.hint}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ ...styles.amountText, color: tx.amount >= 0 ? "var(--success)" : "var(--warning)" }}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("en-US")} OC
                    </div>
                  </button>
                ))}
              </div>
              <div style={styles.pager}>
                <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
                <span style={styles.hint}>Trang {page}/{totalPages}</span>
                <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sau</button>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedTx && (
        <div style={styles.overlay} onClick={() => setSelectedTx(null)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.sectionTitle}>Chi tiết giao dịch</h3>
            <Detail label="Thời gian" value={new Date(selectedTx.createdAt).toLocaleString()} />
            <Detail label="Nội dung" value={selectedTx.note || "-"} />
            <Detail label="Loại" value={selectedTx.category || "-"} />
            <Detail label="Chiều tiền" value={selectedTx.direction || (selectedTx.amount >= 0 ? "In" : "Out")} />
            <Detail label="Amount" value={`${selectedTx.amount.toLocaleString("en-US")} OC`} />
            <Detail label="Fee" value={`${selectedTx.feeAmount.toLocaleString("en-US")} OC`} />
            <Detail label="Status" value={selectedTx.status || "-"} />
            <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={() => setSelectedTx(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return <div style={styles.kpiCard}><div style={styles.hint}>{label}</div><div style={styles.kpiValue}>{value.toLocaleString("en-US")} {unit || ""}</div></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div style={styles.detailRow}><span style={styles.hint}>{label}</span><strong>{value}</strong></div>;
}

function TrendChart({ role, items }: { role: WalletRole; items: WalletDashboardTrendItem[] }) {
  const data = items.slice(-10);
  if (data.length === 0) return <div style={styles.hint}>Không có dữ liệu biểu đồ.</div>;
  const max = Math.max(...data.map((x) => role === "Buyer" ? Math.max(Math.abs(x.net), x.inflow, x.outflow) : Math.max(x.grossRevenue, Math.abs(x.netRevenue))), 1);
  return (
    <div style={styles.chartWrap}>
      <div style={styles.hint}>Xu hướng theo ngày</div>
      {data.map((item) => {
        const v = role === "Buyer" ? item.net : item.netRevenue;
        const width = Math.max(10, (Math.abs(v) / max) * 100);
        return (
          <div key={item.period} style={styles.chartRow}>
            <span style={{ ...styles.hint, minWidth: 88 }}>{item.period}</span>
            <div style={styles.rail}><div style={{ ...styles.bar, width: `${width}%`, background: v >= 0 ? "var(--success)" : "var(--warning)" }} /></div>
            <span style={styles.hint}>{v.toLocaleString("en-US")}</span>
          </div>
        );
      })}
    </div>
  );
}

function buildQueryParams(filters: Filters, page: number): TransactionHistoryParams {
  return {
    pageNumber: page,
    pageSize: PAGE_SIZE,
    direction: filters.direction || undefined,
    categories: filters.category ? [categoryMap[filters.category]] : undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    minAmount: parseNumber(filters.minAmount),
    maxAmount: parseNumber(filters.maxAmount),
  };
}

function loadFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  const now = new Date();
  return {
    direction: (params.get("direction") as Filters["direction"]) || "",
    category: (params.get("category") as Filters["category"]) || "",
    status: (params.get("status") as Filters["status"]) || "",
    minAmount: params.get("minAmount") || "",
    maxAmount: params.get("maxAmount") || "",
    from: params.get("from") || toDateInput(addDays(now, -30)),
    to: params.get("to") || toDateInput(now),
    preset: (params.get("preset") as DatePreset) || "30d",
  };
}

function syncUrl(role: WalletRole, filters: Filters, page: number) {
  const params = new URLSearchParams();
  params.set("role", role);
  params.set("page", String(page));
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("preset", filters.preset);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function parseNumber(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function tabBtn(active: boolean): React.CSSProperties {
  return { ...styles.secondaryBtn, color: active ? "var(--primary)" : "var(--text)", borderColor: active ? "var(--primary)" : "var(--border)" };
}

function presetBtn(active: boolean): React.CSSProperties {
  return { ...styles.secondaryBtn, color: active ? "var(--primary)" : "var(--text)", borderColor: active ? "var(--primary)" : "var(--border)" };
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1240, margin: "0 auto", padding: "0 20px 32px", display: "grid", gap: 14 },
  header: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  title: { margin: 0, fontSize: 34, fontWeight: 800 },
  subtitle: { margin: "4px 0 0", color: "var(--muted)" },
  tabGroup: { display: "flex", gap: 8 },
  card: { border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: 14 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { margin: "0 0 10px", fontSize: 18 },
  hint: { color: "var(--muted)", fontSize: 13 },
  error: { color: "var(--danger)", fontWeight: 700 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 },
  creatorGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 },
  kpiCard: { border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface-2)" },
  kpiValue: { fontSize: 24, fontWeight: 800, marginTop: 4 },
  presetRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  filterRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginTop: 8 },
  input: { border: "1px solid var(--border)", borderRadius: 10, padding: "9px 10px", background: "var(--surface-2)", color: "var(--text)" },
  mainGrid: { display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 14 },
  topUpRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 10 },
  primaryBtn: { border: "none", borderRadius: 10, padding: "9px 12px", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700 },
  secondaryBtn: { border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", background: "var(--surface)", color: "var(--text)", cursor: "pointer" },
  gameRow: { border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" },
  gameTitle: { fontSize: 14, fontWeight: 700 },
  amountText: { fontSize: 15, fontWeight: 800 },
  chartWrap: { marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10, display: "grid", gap: 6 },
  chartRow: { display: "flex", alignItems: "center", gap: 8 },
  rail: { height: 8, flex: 1, borderRadius: 999, background: "var(--surface-2)" },
  bar: { height: "100%", borderRadius: 999 },
  tableHeader: { display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12, marginBottom: 8, textTransform: "uppercase" },
  txRow: { all: "unset", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-2)", cursor: "pointer" },
  pager: { display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", display: "grid", placeItems: "center", zIndex: 1000 },
  drawer: { width: "min(560px, 92vw)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, display: "grid", gap: 8 },
  detailRow: { display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: 7 },
};
/*
import { useEffect, useMemo, useState } from "react";
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
type DatePreset = "7d" | "30d" | "90d" | "ytd" | "custom";

type Filters = {
  direction: "" | "In" | "Out";
  category: "" | "Topup" | "BuyPackage" | "BuyGame" | "GameRevenue" | "Refund" | "SystemFee" | "AdminAdjustment";
  status: "" | "Pending" | "Completed" | "Refunded";
  minAmount: string;
  maxAmount: string;
  from: string;
  to: string;
  preset: DatePreset;
};

const PAGE_SIZE = 15;

const categoryMap: Record<string, number> = {
  Topup: CoinTransactionTypeEnum.Credit,
  BuyGame: 2,
  BuyPackage: 3,
  GameRevenue: 1,
  Refund: 5,
  SystemFee: 4,
  AdminAdjustment: 6,
};

export default function WalletPage() {
  const [role, setRole] = useState<WalletRole>("Buyer");
  const [filters, setFilters] = useState<Filters>(() => loadFiltersFromUrl());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [summary, setSummary] = useState<WalletDashboardSummary | null>(null);
  const [trend, setTrend] = useState<WalletDashboardTrendItem[]>([]);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [games, setGames] = useState<WalletDashboardGameItem[]>([]);
  const [selectedTx, setSelectedTx] = useState<OrbitCoinTransaction | null>(null);

  const [topUpAmount, setTopUpAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);

  const queryParams = useMemo(
    () => buildQueryParams(filters, page),
    [filters, page],
  );

  useEffect(() => {
    syncUrl(role, filters, page);
  }, [role, filters, page]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [balanceRes, txRes, summaryRes, trendRes, gameRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory(queryParams),
          orbitCoinApi.getDashboardSummary({ role, from: queryParams.from, to: queryParams.to }),
          orbitCoinApi.getDashboardTrend({ role, from: queryParams.from, to: queryParams.to, bucket: "Day" }),
          orbitCoinApi.getDashboardGames({ from: queryParams.from, to: queryParams.to, pageNumber: 1, pageSize: 8 }),
        ]);

        if (!alive) return;
        if (!balanceRes.isSuccess || !txRes.isSuccess || !summaryRes.isSuccess || !trendRes.isSuccess || !gameRes.isSuccess) {
          throw new Error("load_failed");
        }

        setBalance(balanceRes.data?.balance ?? 0);
        setSummary(summaryRes.data ?? null);
        setTransactions(txRes.data?.items ?? []);
        setTotalPages(Math.max(1, Math.ceil((txRes.data?.totalCount ?? 0) / PAGE_SIZE)));
        setTrend(trendRes.data?.items ?? []);
        setGames(gameRes.data?.items ?? []);
      } catch {
        if (alive) setError("Không thể tải dữ liệu ví. Vui lòng thử lại.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [role, queryParams]);

  const applyPreset = (preset: DatePreset) => {
    const now = new Date();
    const to = toDateInput(now);
    let from = toDateInput(addDays(now, -30));
    if (preset === "7d") from = toDateInput(addDays(now, -7));
    if (preset === "90d") from = toDateInput(addDays(now, -90));
    if (preset === "ytd") from = `${now.getFullYear()}-01-01`;
    setFilters((prev) => ({ ...prev, preset, from, to }));
    setPage(1);
  };

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, preset: key === "from" || key === "to" ? "custom" : prev.preset }));
    setPage(1);
  };

  const clearFilters = () => {
    const now = new Date();
    setFilters({
      direction: "",
      category: "",
      status: "",
      minAmount: "",
      maxAmount: "",
      from: toDateInput(addDays(now, -30)),
      to: toDateInput(now),
      preset: "30d",
    });
    setPage(1);
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setIsToppingUp(true);
    try {
      const res = await orbitCoinApi.deposit({ amountOrbitCoin: amount });
      if (res.isSuccess && res.data?.checkoutUrl) window.location.href = res.data.checkoutUrl;
    } finally {
      setIsToppingUp(false);
    }
  };

  const exportCsv = () => {
    const header = "createdAt,note,direction,category,amount,fee,status";
    const lines = transactions.map((tx) => {
      const note = (tx.note ?? "").replaceAll(",", " ");
      return `${tx.createdAt},${note},${tx.direction ?? ""},${tx.category ?? ""},${tx.amount},${tx.feeAmount},${tx.status ?? ""}`;
    });
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet-${role.toLowerCase()}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Ví</h1>
          <p style={styles.subtitle}>
            {role === "Buyer"
              ? "Theo dõi nạp tiền, chi tiêu và dòng tiền ròng."
              : "Theo dõi doanh thu game, phí nền tảng và lợi nhuận thực nhận."}
          </p>
        </div>
        <div style={styles.tabGroup}>
          <button style={tabBtn(role === "Buyer")} onClick={() => setRole("Buyer")}>Buyer</button>
          <button style={tabBtn(role === "Creator")} onClick={() => setRole("Creator")}>Creator</button>
        </div>
      </header>

      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <strong>Tổng quan</strong>
          <span style={styles.hint}>Khoảng thời gian hiện tại: {filters.from} đến {filters.to}</span>
        </div>
        <div style={styles.kpiGrid}>
          <Kpi label="Số dư hiện tại" value={balance} unit="OC" />
          <Kpi label="Tiền vào" value={summary?.totalIn ?? 0} unit="OC" />
          <Kpi label="Tiền ra" value={summary?.totalOut ?? 0} unit="OC" />
          <Kpi label="Dòng tiền ròng" value={summary?.netFlow ?? 0} unit="OC" />
        </div>
        {role === "Creator" && (
          <div style={styles.creatorGrid}>
            <Kpi label="Doanh thu gộp" value={summary?.grossRevenue ?? 0} unit="OC" />
            <Kpi label="Phí hệ thống" value={summary?.platformFee ?? 0} unit="OC" />
            <Kpi label="Doanh thu ròng" value={summary?.netRevenue ?? 0} unit="OC" />
            <Kpi label="Người mua" value={summary?.uniqueBuyers ?? 0} />
            <Kpi label="Lượt bán" value={summary?.unitsSold ?? 0} />
          </div>
        )}
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHead}>
          <strong>Bộ lọc</strong>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={styles.secondaryBtn} onClick={() => setShowAdvanced((v) => !v)}>
              {showAdvanced ? "Ẩn filter nâng cao" : "Filter nâng cao"}
            </button>
            <button style={styles.secondaryBtn} onClick={clearFilters}>Reset</button>
            <button style={styles.secondaryBtn} onClick={exportCsv}>Export CSV</button>
          </div>
        </div>

        <div style={styles.presetRow}>
          {(["7d", "30d", "90d", "ytd"] as DatePreset[]).map((preset) => (
            <button key={preset} style={presetBtn(filters.preset === preset)} onClick={() => applyPreset(preset)}>
              {preset.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={styles.filterRow}>
          <input type="date" value={filters.from} onChange={(e) => updateFilter("from", e.target.value)} style={styles.input} />
          <input type="date" value={filters.to} onChange={(e) => updateFilter("to", e.target.value)} style={styles.input} />
          <select value={filters.direction} onChange={(e) => updateFilter("direction", e.target.value as Filters["direction"])} style={styles.input}>
            <option value="">Tất cả chiều tiền</option>
            <option value="In">Tiền vào</option>
            <option value="Out">Tiền ra</option>
          </select>
          <select value={filters.category} onChange={(e) => updateFilter("category", e.target.value as Filters["category"])} style={styles.input}>
            <option value="">Tất cả loại giao dịch</option>
            <option value="Topup">Nạp tiền</option>
            <option value="BuyPackage">Mua gói</option>
            <option value="BuyGame">Mua game</option>
            <option value="GameRevenue">Doanh thu game</option>
            <option value="Refund">Hoàn tiền</option>
            <option value="SystemFee">Phí hệ thống</option>
            <option value="AdminAdjustment">Điều chỉnh admin</option>
          </select>
        </div>

        {showAdvanced && (
          <div style={styles.filterRow}>
            <select value={filters.status} onChange={(e) => updateFilter("status", e.target.value as Filters["status"])} style={styles.input}>
              <option value="">Tất cả trạng thái</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Refunded">Refunded</option>
            </select>
            <input type="number" placeholder="Số tiền tối thiểu" value={filters.minAmount} onChange={(e) => updateFilter("minAmount", e.target.value)} style={styles.input} />
            <input type="number" placeholder="Số tiền tối đa" value={filters.maxAmount} onChange={(e) => updateFilter("maxAmount", e.target.value)} style={styles.input} />
          </div>
        )}
      </section>

      <div style={styles.mainGrid}>
        <section style={styles.card}>
          {role === "Buyer" ? (
            <>
              <h3 style={styles.sectionTitle}>Nạp tiền</h3>
              <div style={styles.presetRow}>
                {[10, 50, 100, 500].map((v) => (
                  <button key={v} style={styles.secondaryBtn} onClick={() => setTopUpAmount(String(v))}>{v} OC</button>
                ))}
              </div>
              <div style={styles.topUpRow}>
                <input type="number" placeholder="Nhập số OrbitCoin" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} style={styles.input} />
                <button style={styles.primaryBtn} onClick={handleTopUp} disabled={isToppingUp}>{isToppingUp ? "Đang chuyển..." : "Nạp tiền"}</button>
              </div>
            </>
          ) : (
            <>
              <h3 style={styles.sectionTitle}>Phân tích game đã tạo</h3>
              {games.length === 0 ? <div style={styles.hint}>Không có dữ liệu trong khoảng thời gian này.</div> : (
                <div style={{ display: "grid", gap: 8 }}>
                  {games.map((g) => (
                    <div key={g.gameId} style={styles.gameRow}>
                      <div>
                        <div style={styles.gameTitle}>{g.gameTitle}</div>
                        <div style={styles.hint}>{g.buyersCount} người mua • {g.ordersCount} lượt</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={styles.amountText}>{g.gross.toLocaleString("en-US")} OC</div>
                        <div style={styles.hint}>Fee {g.fee.toLocaleString("en-US")} • Net {g.net.toLocaleString("en-US")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <SimpleTrendChart role={role} items={trend} />
        </section>

        <section style={styles.card}>
          <h3 style={styles.sectionTitle}>Lịch sử giao dịch</h3>
          {loading ? (
            <div style={styles.hint}>Đang tải dữ liệu...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : transactions.length === 0 ? (
            <div style={styles.hint}>Không có giao dịch phù hợp với bộ lọc.</div>
          ) : (
            <>
              <div style={styles.tableHeader}>
                <span>Nội dung</span>
                <span>Số tiền</span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {transactions.map((tx) => (
                  <button key={tx.id} style={styles.txRow} onClick={() => setSelectedTx(tx)}>
                    <div style={{ textAlign: "left" }}>
                      <div style={styles.gameTitle}>{tx.note || tx.category || "Giao dịch"}</div>
                      <div style={styles.hint}>{new Date(tx.createdAt).toLocaleString()}</div>
                    </div>
                    <div style={{ ...styles.amountText, color: tx.amount >= 0 ? "var(--success)" : "var(--warning)" }}>
                      {tx.amount >= 0 ? "+" : ""}{tx.amount.toLocaleString("en-US")} OC
                    </div>
                  </button>
                ))}
              </div>
              <div style={styles.pager}>
                <button style={styles.secondaryBtn} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Trước</button>
                <span style={styles.hint}>Trang {page}/{totalPages}</span>
                <button style={styles.secondaryBtn} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sau</button>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedTx && (
        <div style={styles.overlay} onClick={() => setSelectedTx(null)}>
          <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.sectionTitle}>Chi tiết giao dịch</h3>
            <Detail label="Thời gian" value={new Date(selectedTx.createdAt).toLocaleString()} />
            <Detail label="Nội dung" value={selectedTx.note || "-"} />
            <Detail label="Loại" value={selectedTx.category || "-"} />
            <Detail label="Chiều tiền" value={selectedTx.direction || (selectedTx.amount >= 0 ? "In" : "Out")} />
            <Detail label="Amount" value={`${selectedTx.amount.toLocaleString("en-US")} OC`} />
            <Detail label="Fee" value={`${selectedTx.feeAmount.toLocaleString("en-US")} OC`} />
            <Detail label="Status" value={selectedTx.status || "-"} />
            <button style={{ ...styles.primaryBtn, width: "100%" }} onClick={() => setSelectedTx(null)}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.hint}>{label}</div>
      <div style={styles.kpiValue}>{value.toLocaleString("en-US")} {unit || ""}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.hint}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SimpleTrendChart({ role, items }: { role: WalletRole; items: WalletDashboardTrendItem[] }) {
  const data = items.slice(-10);
  if (data.length === 0) return <div style={styles.hint}>Không có dữ liệu biểu đồ.</div>;
  const max = Math.max(
    ...data.map((x) => role === "Buyer" ? Math.max(Math.abs(x.net), x.inflow, x.outflow) : Math.max(x.grossRevenue, Math.abs(x.netRevenue))),
    1,
  );
  return (
    <div style={styles.chartWrap}>
      <div style={styles.chartTitle}>Xu hướng theo ngày</div>
      {data.map((item) => {
        const v = role === "Buyer" ? item.net : item.netRevenue;
        const width = Math.max(10, (Math.abs(v) / max) * 100);
        return (
          <div key={item.period} style={styles.chartRow}>
            <span style={{ ...styles.hint, minWidth: 88 }}>{item.period}</span>
            <div style={styles.rail}>
              <div style={{ ...styles.bar, width: `${width}%`, background: v >= 0 ? "var(--success)" : "var(--warning)" }} />
            </div>
            <span style={styles.hint}>{v.toLocaleString("en-US")}</span>
          </div>
        );
      })}
    </div>
  );
}

function buildQueryParams(filters: Filters, page: number): TransactionHistoryParams {
  return {
    pageNumber: page,
    pageSize: PAGE_SIZE,
    direction: filters.direction || undefined,
    categories: filters.category ? [categoryMap[filters.category]] : undefined,
    status: filters.status || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    minAmount: parseNumber(filters.minAmount),
    maxAmount: parseNumber(filters.maxAmount),
  };
}

function loadFiltersFromUrl(): Filters {
  const params = new URLSearchParams(window.location.search);
  const now = new Date();
  return {
    direction: (params.get("direction") as Filters["direction"]) || "",
    category: (params.get("category") as Filters["category"]) || "",
    status: (params.get("status") as Filters["status"]) || "",
    minAmount: params.get("minAmount") || "",
    maxAmount: params.get("maxAmount") || "",
    from: params.get("from") || toDateInput(addDays(now, -30)),
    to: params.get("to") || toDateInput(now),
    preset: (params.get("preset") as DatePreset) || "30d",
  };
}

function syncUrl(role: WalletRole, filters: Filters, page: number) {
  const params = new URLSearchParams();
  params.set("role", role);
  params.set("page", String(page));
  if (filters.direction) params.set("direction", filters.direction);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  if (filters.minAmount) params.set("minAmount", filters.minAmount);
  if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("preset", filters.preset);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
}

function parseNumber(v: string): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInput(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function tabBtn(active: boolean): React.CSSProperties {
  return {
    ...styles.secondaryBtn,
    color: active ? "var(--primary)" : "var(--text)",
    borderColor: active ? "var(--primary)" : "var(--border)",
    background: active ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "var(--surface)",
  };
}

function presetBtn(active: boolean): React.CSSProperties {
  return {
    ...styles.secondaryBtn,
    color: active ? "var(--primary)" : "var(--text)",
    borderColor: active ? "var(--primary)" : "var(--border)",
  };
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1240, margin: "0 auto", padding: "0 20px 32px", display: "grid", gap: 14 },
  header: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  title: { margin: 0, fontSize: 34, fontWeight: 800 },
  subtitle: { margin: "4px 0 0", color: "var(--muted)" },
  tabGroup: { display: "flex", gap: 8 },

  card: { border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", padding: 14 },
  sectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { margin: "0 0 10px", fontSize: 18 },
  hint: { color: "var(--muted)", fontSize: 13 },
  error: { color: "var(--danger)", fontWeight: 700 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10 },
  creatorGrid: { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 },
  kpiCard: { border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "var(--surface-2)" },
  kpiValue: { fontSize: 24, fontWeight: 800, marginTop: 4 },

  presetRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  filterRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginTop: 8 },
  input: { border: "1px solid var(--border)", borderRadius: 10, padding: "9px 10px", background: "var(--surface-2)", color: "var(--text)" },

  mainGrid: { display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 14 },
  topUpRow: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 10 },
  primaryBtn: { border: "none", borderRadius: 10, padding: "9px 12px", background: "var(--primary)", color: "#fff", cursor: "pointer", fontWeight: 700 },
  secondaryBtn: { border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", background: "var(--surface)", color: "var(--text)", cursor: "pointer" },

  gameRow: { border: "1px solid var(--border)", borderRadius: 10, padding: 10, display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" },
  gameTitle: { fontSize: 14, fontWeight: 700 },
  amountText: { fontSize: 15, fontWeight: 800 },

  chartWrap: { marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 10, display: "grid", gap: 6 },
  chartTitle: { fontSize: 13, fontWeight: 700, color: "var(--muted)" },
  chartRow: { display: "flex", alignItems: "center", gap: 8 },
  rail: { height: 8, flex: 1, borderRadius: 999, background: "var(--surface-2)" },
  bar: { height: "100%", borderRadius: 999 },

  tableHeader: { display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12, marginBottom: 8, textTransform: "uppercase" },
  txRow: { all: "unset", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--surface-2)", cursor: "pointer" },
  pager: { display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" },

  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", display: "grid", placeItems: "center", zIndex: 1000 },
  drawer: { width: "min(560px, 92vw)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, display: "grid", gap: 8 },
  detailRow: { display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--border)", paddingBottom: 7 },
};
*/
