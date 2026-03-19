// src/portals/learner/pages/WalletPage.tsx
import { useEffect, useState } from "react";
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
  const pageSize = 20;

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

  if (loading) {
    return (
      <div style={card()}>
        <div style={{ height: 18, width: 180, background: "var(--surface)", borderRadius: 10 }} />
        <div
          style={{
            height: 12,
            width: 260,
            background: "var(--surface)",
            borderRadius: 10,
            marginTop: 10,
          }}
        />
        <div
          style={{ height: 220, background: "var(--surface)", borderRadius: 16, marginTop: 16 }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Header Card */}
      <div style={card()}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.2 }}>{t("wallet")}</div>
        <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 13 }}>
          {t("viewYourBalance")}
        </div>
      </div>

      {/* Balance Card */}
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, color: "var(--muted)", fontWeight: 800 }}>
              {t("currentBalance")}
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, marginTop: 8, letterSpacing: -1 }}>
              {balance?.toLocaleString() ?? 0}
              <span style={{ fontSize: 24, color: "var(--muted)", marginLeft: 8 }}>OrbitCoins</span>
            </div>
          </div>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            🪙
          </div>
        </div>
      </div>

      {/* Transactions Card */}
      <div style={card()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 16 }}>{t("transactionHistory")}</div>
          {error && <span style={pill("var(--danger-weak)", "var(--danger)")}>{error}</span>}
        </div>

        {transactions.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 14,
            }}
          >
            No transactions yet
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 8 }}>
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
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => loadPage(pageNumber - 1)}
                  disabled={pageNumber === 1 || loadingTransactions}
                  style={paginationBtn(pageNumber === 1 || loadingTransactions)}
                >
                  Previous
                </button>
                <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 800 }}>
                  {t("page")} {pageNumber} {t("of")} {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => loadPage(pageNumber + 1)}
                  disabled={pageNumber === totalPages || loadingTransactions}
                  style={paginationBtn(pageNumber === totalPages || loadingTransactions)}
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

function TransactionRow({ transaction }: { transaction: OrbitCoinTransaction }) {
  const isCredit = transaction.transactionType === CoinTransactionTypeEnum.Credit;
  const sign = isCredit ? "+" : "-";
  const color = isCredit ? "var(--ok)" : "var(--danger)";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 12,
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: isCredit ? "var(--ok-weak)" : "var(--danger-weak)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            flex: "0 0 auto",
          }}
        >
          {isCredit ? "📈" : "📉"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {transaction.note || "Transaction"}
          </div>
          <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 2 }}>
            {new Date(transaction.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color }}>
          {sign}
          {Math.abs(transaction.amount).toLocaleString()}
        </div>
        {transaction.balanceAfter !== undefined && transaction.balanceAfter !== null && (
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
            Balance: {transaction.balanceAfter.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

/** Styles */
function card(): React.CSSProperties {
  return {
    background: "var(--elevated, var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  };
}

function pill(bg: string, fg: string): React.CSSProperties {
  return {
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: bg,
    color: fg,
    fontWeight: 800,
    fontSize: 12,
    whiteSpace: "nowrap",
  };
}

function paginationBtn(disabled: boolean): React.CSSProperties {
  return {
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    background: disabled ? "var(--surface)" : "var(--primary)",
    color: disabled ? "var(--muted)" : "var(--on-primary, #0b1020)",
    fontWeight: 800,
    fontSize: 13,
    opacity: disabled ? 0.5 : 1,
  };
}
