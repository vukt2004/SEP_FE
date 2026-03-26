import { useEffect, useState, useRef } from "react";
import {
  orbitCoinApi,
  type OrbitCoinTransaction,
  CoinTransactionTypeEnum,
} from "@/services/api/learner/orbitcoin.api";
import { useTranslation } from "@/lib/i18n/translations";

export default function WalletPage() {
  const { t } = useTranslation();
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

  const numericTopUp = Number(topUpAmount.replace(/,/g, ""));

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24, maxWidth: 640, margin: "0 auto" }}>
        <div style={card()}>
          <div style={{ height: 16, width: 120, background: "var(--surface-hover, var(--border))", borderRadius: 4 }} />
          <div style={{ height: 48, width: 240, background: "var(--surface-hover, var(--border))", borderRadius: 8, marginTop: 12 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ height: 56, background: "var(--surface)", borderRadius: 12 }} />
          <div style={{ height: 56, background: "var(--surface)", borderRadius: 12 }} />
        </div>
        <div style={card()}>
          <div style={{ height: 28, width: 100, background: "var(--surface-hover, var(--border))", borderRadius: 6, marginBottom: 20 }} />
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 72, background: "var(--surface-hover, var(--border))", borderRadius: 12 }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 24, maxWidth: 640, margin: "0 auto", paddingBottom: 40 }}>
      {/* 1. BalanceCard */}
      <div style={{ ...card(), background: "var(--background)", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {t("currentBalance")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: -1, color: "var(--foreground)" }}>
            {balance?.toLocaleString("en-US") ?? 0}
          </div>
          <div style={{ fontSize: 16, color: "var(--muted)", fontWeight: 500 }}>
            OrbitCoins
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <button style={primaryBtn(false, false)} onClick={() => scrollToSection(topUpRef)}>
            {t("topUp")}
          </button>
        </div>
      </div>

      {/* 2. QuickActions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <button style={quickActionBtn()} onClick={() => scrollToSection(topUpRef)}>
          <span style={{ fontSize: 18 }}>➕</span>
          <span>{t("topUp")}</span>
        </button>
        <button style={quickActionBtn()} onClick={() => scrollToSection(historyRef)}>
          <span style={{ fontSize: 18 }}>📄</span>
          <span>{t("transactionHistory")}</span>
        </button>
      </div>

      {/* 3. TopUpSection */}
      <div ref={topUpRef} style={{ ...card(), background: "var(--surface)" }}>
        <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 20, color: "var(--foreground)" }}>
          {t("topUp")}
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <input
              type="text" // using text to handle commas
              inputMode="numeric"
              value={formatNumberWithCommas(topUpAmount)}
              onChange={handleTopUpInputChange}
              placeholder={t("enterAmount")}
              style={inputStyle()}
              disabled={isToppingUp}
            />
            <span style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontWeight: 500, fontSize: 14 }}>
              OrbitCoins
            </span>
          </div>

          <button
            onClick={handleTopUp}
            disabled={isToppingUp || !topUpAmount || numericTopUp <= 0}
            style={primaryBtn(isToppingUp || !topUpAmount || numericTopUp <= 0, true)}
          >
            {isToppingUp ? t("redirectingToPayment") : t("topUp")}
          </button>
        </div>

        {topUpError && (
          <div style={{ color: "var(--danger)", fontSize: 14, marginTop: 16, fontWeight: 500 }}>
            {topUpError}
          </div>
        )}
      </div>

      {/* 4. TransactionHistory */}
      <div ref={historyRef} style={{ ...card(), background: "var(--background)", border: "none", padding: "0", boxShadow: "none" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 16, color: "var(--foreground)" }}>{t("transactionHistory")}</div>
          {error && <span style={pill("var(--danger-weak)", "var(--danger)")}>{error}</span>}
        </div>

        {loadingTransactions && transactions.length === 0 ? (
          <div style={{ display: "grid", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ height: 72, background: "var(--surface)", borderRadius: 12 }} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              background: "var(--surface)",
              borderRadius: 16,
              border: "1px dashed var(--border)"
            }}
          >
             <div style={{ fontSize: 32, opacity: 0.5 }}>📄</div>
             <div style={{ color: "var(--muted)", fontSize: 14, fontWeight: 500 }}>
               {t("noTransactionsYet")}
             </div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 12 }}>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => loadPage(pageNumber - 1)}
                  disabled={pageNumber === 1 || loadingTransactions}
                  style={secondaryBtn(pageNumber === 1 || loadingTransactions)}
                >
                  {t("previous")}
                </button>
                <span style={{ color: "var(--muted)", fontSize: 14, fontWeight: 500 }}>
                  {pageNumber} / {totalPages}
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
  );
}

// TransactionRow component (Minimal styling)
function TransactionRow({ transaction }: { transaction: OrbitCoinTransaction }) {
  const isCredit = transaction.transactionType === CoinTransactionTypeEnum.Credit;
  const sign = isCredit ? "+" : "-";
  const color = isCredit ? "var(--ok)" : "var(--foreground)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: 14,
            color: "var(--foreground)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {transaction.note || "Transaction"}
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          {new Date(transaction.createdAt).toLocaleString(undefined, { 
            year: "numeric", 
            month: "short", 
            day: "numeric", 
            hour: "2-digit", 
            minute: "2-digit" 
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color }}>
          {sign}{Math.abs(transaction.amount).toLocaleString("en-US")}
        </div>
        {transaction.balanceAfter !== undefined && transaction.balanceAfter !== null && (
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
            Balance: {transaction.balanceAfter.toLocaleString("en-US")}
          </div>
        )}
      </div>
    </div>
  );
}

/** Styles */
function card(): React.CSSProperties {
  return {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 24,
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  };
}

function quickActionBtn(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "16px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--foreground)",
    fontWeight: 500,
    fontSize: 15,
    cursor: "pointer",
    transition: "background 0.2s, border-color 0.2s",
  };
}

function presetBtn(active: boolean): React.CSSProperties {
  return {
    padding: "12px 0",
    borderRadius: 8,
    border: `1px solid ${active ? "var(--primary)" : "var(--border)"}`,
    background: active ? "var(--primary-weak, rgba(0,0,0,0.05))" : "var(--background)",
    color: active ? "var(--primary)" : "var(--foreground)",
    fontWeight: 500,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    width: "100%",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "16px 100px 16px 16px", // right padding for the absolute text
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--background)",
    color: "var(--foreground)",
    fontSize: 16,
    fontWeight: 500,
    outline: "none",
    boxSizing: "border-box",
  };
}

function primaryBtn(disabled: boolean, fullWidth: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "14px 24px",
    borderRadius: 12,
    border: "none",
    background: disabled ? "var(--surface-hover, #e0e0e0)" : "var(--primary, #000)",
    color: disabled ? "var(--muted)" : "var(--on-primary, #fff)",
    fontWeight: 600,
    fontSize: 15,
    opacity: disabled ? 0.7 : 1,
    transition: "opacity 0.2s ease, transform 0.1s ease",
    width: fullWidth ? "100%" : "auto",
  };
}

function secondaryBtn(disabled: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: disabled ? "var(--muted)" : "var(--foreground)",
    fontWeight: 500,
    fontSize: 14,
    opacity: disabled ? 0.5 : 1,
  };
}

function pill(bg: string, fg: string): React.CSSProperties {
  return {
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 500,
    fontSize: 12,
  };
}
