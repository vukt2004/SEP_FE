import { Check, ArrowLeft, Store, Copy, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import type { LocaleId } from "@/lib/i18n/translations";
import { orbitCoinApi, type DepositOrderDetail } from "@/services/api/learner/orbitcoin.api";

const ORDER_ID_DISPLAY_LEN = 5;

export default function PaymentSuccessPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [copied, setCopied] = useState<"id" | "code" | null>(null);
  const clientFallbackRef = useRef(new Date());
  const [depositDetail, setDepositDetail] = useState<DepositOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAttempted, setDetailAttempted] = useState(false);

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
        await orbitCoinApi.confirmDeposit(orderIdGuid);
      } catch {
        /* confirm optional; GET still loads DB row */
      }
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

  const isCompleted = depositDetail?.paymentStatus === "Completed";

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

  const copyToClipboard = async (text: string, field: "id" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const step1Sub =
    showDbPending || showDbMissing
      ? t("paymentStepPaymentRecorded")
      : `${timeStr} — ${t("paymentStepPaymentRecorded")}`;
  const step2Variant = isCompleted ? ("done" as const) : ("active" as const);
  const step3Variant = isCompleted ? ("done" as const) : ("pending" as const);
  const invoiceOrderId = orderId ?? "N/A";
  const invoiceOrderCode = orderCode ?? "N/A";
  const invoiceAmountVnd = amountVnd ?? 0;
  const invoiceOc = orbitCoinDisplay ?? 0;

  const handleDownloadInvoicePdf = () => {
    const report = window.open("", "_blank", "width=980,height=760");
    if (!report) return;
    report.document.write(
      buildPaymentInvoiceHtml({
        title: t("paymentSuccessTitle"),
        orderId: invoiceOrderId,
        orderCode: invoiceOrderCode,
        paymentMethod: paymentMethodLabel,
        statusLabel: isCompleted ? t("paymentStatusCompleted") : t("paymentStatusProcessing"),
        date: dateStr,
        time: timeStr,
        amountVnd: invoiceAmountVnd,
        orbitCoin: invoiceOc,
        locale,
      }),
    );
    report.document.close();
    report.focus();
    report.print();
  };

  return (
    <div style={styles.page}>
      <div style={styles.backdrop} aria-hidden />
      <FallingConfetti />
      <motion.div
        style={styles.card}
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
      >
        <div style={styles.headerBlock}>
          <div style={styles.heroWrap}>
            <CelebrationBurst />
            <motion.div
              style={styles.heroIcon}
              aria-hidden
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.08 }}
            >
              <Check size={34} strokeWidth={3} color="#fff" />
            </motion.div>
            <motion.div
              style={styles.heroRing}
              aria-hidden
              initial={{ scale: 0.92, opacity: 0.55 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 1.25, ease: "easeOut", delay: 0.15 }}
            />
          </div>
          <motion.h1
            style={styles.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.35 }}
          >
            {t("paymentSuccessTitle")}
          </motion.h1>
          <p style={styles.subtitle}>{t("paymentSuccessDesc")}</p>
        </div>

        {(amountVnd != null || orbitCoinDisplay != null) && (
          <div style={styles.amountRow}>
            {amountVnd != null ? <span style={styles.amountVnd}>{formatVnd(amountVnd, locale)}</span> : null}
            {orbitCoinDisplay != null ? (
              <span style={styles.ocPill}>
                +{orbitCoinDisplay.toLocaleString("en-US")} {t("paymentBonusOc")}
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
          <TimelineStep variant="done" title={t("paymentStepOrderConfirmed")} subtitle={step1Sub} isLast={false} />
          <TimelineStep
            variant={step2Variant}
            title={t("paymentStepCreditingOc")}
            subtitle={isCompleted ? t("paymentStepCreditingDone") : t("paymentStepCreditingHint")}
            isLast={false}
          />
          <TimelineStep
            variant={step3Variant}
            title={t("paymentStepWalletUpdated")}
            subtitle={isCompleted ? t("paymentStepWalletDone") : t("paymentStepWalletPending")}
            isLast
          />
        </div>

        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>{t("paymentStatusLabel")}</span>
            <span style={isCompleted ? styles.statusPill : styles.statusPillMuted}>
              <span style={isCompleted ? styles.statusDot : styles.statusDotMuted} aria-hidden />
              {isCompleted ? t("paymentStatusCompleted") : t("paymentStatusProcessing")}
            </span>
          </div>

          {orderId ? (
            <div style={styles.detailRow}>
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
            <ArrowLeft size={16} aria-hidden />
            {t("paymentBackToWallet")}
          </button>
          <button type="button" style={styles.outlineBtn} onClick={() => navigate(ROUTES.LEARNER_MARKETPLACE)}>
            <Store size={16} aria-hidden />
            {t("paymentGoMarketplace")}
          </button>
          <button
            type="button"
            style={styles.outlineBtn}
            title={t("paymentDownloadInvoiceHint")}
            onClick={handleDownloadInvoicePdf}
          >
            <Download size={16} aria-hidden />
            {t("paymentDownloadInvoice")}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const CONFETTI_COLORS = ["#22c55e", "#0ea5e9", "#eab308", "#a855f7", "#ec4899", "#f97316", "#38bdf8", "#4ade80"];

function useViewportHeight() {
  const [h, setH] = useState(800);
  useEffect(() => {
    const update = () => setH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return h;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function FallingConfetti() {
  const vh = useViewportHeight();
  const reduced = usePrefersReducedMotion();

  const pieces = useMemo(() => {
    return Array.from({ length: 52 }, (_, i) => {
      const wide = i % 3 !== 0;
      return {
        id: i,
        leftPct: Math.random() * 100,
        startY: -(40 + Math.random() * 120),
        duration: 2.8 + Math.random() * 3.2,
        delay: Math.random() * 4,
        repeatDelay: Math.random() * 2.5,
        drift: (Math.random() - 0.5) * 100,
        rotate: Math.random() * 360,
        spin: 480 + Math.random() * 520,
        w: wide ? 5 + Math.random() * 5 : 4 + Math.random() * 3,
        h: wide ? 2.5 + Math.random() * 3 : 4 + Math.random() * 4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        rounded: i % 4 === 0,
      };
    });
  }, []);

  if (reduced) return null;

  const endY = vh + 64;

  return (
    <div style={styles.confettiLayer} aria-hidden>
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            y: p.startY,
            x: 0,
            rotate: p.rotate,
            opacity: 0.92,
          }}
          animate={{
            y: endY,
            x: p.drift,
            rotate: p.rotate + p.spin,
            opacity: 0.82,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatDelay: p.repeatDelay,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${p.leftPct}%`,
            top: 0,
            width: p.w,
            height: p.h,
            borderRadius: p.rounded ? 999 : 1,
            background: p.color,
            boxShadow: "0 0 1px rgba(0,0,0,0.08)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

function CelebrationBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        angle: (360 / 16) * i + Math.random() * 14,
        delay: Math.random() * 0.22,
        dist: 48 + Math.random() * 40,
        hue: i % 3,
      })),
    [],
  );

  return (
    <div style={styles.burstLayer} aria-hidden>
      {particles.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const x = Math.cos(rad) * p.dist;
        const y = Math.sin(rad) * p.dist;
        const bg = p.hue === 0 ? "#22c55e" : p.hue === 1 ? "#0ea5e9" : "#eab308";
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.2, 1.15, 0.35], x, y }}
            transition={{ duration: 1.05, delay: p.delay, ease: "easeOut" }}
            style={{ ...styles.burstDot, background: bg }}
          />
        );
      })}
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

function TimelineStep({
  variant,
  title,
  subtitle,
  isLast,
}: {
  variant: "done" | "active" | "pending";
  title: string;
  subtitle: string;
  isLast: boolean;
}) {
  const dot =
    variant === "done" ? (
      <div style={styles.tDotDone} aria-hidden>
        <Check size={12} strokeWidth={3} color="#fff" />
      </div>
    ) : variant === "active" ? (
      <div style={styles.tDotActive} aria-hidden />
    ) : (
      <div style={styles.tDotPending} aria-hidden />
    );

  const lineColor =
    variant === "done" ? "rgba(34, 197, 94, 0.45)" : "color-mix(in srgb, var(--border) 90%, transparent)";

  return (
    <div style={styles.tRow}>
      <div style={styles.tRail}>
        {dot}
        {!isLast ? <div style={{ ...styles.tLine, background: lineColor }} aria-hidden /> : null}
      </div>
      <div style={styles.tContent}>
        <div style={styles.tTitle}>{title}</div>
        <div style={styles.tSub}>{subtitle}</div>
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

function buildPaymentInvoiceHtml({
  title,
  orderId,
  orderCode,
  paymentMethod,
  statusLabel,
  date,
  time,
  amountVnd,
  orbitCoin,
  locale,
}: {
  title: string;
  orderId: string;
  orderCode: string;
  paymentMethod: string;
  statusLabel: string;
  date: string;
  time: string;
  amountVnd: number;
  orbitCoin: number;
  locale: LocaleId;
}) {
  const safe = (v: string) =>
    v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const issuedAt = `${date} ${time}`;
  const amount = formatVnd(amountVnd, locale);
  const ocText = orbitCoin > 0 ? `+${orbitCoin.toLocaleString("en-US")} OC` : "N/A";
  const invoiceNo = orderId !== "N/A" ? orderId.slice(0, 8).toUpperCase() : "N/A";
  const statusLine = statusLabel;

  const labels =
    locale === "vi"
      ? {
          invoice: "HÓA ĐƠN",
          invoiceNo: "Mã hóa đơn",
          issuedAt: "Ngày lập",
          status: "Trạng thái",
          accountHolder: "Chủ tài khoản",
          platformLabel: "Nền tảng",
          no: "No.",
          description: "Mô tả",
          qty: "SL",
          unitPrice: "Đơn giá (VND)",
          amount: "Thành tiền (VND)",
          note: "Ghi chú",
          noteText: "Hóa đơn này được tạo từ giao dịch nạp tiền thành công.",
          buyerSign: "Người mua ký tên",
          sellerSign: "Nền tảng ký tên",
        }
      : {
          invoice: "INVOICE",
          invoiceNo: "Invoice No.",
          issuedAt: "Issued at",
          status: "Status",
          accountHolder: "Account holder",
          platformLabel: "Platform",
          no: "No.",
          description: "Description",
          qty: "Qty",
          unitPrice: "Unit Price (VND)",
          amount: "Amount (VND)",
          note: "Note",
          noteText: "This invoice is generated from successful top-up transaction details.",
          buyerSign: "Buyer signature",
          sellerSign: "Platform signature",
        };

  return `<!doctype html><html><head><title>${safe(title)}</title><style>
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
      <div class="title">${safe(labels.invoice)}</div>
      <div class="meta">${safe(labels.invoiceNo)}: ${safe(invoiceNo)}</div>
      <div class="meta">${safe(labels.issuedAt)}: ${safe(issuedAt)}</div>
      <div class="meta">${safe(labels.status)}: ${safe(statusLine)}</div>
    </div>
  </div>
  <div class="party">
    <div><strong>${safe(labels.accountHolder)}:</strong> ${safe(orderCode)}</div>
    <div><strong>${safe(labels.platformLabel)}:</strong> QuackOrbit Platform</div>
  </div>
  <table>
    <thead><tr><th>${safe(labels.no)}</th><th>${safe(labels.description)}</th><th>${safe(labels.qty)}</th><th>${safe(labels.unitPrice)}</th><th>${safe(labels.amount)}</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Top up OrbitCoin (${safe(paymentMethod)})</td><td>1</td><td>${safe(amount)}</td><td>${safe(amount)}</td></tr>
      <tr><td>2</td><td>Order reference</td><td>1</td><td>${safe(orderId)}</td><td>${safe(ocText)}</td></tr>
    </tbody>
  </table>
  <div class="sum">
    <div><strong>${safe(labels.note)}:</strong> ${safe(labels.noteText)}</div>
  </div>
  <div class="party" style="margin-top:18px">
    <div><strong>${safe(labels.buyerSign)}</strong></div>
    <div><strong>${safe(labels.sellerSign)}</strong></div>
  </div>
  </body></html>`;
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
      "radial-gradient(880px 460px at 12% 16%, rgba(34,197,94,0.16), transparent 64%), radial-gradient(840px 520px at 86% 12%, rgba(14,165,233,0.1), transparent 68%), linear-gradient(180deg, color-mix(in srgb, var(--bg) 96%, #ffffff) 0%, var(--bg) 100%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  confettiLayer: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 4,
    overflow: "hidden",
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
  burstLayer: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    pointerEvents: "none",
    overflow: "visible",
  },
  burstDot: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: "50%",
    left: "50%",
    top: "50%",
    marginLeft: -4.5,
    marginTop: -4.5,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "var(--success, #16a34a)",
    display: "grid",
    placeItems: "center",
    boxShadow: "0 12px 28px rgba(34, 197, 94, 0.35)",
    position: "relative",
    zIndex: 1,
  },
  heroRing: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: "50%",
    border: "2px solid rgba(34, 197, 94, 0.45)",
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
    fontSize: 36,
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
  tRow: {
    display: "flex",
    gap: 14,
    alignItems: "stretch",
  },
  tRail: {
    width: 22,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  tDotDone: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "var(--success, #16a34a)",
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  tDotActive: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    background: "#eab308",
    marginTop: 4,
    boxShadow: "0 0 0 4px rgba(234, 179, 8, 0.25)",
    flexShrink: 0,
  },
  tDotPending: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "color-mix(in srgb, var(--muted) 55%, var(--border))",
    marginTop: 5,
    flexShrink: 0,
  },
  tLine: {
    width: 2,
    flex: 1,
    minHeight: 18,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 1,
  },
  tContent: {
    flex: 1,
    paddingBottom: 18,
    minWidth: 0,
  },
  tTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "var(--text)",
    marginBottom: 4,
  },
  tSub: {
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
    alignItems: "center",
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
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--success, #16a34a)",
  },
  statusPillMuted: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 700,
    color: "var(--text-2)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--success, #16a34a)",
    flexShrink: 0,
  },
  statusDotMuted: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#eab308",
    flexShrink: 0,
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
