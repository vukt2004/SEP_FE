import { AlertTriangle, RotateCcw, ArrowLeft, Store, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import type { LocaleId } from "@/lib/i18n/translations";
import { orbitCoinApi, type DepositOrderDetail } from "@/services/api/learner/orbitcoin.api";

const ORDER_ID_DISPLAY_LEN = 5;

export default function PaymentFailurePage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState<"id" | "code" | null>(null);
  const clientFallbackRef = useRef(new Date());
  const [depositDetail, setDepositDetail] = useState<DepositOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAttempted, setDetailAttempted] = useState(false);

  const reason =
    searchParams.get("message") ??
    searchParams.get("reason") ??
    searchParams.get("error") ??
    searchParams.get("vnp_OrderInfo");

  const amountVndFromQuery = useMemo(() => {
    const raw =
      searchParams.get("amountVND") ??
      searchParams.get("amountVnd") ??
      searchParams.get("amount") ??
      searchParams.get("vnp_Amount");
    if (!raw) return null;
    const normalized = raw.replace(/,/g, "").trim();
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const vnd = raw.includes("vnp_") || normalized.endsWith("00") ? numeric / 100 : numeric;
    return Math.round(vnd);
  }, [searchParams]);

  const orbitCoinFromQuery = useMemo(() => {
    const raw =
      searchParams.get("amountOrbitCoin") ??
      searchParams.get("orbitCoin") ??
      searchParams.get("oc") ??
      searchParams.get("orbitCoins");
    if (raw) {
      const n = Number(String(raw).replace(/,/g, "").trim());
      if (Number.isFinite(n) && n > 0) return Math.round(n);
    }
    return null;
  }, [searchParams]);

  const orbitCoinFromQueryDerived = useMemo(() => {
    if (orbitCoinFromQuery != null) return orbitCoinFromQuery;
    if (amountVndFromQuery != null && amountVndFromQuery > 0)
      return Math.max(1, Math.round(amountVndFromQuery / 1000));
    return null;
  }, [orbitCoinFromQuery, amountVndFromQuery]);

  const orderIdRaw = searchParams.get("orderId")?.trim() || null;
  const orderIdGuid = useMemo(() => parseGuidOrderId(orderIdRaw), [orderIdRaw]);
  const orderCodeFromQuery =
    searchParams.get("orderCode")?.trim() || searchParams.get("ordercode")?.trim() || null;

  useEffect(() => {
    if (!orderIdGuid) {
      setDetailAttempted(true);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailAttempted(false);
    (async () => {
      try {
        const res = await orbitCoinApi.getDepositOrder(orderIdGuid);
        if (!cancelled && res.isSuccess && res.data) setDepositDetail(res.data);
      } catch {
        if (!cancelled) setDepositDetail(null);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
          setDetailAttempted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderIdGuid]);

  const amountVnd =
    depositDetail?.amountVnd != null && depositDetail.amountVnd > 0
      ? Math.round(depositDetail.amountVnd)
      : amountVndFromQuery;

  const orbitCoinDisplay = useMemo(() => {
    if (depositDetail != null) {
      const oc = Number(depositDetail.amountOrbitCoin);
      if (Number.isFinite(oc) && oc > 0) return Math.round(oc);
    }
    return orbitCoinFromQueryDerived;
  }, [depositDetail, orbitCoinFromQueryDerived]);

  const orderId = orderIdRaw;
  const orderCode = depositDetail?.externalOrderCode?.trim() || orderCodeFromQuery;

  const paymentMethodLabel = useMemo(() => {
    const fromQuery =
      searchParams.get("paymentMethod") ??
      searchParams.get("method") ??
      searchParams.get("channel") ??
      searchParams.get("paymentChannel");
    const raw = depositDetail?.paymentMethodName?.trim() || fromQuery?.trim() || null;
    return formatPaymentMethodDisplay(raw, t);
  }, [searchParams, depositDetail?.paymentMethodName, t]);

  const txAt = useMemo(() => {
    const iso = depositDetail?.paidAt ?? depositDetail?.createdAt;
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }, [depositDetail?.paidAt, depositDetail?.createdAt]);

  const showDbPending = Boolean(orderIdGuid && detailLoading);
  const showDbMissing = Boolean(orderIdGuid && detailAttempted && !depositDetail);

  const dateStr =
    showDbPending ? "…" : showDbMissing ? "—" : txAt ? formatPaymentDate(txAt, locale) : formatPaymentDate(clientFallbackRef.current, locale);
  const timeStr =
    showDbPending ? "…" : showDbMissing ? "—" : txAt ? formatPaymentTime(txAt, locale) : formatPaymentTime(clientFallbackRef.current, locale);

  const orderIdShort =
    orderId && orderId.length > ORDER_ID_DISPLAY_LEN ? orderId.slice(0, ORDER_ID_DISPLAY_LEN) : orderId;

  const statusUi = useMemo(
    () => resolvePaymentStatusUi(depositDetail?.paymentStatus, t),
    [depositDetail?.paymentStatus, t],
  );

  const copyToClipboard = async (text: string, field: "id" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const hasReason = Boolean(reason?.trim());
  const lastDetailSection: "code" | "id" | "reason" | "status" = orderCode
    ? "code"
    : orderId
      ? "id"
      : hasReason
        ? "reason"
        : "status";

  return (
    <div style={styles.page}>
      <div style={styles.backdrop} aria-hidden />
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <div style={styles.headerBlock}>
          <div style={styles.heroWrap}>
            <motion.div
              style={styles.heroIconFailure}
              aria-hidden
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.06 }}
            >
              <AlertTriangle size={34} strokeWidth={3} color="#fff" />
            </motion.div>
            <motion.div
              style={styles.heroRingFailure}
              aria-hidden
              initial={{ scale: 0.92, opacity: 0.5 }}
              animate={{ scale: 1.32, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.12 }}
            />
          </div>
          <motion.h1
            style={styles.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35 }}
          >
            {t("paymentFailureTitle")}
          </motion.h1>
          <p style={styles.subtitle}>{t("paymentFailureDesc")}</p>
        </div>

        {(amountVnd != null || orbitCoinDisplay != null) && (
          <div style={styles.amountRow}>
            {amountVnd != null ? <span style={styles.amountVnd}>{formatVnd(amountVnd, locale)}</span> : null}
            {orbitCoinDisplay != null ? (
              <span style={styles.ocPill}>
                {orbitCoinDisplay.toLocaleString("en-US")} {t("paymentBonusOc")}
              </span>
            ) : null}
          </div>
        )}

        <div style={styles.infoStrip}>
          <div style={styles.infoCell}>
            <div style={styles.infoValue}>{dateStr}</div>
            <div style={styles.infoLabel}>{t("paymentTransactionDate")}</div>
          </div>
          <div style={styles.infoDivider} aria-hidden />
          <div style={styles.infoCell}>
            <div style={styles.infoValue}>{timeStr}</div>
            <div style={styles.infoLabel}>{t("paymentTransactionTime")}</div>
          </div>
          <div style={styles.infoDivider} aria-hidden />
          <div style={styles.infoCell}>
            <div style={styles.infoValue}>{paymentMethodLabel}</div>
            <div style={styles.infoLabel}>{t("paymentMethod")}</div>
          </div>
        </div>

        <div style={styles.timeline}>
          <FailureTimelineStep
            variant="warn"
            title={t("paymentFailureTimeline1Title")}
            subtitle={t("paymentFailureTimeline1Sub")}
            isLast={false}
          />
          <FailureTimelineStep
            variant="pending"
            title={t("paymentFailureTimeline2Title")}
            subtitle={t("paymentFailureTimeline2Sub")}
            isLast
          />
        </div>

        <div style={styles.detailsBox}>
          <div
            style={{
              ...styles.detailRow,
              ...(lastDetailSection === "status" ? { borderBottom: "none", paddingBottom: 0 } : {}),
            }}
          >
            <span style={styles.detailLabel}>{t("paymentStatusLabel")}</span>
            <span style={statusUi.pillStyle}>
              <span style={statusUi.dotStyle} aria-hidden />
              {statusUi.label}
            </span>
          </div>

          {hasReason ? (
            <div
              style={{
                ...styles.detailRow,
                ...(lastDetailSection === "reason" ? { borderBottom: "none", paddingBottom: 0 } : {}),
              }}
            >
              <span style={styles.detailLabel}>{t("paymentReason")}</span>
              <span style={styles.detailReason}>{reason!.trim()}</span>
            </div>
          ) : null}

          {orderId ? (
            <div
              style={{
                ...styles.detailRow,
                ...(lastDetailSection === "id" ? { borderBottom: "none", paddingBottom: 0 } : {}),
              }}
            >
              <span style={styles.detailLabel}>{t("paymentOrderId")}</span>
              <div style={styles.detailValueWithCopy}>
                <span style={styles.detailMono} title={orderId}>
                  {orderIdShort}
                </span>
                <button
                  type="button"
                  style={styles.copyBtn}
                  onClick={() => copyToClipboard(orderId, "id")}
                  aria-label={t("paymentCopy")}
                >
                  <Copy size={16} aria-hidden />
                  <span>{copied === "id" ? t("paymentCopied") : t("paymentCopy")}</span>
                </button>
              </div>
            </div>
          ) : null}

          {orderCode ? (
            <div style={{ ...styles.detailRow, borderBottom: "none", paddingBottom: 0 }}>
              <span style={styles.detailLabel}>{t("paymentOrderCode")}</span>
              <div style={styles.detailValueWithCopy}>
                <span style={styles.detailMono}>{orderCode}</span>
                <button
                  type="button"
                  style={styles.copyBtn}
                  onClick={() => copyToClipboard(orderCode, "code")}
                  aria-label={t("paymentCopy")}
                >
                  <Copy size={16} aria-hidden />
                  <span>{copied === "code" ? t("paymentCopied") : t("paymentCopy")}</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.outlineBtn} onClick={() => navigate(ROUTES.LEARNER_WALLET)}>
            <RotateCcw size={16} aria-hidden />
            {t("paymentTryTopUpAgain")}
          </button>
          <button type="button" style={styles.outlineBtn} onClick={() => navigate(ROUTES.LEARNER_WALLET)}>
            <ArrowLeft size={16} aria-hidden />
            {t("paymentBackToWallet")}
          </button>
          <button type="button" style={styles.outlineBtn} onClick={() => navigate(ROUTES.LEARNER_MARKETPLACE)}>
            <Store size={16} aria-hidden />
            {t("paymentGoMarketplace")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function parseGuidOrderId(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const s = raw.trim();
  if (
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s)
  )
    return null;
  return s;
}

function resolvePaymentStatusUi(
  status: string | undefined,
  t: (k: string) => string,
): { label: string; pillStyle: CSSProperties; dotStyle: CSSProperties } {
  const dangerPill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--danger, #dc2626)",
  };
  const dangerDot: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--danger, #dc2626)",
    flexShrink: 0,
  };
  const mutedPill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-2)",
  };
  const mutedDot: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#eab308",
    flexShrink: 0,
  };
  const okPill: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--success, #16a34a)",
  };
  const okDot: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--success, #16a34a)",
    flexShrink: 0,
  };

  switch (status) {
    case "Completed":
      return { label: t("paymentStatusCompleted"), pillStyle: okPill, dotStyle: okDot };
    case "Pending":
      return { label: t("paymentStatusProcessing"), pillStyle: mutedPill, dotStyle: mutedDot };
    case "Cancelled":
      return { label: t("paymentStatusCancelled"), pillStyle: dangerPill, dotStyle: dangerDot };
    case "Failed":
      return { label: t("paymentStatusFailed"), pillStyle: dangerPill, dotStyle: dangerDot };
    case "Refunded":
      return { label: t("paymentStatusRefunded"), pillStyle: mutedPill, dotStyle: mutedDot };
    default:
      return { label: t("paymentStatusFailed"), pillStyle: dangerPill, dotStyle: dangerDot };
  }
}

