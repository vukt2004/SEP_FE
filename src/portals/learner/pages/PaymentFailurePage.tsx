import { AlertTriangle, RotateCcw, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";

export default function PaymentFailurePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reason =
    searchParams.get("message") ??
    searchParams.get("reason") ??
    searchParams.get("error") ??
    searchParams.get("vnp_OrderInfo");

  const reference =
    searchParams.get("orderId") ?? searchParams.get("vnp_TxnRef") ?? searchParams.get("txnRef");
  const responseCode =
    searchParams.get("responseCode") ??
    searchParams.get("vnp_ResponseCode") ??
    searchParams.get("code");

  return (
    <div style={styles.page}>
      <div style={styles.backdrop} aria-hidden />
      <div style={styles.card}>
        <div style={styles.iconWrapFailure}>
          <AlertTriangle size={34} color="var(--danger)" aria-hidden />
        </div>
        <h1 style={styles.title}>{t("paymentFailureTitle")}</h1>
        <p style={styles.subtitle}>{t("paymentFailureDesc")}</p>

        <div style={styles.metaWrap}>
          {reason ? <MetaRow label={t("paymentReason")} value={reason} /> : null}
          {reference ? <MetaRow label={t("paymentReference")} value={reference} /> : null}
          {responseCode ? <MetaRow label={t("paymentResponseCode")} value={responseCode} /> : null}
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.primaryBtn} onClick={() => navigate(ROUTES.LEARNER_WALLET)}>
            <RotateCcw size={16} aria-hidden />
            {t("paymentTryTopUpAgain")}
          </button>
          <button type="button" style={styles.secondaryBtn} onClick={() => navigate(ROUTES.LEARNER_WALLET)}>
            <Wallet size={16} aria-hidden />
            {t("paymentBackToWallet")}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metaRow}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={styles.metaValue}>{value}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "72vh",
    display: "grid",
    placeItems: "center",
    padding: "18px 16px 32px",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(920px 520px at 12% 10%, rgba(239,68,68,0.16), transparent 66%), radial-gradient(800px 500px at 86% 14%, rgba(245,158,11,0.13), transparent 68%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 95%, #ffffff) 0%, var(--bg) 100%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "min(620px, 100%)",
    borderRadius: 18,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 16px 38px rgba(2,6,23,0.1)",
    padding: "24px 22px",
    display: "grid",
    gap: 12,
  },
  iconWrapFailure: {
    width: 58,
    height: 58,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid color-mix(in srgb, var(--danger) 46%, var(--border))",
    background: "color-mix(in srgb, var(--danger) 12%, transparent)",
  },
  title: {
    margin: 0,
    fontSize: 26,
    lineHeight: 1.2,
    fontWeight: 800,
    color: "var(--text)",
  },
  subtitle: {
    margin: 0,
    color: "var(--text-2)",
    fontSize: 14,
    lineHeight: 1.55,
  },
  metaWrap: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 12,
    background: "color-mix(in srgb, var(--surface-2) 40%, transparent)",
    display: "grid",
    gap: 8,
    marginTop: 4,
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLabel: {
    color: "var(--muted)",
    fontSize: 13,
    fontWeight: 600,
  },
  metaValue: {
    color: "var(--text)",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
    maxWidth: "68%",
    overflowWrap: "anywhere",
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    border: "none",
    borderRadius: 10,
    padding: "11px 12px",
    background: "var(--primary)",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },
  secondaryBtn: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "11px 12px",
    background: "var(--surface)",
    color: "var(--text)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },
};
