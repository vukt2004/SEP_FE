import { CheckCircle2, ArrowLeft, Store } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";

export default function PaymentSuccessPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const amountVnd = useMemo(() => {
    const raw =
      searchParams.get("amountVND") ??
      searchParams.get("amountVnd") ??
      searchParams.get("amount") ??
      searchParams.get("vnp_Amount");

    if (!raw) return null;
    const normalized = raw.replace(/,/g, "").trim();
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;

    // VNPay returns amount * 100, so normalize when applicable.
    const vnd = raw.includes("vnp_") || normalized.endsWith("00") ? numeric / 100 : numeric;
    return Math.round(vnd);
  }, [searchParams]);

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
        <div style={styles.iconWrapSuccess}>
          <CheckCircle2 size={34} color="var(--success)" aria-hidden />
        </div>
        <h1 style={styles.title}>{t("paymentSuccessTitle")}</h1>
        <p style={styles.subtitle}>{t("paymentSuccessDesc")}</p>

        <div style={styles.metaWrap}>
          {reference ? <MetaRow label={t("paymentReference")} value={reference} /> : null}
          {responseCode ? <MetaRow label={t("paymentResponseCode")} value={responseCode} /> : null}
          {amountVnd ? <MetaRow label={t("paymentAmountVnd")} value={formatVnd(amountVnd)} /> : null}
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.primaryBtn} onClick={() => navigate(ROUTES.LEARNER_WALLET)}>
            <ArrowLeft size={16} aria-hidden />
            {t("paymentBackToWallet")}
          </button>
          <button
            type="button"
            style={styles.secondaryBtn}
            onClick={() => navigate(ROUTES.LEARNER_MARKETPLACE)}
          >
            <Store size={16} aria-hidden />
            {t("paymentGoMarketplace")}
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

function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
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
      "radial-gradient(880px 460px at 12% 16%, rgba(34,197,94,0.18), transparent 64%), radial-gradient(840px 520px at 86% 12%, rgba(14,165,233,0.12), transparent 68%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 95%, #ffffff) 0%, var(--bg) 100%)",
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
  iconWrapSuccess: {
    width: 58,
    height: 58,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    border: "1px solid color-mix(in srgb, var(--success) 46%, var(--border))",
    background: "color-mix(in srgb, var(--success) 14%, transparent)",
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