function FailureTimelineStep({
  variant,
  title,
  subtitle,
  isLast,
}: {
  variant: "warn" | "pending";
  title: string;
  subtitle: string;
  isLast: boolean;
}) {
  const dot =
    variant === "warn" ? (
      <div style={styles.ftDotWarn} aria-hidden>
        <AlertTriangle size={11} strokeWidth={2.5} color="#fff" />
      </div>
    ) : (
      <div style={styles.ftDotPending} aria-hidden />
    );

  const lineColor =
    variant === "warn" ? "rgba(239, 68, 68, 0.35)" : "color-mix(in srgb, var(--border) 90%, transparent)";

  return (
    <div style={styles.ftRow}>
      <div style={styles.ftRail}>
        {dot}
        {!isLast ? <div style={{ ...styles.ftLine, background: lineColor }} aria-hidden /> : null}
      </div>
      <div style={styles.ftContent}>
        <div style={styles.ftTitle}>{title}</div>
        <div style={styles.ftSub}>{subtitle}</div>
      </div>
    </div>
  );
}

function formatPaymentMethodDisplay(raw: string | null, t: (k: string) => string): string {
  if (!raw?.trim()) return t("paymentMethodUnknown");
  const s = raw.trim();
  if (/^momo$/i.test(s)) return "Momo";
  if (/^vnpay|vn pay$/i.test(s)) return "VNPay";
  if (/^payos$/i.test(s)) return "PayOS";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatPaymentDate(d: Date, locale: LocaleId): string {
  try {
    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function formatPaymentTime(d: Date, locale: LocaleId): string {
  try {
    return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

function formatVnd(value: number, locale: LocaleId): string {
  const nf =
    locale === "vi"
      ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 })
      : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  return `${nf.format(value)} vnđ`;
}

const styles: Record<string, CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "72vh",
    display: "grid",
    placeItems: "center",
    padding: "18px min(4vw, 28px) 40px",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(880px 460px at 12% 16%, rgba(239,68,68,0.14), transparent 64%), radial-gradient(840px 520px at 86% 12%, rgba(245,158,11,0.1), transparent 68%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 96%, #ffffff) 0%, var(--bg) 100%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  card: {
    position: "relative",
    zIndex: 3,
    width: "min(680px, calc(100vw - 24px))",
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 20px 48px rgba(2,6,23,0.08)",
    padding: "28px 24px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  headerBlock: {
    textAlign: "center",
    display: "grid",
    justifyItems: "center",
    gap: 10,
  },
  heroWrap: {
    position: "relative",
    width: 72,
    height: 72,
    display: "grid",
    placeItems: "center",
  },
  heroIconFailure: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "var(--danger, #dc2626)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 28px rgba(239, 68, 68, 0.32)",
    position: "relative",
    zIndex: 1,
  },
  heroRingFailure: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "2px solid rgba(239, 68, 68, 0.4)",
    left: 0,
    top: 0,
    zIndex: 0,
  },
  title: {
    margin: 0,
    fontSize: 24,
    lineHeight: 1.25,
    fontWeight: 800,
    color: "var(--text)",
    letterSpacing: -0.3,
  },
  subtitle: {
    margin: 0,
    color: "var(--text-2)",
    fontSize: 14,
    lineHeight: 1.55,
    maxWidth: 520,
  },
  amountRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  amountVnd: {
    fontSize: 32,
    fontWeight: 800,
    letterSpacing: -0.8,
    color: "var(--text)",
    lineHeight: 1,
  },
  ocPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    background: "color-mix(in srgb, var(--surface-2) 85%, var(--border))",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
  },
  infoStrip: {
    display: "flex",
    alignItems: "stretch",
    justifyContent: "space-between",
    gap: 0,
    padding: "14px 8px",
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "color-mix(in srgb, var(--surface-2) 35%, transparent)",
  },
  infoCell: {
    flex: 1,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
    padding: "0 6px",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  infoDivider: {
    width: 1,
    alignSelf: "stretch",
    background: "var(--border)",
    margin: "4px 0",
    flexShrink: 0,
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    paddingLeft: 4,
  },
  ftRow: {
    display: "flex",
    gap: 14,
    alignItems: "stretch",
  },
  ftRail: {
    width: 22,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  ftDotWarn: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--danger, #dc2626)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  ftDotPending: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--muted) 55%, var(--border))",
    marginTop: 5,
    flexShrink: 0,
  },
  ftLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 1,
  },
  ftContent: {
    flex: 1,
    paddingBottom: 18,
    minWidth: 0,
  },
  ftTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4,
  },
  ftSub: {
    fontSize: 13,
    fontWeight: 500,
    color: "var(--muted)",
    lineHeight: 1.45,
  },
  detailsBox: {
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: 14,
    background: "color-mix(in srgb, var(--surface-2) 30%, transparent)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  detailRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    paddingBottom: 12,
    borderBottom: "1px solid color-mix(in srgb, var(--border) 80%, transparent)",
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--muted)",
  },
  detailReason: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text)",
    textAlign: "right",
    maxWidth: "min(100%, 420px)",
    lineHeight: 1.45,
    overflowWrap: "anywhere",
  },
  detailValueWithCopy: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    flex: "1 1 auto",
    justifyContent: "flex-end",
  },
  detailMono: {
    fontSize: 14,
    fontWeight: 700,
    color: "var(--text)",
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "min(240px, 48vw)",
    textAlign: "right",
  },
  copyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
  actions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginTop: 4,
  },
  outlineBtn: {
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
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
