import { useEffect, useState, useRef } from "react";
import {
  orbitCoinApi,
  type OrbitCoinTransaction,
  CoinTransactionTypeEnum,
} from "@/services/api/learner/orbitcoin.api";
import { useTranslation } from "@/lib/i18n/translations";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";

export default function WalletPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<OrbitCoinTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [isToppingUp, setIsToppingUp] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const pageSize = 20;

  const topUpRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [balanceRes, transactionsRes] = await Promise.all([
          orbitCoinApi.getBalance(),
          orbitCoinApi.getTransactionHistory({ pageNumber: 1, pageSize }),
        ]);

        if (!alive) return;

        if (!balanceRes.isSuccess) {
          setError(balanceRes.message ?? "Failed to load balance");
          return;
        }

        if (!transactionsRes.isSuccess) {
          setError(transactionsRes.message ?? t("failedLoadTransactions"));
          return;
        }

        setBalance(balanceRes.data?.balance ?? 0);
        setTransactions(transactionsRes.data?.items ?? []);
        const calculatedTotalPages = Math.ceil((transactionsRes.data?.totalCount ?? 0) / pageSize);
        setTotalPages(calculatedTotalPages);
      } catch {
        if (!alive) return;
        setError("Failed to load wallet data");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t]);

  const loadPage = async (page: number) => {
    if (page < 1 || page > totalPages || loadingTransactions) return;

    setLoadingTransactions(true);
    setError(null);

    try {
      const res = await orbitCoinApi.getTransactionHistory({ pageNumber: page, pageSize });

      if (!res.isSuccess) {
        setError(res.message ?? t("failedLoadTransactions"));
        return;
      }

      setTransactions(res.data?.items ?? []);
      setPageNumber(page);
      const calculatedTotalPages = Math.ceil((res.data?.totalCount ?? 0) / pageSize);
      setTotalPages(calculatedTotalPages);
    } catch {
      setError("Failed to load transactions");
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleTopUp = async () => {
    const amount = Number(topUpAmount.replace(/,/g, ""));
    if (isNaN(amount) || amount <= 0) {
      setTopUpError(t("amountMustBePositive"));
      return;
    }

    setIsToppingUp(true);
    setTopUpError(null);
    try {
      const res = await orbitCoinApi.deposit({ amountOrbitCoin: amount });
      if (res.isSuccess && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        setTopUpError(res.message || t("failedTopUp"));
        setIsToppingUp(false);
      }
    } catch {
      setTopUpError(t("failedTopUp"));
      setIsToppingUp(false);
    }
  };

  const handlePresetClick = (amount: number) => {
    setTopUpAmount(amount.toString());
    setTopUpError(null);
  };

  const formatNumberWithCommas = (value: string | number) => {
    if (!value) return "";
    const num = Number(value.toString().replace(/,/g, ""));
    if (isNaN(num)) return value.toString();
    return num.toLocaleString("en-US");
  };

  const handleTopUpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/,/g, "");
    if (/^\d*$/.test(val)) {
      setTopUpAmount(val);
      setTopUpError(null);
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleReportOrbitCoinIssue = (tx: OrbitCoinTransaction) => {
    const params = new URLSearchParams({
      prefill: `orbit-tx-${tx.id}`,
      openCreate: "1",
      categoryKey: "RewardBalanceIssue",
      orbitCoinTransactionId: tx.id,
      subject: t("complaints.prefill.orbitCoinIssueSubject"),
      description: t("complaints.prefill.orbitCoinIssueDescription"),
    });
    navigate(`${ROUTES.LEARNER_COMPLAINTS}?${params.toString()}`);
  };

  const numericTopUp = Number(topUpAmount.replace(/,/g, ""));

  if (loading) {
    return (
      <div style={{ ...styles.container, maxWidth: 980 }}>
        <div style={card()}>
          <div style={styles.skeletonLine(120)} />
          <div style={{ ...styles.skeletonLine(240), height: 46, marginTop: 12 }} />
        </div>
        <div style={styles.topGrid}>
          <div style={{ ...styles.skeletonBlock, height: 56 }} />
          <div style={{ ...styles.skeletonBlock, height: 56 }} />
        </div>
        <div style={card()}>
          <div style={{ ...styles.skeletonLine(100), height: 28, marginBottom: 20 }} />
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.skeletonBlock, height: 72 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageBackdrop} aria-hidden="true" />
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>{t("wallet")}</h1>
        <p style={styles.pageSubtitle}>
          {t("currentBalance")} • {t("transactionHistory")}
        </p>
      </div>

      <div style={styles.heroGrid}>
        <div style={{ ...card(), ...styles.announceCard }}>
          <div style={styles.announceGlow} />
          <div style={styles.announceBadge}>{t("walletAnnouncementBadge")}</div>
          <div style={styles.announceTitle}>{t("walletAnnouncementTitle")}</div>
          <div style={styles.announceDesc}>{t("walletAnnouncementDesc")}</div>
        </div>

        <div style={{ ...card(), ...styles.accountCard }}>
          <div style={styles.balanceLabel}>{t("currentBalance")}</div>
          <div style={styles.balanceRow}>
            <div style={styles.balanceValue}>{balance?.toLocaleString("en-US") ?? 0}</div>
            <div style={styles.balanceUnit}>{t("orbitCoins")}</div>
          </div>
          <button style={primaryBtn(false, false)} onClick={() => scrollToSection(topUpRef)}>
            {t("topUp")}
          </button>
        </div>
      </div>

      <div style={styles.bottomGrid}>
        <div ref={topUpRef} style={card()}>
          <div style={styles.sectionTitle}>{t("topUp")}</div>
          <div style={styles.sectionHint}>{t("topUpInstruction")}</div>
          <div style={styles.conversionRateHint}>{t("walletConversionRate")}</div>

          <CashflowMiniChart
            transactions={transactions}
            note={`Based on ${transactions.length} transactions currently loaded`}
          />

          <div style={styles.presetGrid}>
            {[10, 50, 100, 500].map((preset) => {
              const isActive = numericTopUp === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  style={presetBtn(isActive)}
                >
                  {preset.toLocaleString("en-US")}
                </button>
              );
            })}
          </div>

          <div style={styles.inputWrap}>
            <input
              type="text"
              inputMode="numeric"
              value={formatNumberWithCommas(topUpAmount)}
              onChange={handleTopUpInputChange}
              placeholder={t("enterAmount")}
              style={inputStyle()}
              disabled={isToppingUp}
            />
            <span style={styles.inputSuffix}>{t("orbitCoins")}</span>
          </div>

          <button
            onClick={handleTopUp}
            disabled={isToppingUp || !topUpAmount || numericTopUp <= 0}
            style={primaryBtn(isToppingUp || !topUpAmount || numericTopUp <= 0, true)}
          >
            {isToppingUp ? t("redirectingToPayment") : t("topUp")}
          </button>
          {topUpError && <div style={styles.errorText}>{topUpError}</div>}
        </div>

        <div ref={historyRef} style={card()}>
          <div style={styles.historyHeader}>
            <div style={styles.sectionTitle}>{t("transactionHistory")}</div>
            {error && <span style={pill("rgba(239,68,68,0.14)", "var(--danger)")}>{error}</span>}
          </div>

          {loadingTransactions && transactions.length === 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ ...styles.skeletonBlock, height: 72 }} />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 28, opacity: 0.55 }}>🧾</div>
              <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 500 }}>
                {t("noTransactionsYet")}
              </div>
            </div>
          ) : (
            <>
              <div style={styles.txHead}>
                <span>Details</span>
                <span>Amount</span>
              </div>
              <div style={{ display: "grid", gap: 12 }}>
                {transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onReportIssue={() => handleReportOrbitCoinIssue(tx)}
                    reportLabel={t("complaints.actions.reportIssue")}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div style={styles.paginationBar}>
                  <button
                    type="button"
                    onClick={() => loadPage(pageNumber - 1)}
                    disabled={pageNumber === 1 || loadingTransactions}
                    style={secondaryBtn(pageNumber === 1 || loadingTransactions)}
                  >
                    {t("previous")}
                  </button>
                  <span style={styles.pageText}>
                    {t("page")} {pageNumber} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadPage(pageNumber + 1)}
                    disabled={pageNumber === totalPages || loadingTransactions}
                    style={secondaryBtn(pageNumber === totalPages || loadingTransactions)}
                  >
                    {t("next")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionRow({
  transaction,
  onReportIssue,
  reportLabel,
}: {
  transaction: OrbitCoinTransaction;
  onReportIssue: () => void;
  reportLabel: string;
}) {
  const isCredit = transaction.transactionType === CoinTransactionTypeEnum.Credit;
  const sign = isCredit ? "+" : "-";
  const color = isCredit ? "var(--success)" : "var(--warning)";
  const tagBg = isCredit ? "rgba(34,197,94,0.14)" : "rgba(245,158,11,0.14)";
  const amountVnd = transaction.amountVND ?? transaction.amountVnd;

  return (
    <div style={styles.txRow}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        <div style={styles.txTitle}>{transaction.note || "Transaction"}</div>
        <div style={styles.txDate}>
          {new Date(transaction.createdAt).toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <span style={pill(tagBg, color)}>{isCredit ? "Credit" : "Debit"}</span>
        <div style={{ fontWeight: 700, fontSize: 15, color }}>
          {sign}
          {Math.abs(transaction.amount).toLocaleString("en-US")}
          {" OrbitCoin"}
        </div>
        {amountVnd !== undefined && amountVnd !== null && (
          <div style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 600 }}>
            {formatVnd(amountVnd)}
          </div>
        )}
        {transaction.balanceAfter !== undefined && transaction.balanceAfter !== null && (
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            {tBalanceLabel()}: {transaction.balanceAfter.toLocaleString("en-US")}
          </div>
        )}
        <button type="button" onClick={onReportIssue} style={styles.txReportBtn}>
          {reportLabel}
        </button>
      </div>
    </div>
  );
}

function tBalanceLabel() {
  return "Balance";
}

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function card(): React.CSSProperties {
  return styles.panelCard;
}

function CashflowMiniChart({
  transactions,
  note,
}: {
  transactions: OrbitCoinTransaction[];
  note: string;
}) {
  // Use last N transactions to build a cumulative flow line.
  const sorted = [...transactions]
    .filter((tx) => !Number.isNaN(new Date(tx.createdAt).getTime()))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-20);

  const flowValues = sorted.map((tx) =>
    tx.transactionType === CoinTransactionTypeEnum.Credit
      ? Math.abs(tx.amount)
      : -Math.abs(tx.amount),
  );

  const cumulative: number[] = [];
  let running = 0;
  for (const v of flowValues) {
    running += v;
    cumulative.push(running);
  }

  const width = 560;
  const height = 120;
  const padX = 12;
  const padY = 14;

  // Keep the y-axis anchored from 0 to make labels predictable.
  const minVal = 0;
  const maxVal = cumulative.length ? Math.max(0, ...cumulative) : 0;
  const range = Math.max(1, maxVal - minVal);

  const xAt = (i: number) =>
    cumulative.length <= 1 ? width / 2 : padX + (i * (width - padX * 2)) / (cumulative.length - 1);
  const yAt = (v: number) => padY + ((maxVal - v) * (height - padY * 2)) / range;

  const points = cumulative.map((v, i) => ({ x: xAt(i), y: yAt(v), v }));
  const linePath =
    points.length > 0
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")
      : "";
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padY).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padY).toFixed(2)} Z`
      : "";
  const lineUpColor = "rgba(34,197,94,0.95)";
  const lineDownColor = "rgba(245,158,11,0.95)";
  const areaColor = "rgba(148,163,184,0.14)";

  const segments = points.slice(1).map((p, idx) => {
    const prev = points[idx];
    const delta = p.v - prev.v;
    return {
      x1: prev.x,
      y1: prev.y,
      x2: p.x,
      y2: p.y,
      color: delta >= 0 ? lineUpColor : lineDownColor,
    };
  });

  const gridTicks = 4;
  const gridValues = Array.from(
    { length: gridTicks + 1 },
    (_, i) => maxVal - (range * i) / gridTicks,
  );
  const formatTick = (n: number) =>
    Math.round(n).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    });

  return (
    <div style={styles.chartWrap}>
      <div style={styles.chartHeaderRow}>
        <div style={styles.chartTitle}>Cashflow</div>
        <div style={styles.chartLegend}>
          <span style={{ ...styles.legendDot, background: "var(--success)" }} />
          <span>In</span>
          <span style={{ width: 10 }} />
          <span style={{ ...styles.legendDot, background: "var(--warning)" }} />
          <span>Out</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Cashflow chart"
        style={{ display: "block" }}
      >
        {gridValues.map((tick, idx) => {
          const y = yAt(tick);
          return (
            <g key={idx}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeWidth="1"
                opacity={idx === 0 || idx === gridValues.length - 1 ? 0.65 : 0.38}
                strokeDasharray={idx === 0 || idx === gridValues.length - 1 ? "0" : "3 4"}
              />
              <text x={padX + 2} y={y - 4} fill="var(--muted)" fontSize="10" fontWeight="700">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {points.length > 0 ? (
          <>
            <path d={areaPath} fill={areaColor} />
            {segments.map((s, idx) => (
              <line
                key={`seg-${idx}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke={s.color}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
            {points.map((p, idx) =>
              // Color each point based on its local movement direction.
              (() => {
                const pointColor =
                  idx === 0
                    ? flowValues[0] >= 0
                      ? lineUpColor
                      : lineDownColor
                    : points[idx].v - points[idx - 1].v >= 0
                      ? lineUpColor
                      : lineDownColor;

                return (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={idx === points.length - 1 ? 3.8 : 2.4}
                    fill={idx === points.length - 1 ? pointColor : "rgba(255,255,255,0.92)"}
                    stroke={pointColor}
                    strokeWidth="1.2"
                  />
                );
              })(),
            )}
          </>
        ) : null}
      </svg>
      <div style={styles.chartNote}>{note}</div>
    </div>
  );
}

function presetBtn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 0",
    borderRadius: 10,
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "color-mix(in srgb, var(--primary) 14%, transparent)" : "var(--surface)",
    color: active ? "var(--primary)" : "var(--text)",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    textAlign: "center",
    width: "100%",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "14px 110px 14px 14px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 15,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
  };
}

function primaryBtn(disabled: boolean, fullWidth: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "12px 20px",
    borderRadius: 12,
    border: "none",
    background: disabled
      ? "color-mix(in srgb, var(--surface-2) 85%, transparent)"
      : "var(--primary)",
    color: disabled ? "var(--muted)" : "#fff",
    fontWeight: 700,
    fontSize: 14,
    opacity: disabled ? 0.78 : 1,
    width: fullWidth ? "100%" : "auto",
  };
}

function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "9px 14px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: disabled ? "var(--muted)" : "var(--text)",
    fontWeight: 600,
    fontSize: 13,
    opacity: disabled ? 0.56 : 1,
  };
}

function pill(bg: string, fg: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 600,
    fontSize: 12,
  };
}

const styles: Record<string, any> = {
  container: {
    position: "relative",
    display: "grid",
    gap: 20,
    maxWidth: 1240,
    margin: "0 auto",
    paddingBottom: 36,
    paddingInline: 20,
  },
  pageBackdrop: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(900px 520px at 12% 12%, rgba(37,99,235,0.16), transparent 62%), radial-gradient(780px 520px at 86% 18%, rgba(249,115,22,0.12), transparent 64%), radial-gradient(680px 520px at 70% 86%, rgba(56,189,248,0.10), transparent 66%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 96%, #ffffff) 0%, var(--bg) 100%)",
    pointerEvents: "none",
    zIndex: 0,
    filter: "blur(0.2px)",
  },
  pageHeader: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gap: 6,
    marginTop: 2,
  },
  pageTitle: {
    margin: 0,
    fontSize: 28,
    color: "var(--text)",
    fontWeight: 800,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    margin: 0,
    color: "var(--text-2)",
    fontSize: 14,
  },
  topGrid: {
    display: "grid",
    gridTemplateColumns: "1.2fr 1fr",
    gap: 16,
  },
  heroGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  announceCard: {
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--primary) 24%, transparent) 0%, color-mix(in srgb, var(--surface) 86%, transparent) 100%)",
    position: "relative",
    overflow: "hidden",
  },
  announceGlow: {
    position: "absolute",
    inset: -80,
    background:
      "radial-gradient(420px 240px at 20% 20%, rgba(37,99,235,0.22), transparent 70%), radial-gradient(360px 220px at 80% 60%, rgba(249,115,22,0.16), transparent 70%)",
    pointerEvents: "none",
    filter: "blur(2px)",
  },
  announceBadge: {
    display: "inline-flex",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
    background: "color-mix(in srgb, var(--primary) 24%, transparent)",
    color: "var(--primary)",
    marginBottom: 10,
  },
  announceTitle: {
    fontWeight: 800,
    fontSize: 20,
    color: "var(--text)",
    marginBottom: 8,
  },
  announceDesc: {
    color: "var(--text-2)",
    fontSize: 14,
    lineHeight: 1.55,
  },
  accountCard: {
    display: "grid",
    gap: 14,
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--info) 10%, transparent) 0%, var(--surface) 55%)",
  },
  panelCard: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 10px 26px rgba(2,6,23,0.08)",
  },
  balanceCard: {
    background:
      "linear-gradient(135deg, color-mix(in srgb, var(--primary) 16%, var(--surface)) 0%, var(--surface) 75%)",
  },
  balanceLabel: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  balanceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: 800,
    letterSpacing: -0.9,
    color: "var(--text)",
    lineHeight: 1,
  },
  balanceUnit: {
    fontSize: 14,
    color: "var(--text-2)",
    fontWeight: 600,
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: 17,
    marginBottom: 6,
    color: "var(--text)",
  },
  sectionHint: {
    color: "var(--muted)",
    fontSize: 13,
    marginBottom: 6,
  },
  conversionRateHint: {
    color: "var(--text-2)",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  bottomGrid: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    gridTemplateColumns: "0.9fr 1.1fr",
    gap: 16,
  },
  chartWrap: {
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 14,
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--primary) 10%, transparent) 0%, color-mix(in srgb, var(--surface-2) 26%, transparent) 100%)",
    marginBottom: 14,
  },
  chartHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chartTitle: {
    fontWeight: 800,
    color: "var(--text)",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  chartLegend: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    display: "inline-block",
  },
  chartNote: {
    marginTop: 8,
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 600,
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  inputWrap: {
    position: "relative",
    marginBottom: 14,
  },
  inputSuffix: {
    position: "absolute",
    right: 14,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--muted)",
    fontWeight: 600,
    fontSize: 13,
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  emptyState: {
    padding: "42px 0",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    background: "color-mix(in srgb, var(--surface-2) 40%, transparent)",
    borderRadius: 14,
    border: "1px dashed var(--border)",
  },
  txRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 15px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--surface-2) 22%, transparent)",
  },
  txTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: "var(--text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  txDate: {
    color: "var(--muted)",
    fontSize: 12,
  },
  txReportBtn: {
    marginTop: 4,
    border: "1px solid var(--border)",
    background: "var(--surface-2)",
    color: "var(--text-2)",
    borderRadius: 8,
    fontSize: 11,
    padding: "4px 8px",
    cursor: "pointer",
    fontWeight: 700,
  },
  txHead: {
    display: "flex",
    justifyContent: "space-between",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    padding: "0 4px",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  paginationBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid var(--border)",
  },
  pageText: {
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
  },
  errorText: {
    color: "var(--danger)",
    fontSize: 13,
    marginTop: 12,
    fontWeight: 600,
  },
  skeletonLine: (w: number) => ({
    height: 14,
    width: w,
    background: "color-mix(in srgb, var(--surface-2) 78%, transparent)",
    borderRadius: 6,
  }),
  skeletonBlock: {
    background: "color-mix(in srgb, var(--surface-2) 78%, transparent)",
    borderRadius: 12,
  },
};
