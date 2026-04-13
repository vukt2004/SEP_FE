import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { ComplaintMessageList } from "@/shared/components/complaints/ComplaintMessageList";
import { ComplaintTimeline } from "@/shared/components/complaints/ComplaintTimeline";
import type { ComplaintAttachment, ComplaintDetail } from "@/types/api/complaints";
import { validateMessageContent } from "@/shared/components/complaints/complaint.utils";
import { SendHorizontal } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import { useThemeStore } from "@/stores/theme.store";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { ROUTES } from "@/lib/constants/routes";

function formatNumber(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableImage(file: ComplaintAttachment) {
  const mime = (file.mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp)$/i.test(file.fileName);
}

function formatDurationBetween(
  startIso: string,
  endIso: string | null,
  t: (key: string) => string,
) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso || new Date().toISOString()).getTime();
  const diffMinutes = Math.max(1, Math.round((end - start) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} ${t("complaints.detail.duration.minute")}`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `${hours} ${t("complaints.detail.duration.hour")}`;
  const days = Math.round(hours / 24);
  return `${days} ${t("complaints.detail.duration.day")}`;
}

function getCurrentLearnerUserId(token: string | null | undefined): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(json) as Record<string, unknown>;
    const claimKeys = [
      "sub",
      "nameid",
      "uid",
      "userId",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    ];
    for (const key of claimKeys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim().length > 0) return value.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export default function ComplaintDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const theme = useThemeStore((s) => s.theme);
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [contentTab, setContentTab] = useState<"conversation" | "evidence">("conversation");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const currentUserId = useMemo(
    () => getCurrentLearnerUserId(tokenStorage.getLearnerToken()),
    [],
  );

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await learnerComplaintsApi.getComplaintById(id);
      if (res.data.isSuccess && res.data.data) setData(res.data.data);
      else setError(res.data.message || "Failed to load complaint detail.");
    } catch {
      setError("Failed to load complaint detail.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    if (!id || !data || !currentUserId) return;
    if (String(data.userId).toLowerCase() === String(currentUserId).toLowerCase()) return;
    navigate(ROUTES.LEARNER_COMPLAINT_OVERVIEW(id), { replace: true });
  }, [currentUserId, data, id, navigate]);

  async function onSend() {
    if (!id || !data) return;
    const msgError = validateMessageContent(content);
    setComposerError(msgError);
    if (msgError) return;
    try {
      setSending(true);
      const res = await learnerComplaintsApi.addMessage(id, { content });
      if (!res.data.isSuccess) {
        setComposerError(res.data.message || "Send message failed.");
        return;
      }
      setContent("");
      await fetchDetail();
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
      window.requestAnimationFrame(() => {
        composerRef.current?.focus();
      });
    } catch {
      setComposerError("Send message failed.");
    } finally {
      setSending(false);
    }
  }

  const evidenceAttachments = useMemo(() => {
    const sourceMessage =
      data?.messages.find((message) => !message.isInternal) ?? data?.messages[0] ?? null;
    return [...(sourceMessage?.attachments ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [data]);

  if (loading && !data) return <div>{t("complaints.detail.loading")}</div>;
  if (error) return <div style={{ color: "var(--danger)" }}>{error}</div>;
  if (!data) return <div>{t("complaints.detail.noComplaint")}</div>;

  const isResolved = data.complaintStatus === "Resolved";
  const visibleMessages = [...data.messages]
    .filter((m) => !m.isInternal)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const canSendMessage = !isResolved && !sending && !!content.trim();
  const resolvedContext = data.contextResolved;
  const eventTime = resolvedContext?.eventTime || data.occurredAt;
  const primaryContextText = resolvedContext?.displayTitle?.trim() || data.category;
  const secondaryContextText = resolvedContext?.displaySubtitle?.trim() || "";
  const linkedOrder = resolvedContext?.linkedOrder;
  const amountFromVnd = typeof linkedOrder?.amountVnd === "number" ? linkedOrder.amountVnd : null;
  const amountFromOrbit =
    typeof linkedOrder?.amountOrbitCoin === "number" ? linkedOrder.amountOrbitCoin : null;
  const fallbackAmount =
    typeof resolvedContext?.amountValue === "number" ? resolvedContext.amountValue : null;
  const orderAmountValue = amountFromVnd ?? amountFromOrbit ?? fallbackAmount;
  const paymentTargetType = (linkedOrder?.paymentTargetType ?? "").toLowerCase();
  const orderAmountUnit =
    amountFromVnd !== null
      ? "VND"
      : amountFromOrbit !== null
        ? "OrbitCoin"
        : paymentTargetType.includes("vnd")
          ? "VND"
          : paymentTargetType.includes("orbit")
            ? "OrbitCoin"
            : "";
  const orderAmount =
    orderAmountValue === null
      ? "-"
      : `${formatNumber(orderAmountValue)}${orderAmountUnit ? ` ${orderAmountUnit}` : ""}`;
  const isOrbitCoinTransaction =
    paymentTargetType.includes("orbit") ||
    (linkedOrder?.paymentTargetName ?? "").toLowerCase().includes("orbitcoin");
  const orderCodeRaw =
    linkedOrder?.orderCode || linkedOrder?.orderId || linkedOrder?.paymentTargetId || "-";
  const orderCodeDisplay = orderCodeRaw === "-" ? "-" : orderCodeRaw.slice(0, 8);
  const orderIdDisplay = linkedOrder?.orderId ? linkedOrder.orderId.slice(0, 8) : "";
  const transactionIdDisplay = linkedOrder?.paymentTargetId
    ? linkedOrder.paymentTargetId.slice(0, 8)
    : "";
  const orderedHistories = [...data.statusHistories].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );

  const isDark = theme === "dark";

  return (
    <div
      style={{
        padding: 18,
        maxWidth: 1480,
        margin: "0 auto",
        display: "grid",
        gap: 12,
        backgroundColor: "var(--bg)",
        backgroundImage: isDark
          ? "none"
          : `
            radial-gradient(
              ellipse 120% 80% at 50% 0%,
              color-mix(in srgb, var(--primary) 18%, transparent) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 85% 65% at 100% 35%,
              color-mix(in srgb, var(--accent) 10%, transparent) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 75% 55% at 0% 60%,
              color-mix(in srgb, var(--primary) 8%, transparent) 0%,
              transparent 50%
            ),
            radial-gradient(
              ellipse 100% 50% at 50% 100%,
              color-mix(in srgb, var(--primary) 5%, transparent) 0%,
              transparent 55%
            )
          `,
      }}
    >
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 10px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => navigate(ROUTES.LEARNER_COMPLAINTS)}
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg)",
              color: "var(--text)",
              borderRadius: 999,
              padding: "5px 11px",
              fontSize: 12,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ← {t("complaints.detail.backToComplaints")}
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                lineHeight: 1.15,
                fontWeight: 700,
                color: "var(--text)",
                wordBreak: "break-word",
              }}
            >
              {data.subject}
              <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 14 }}>
                #{data.id.slice(0, 8)}
              </span>
            </h2>
          </div>
          <ComplaintStatusBadge status={data.complaintStatus} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase" }}>
              {t("complaints.category")}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2, fontSize: 14 }}>{data.category}</div>
          </div>
          <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase" }}>
              {t("complaints.detail.customer")}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2, fontSize: 14 }}>
              {t("complaints.detail.you")}
            </div>
          </div>
          <div style={{ padding: "8px 10px", borderRight: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase" }}>
              {t("complaints.detail.amountValue")}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 2,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>{orderAmount}</div>
              {linkedOrder?.orderStatus ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "rgba(220, 38, 38, 0.12)",
                    color: "#b91c1c",
                    fontWeight: 700,
                    fontSize: 11,
                    lineHeight: 1.4,
                  }}
                >
                  {linkedOrder.orderStatus}
                </span>
              ) : null}
            </div>
          </div>
          <div style={{ padding: "8px 10px" }}>
            <div style={{ fontSize: 11, color: "var(--text-2)", textTransform: "uppercase" }}>
              {t("complaints.detail.processingTime")}
            </div>
            <div style={{ fontWeight: 700, marginTop: 2, fontSize: 14 }}>
              {data.resolvedAt
                ? t("complaints.detail.resolvedAt").replace(
                    "{time}",
                    new Date(data.resolvedAt).toLocaleString(),
                  )
                : t("complaints.detail.inProgress")}
            </div>
            {data.resolvedAt ? (
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                {t("complaints.detail.processingDuration").replace(
                  "{duration}",
                  formatDurationBetween(data.createdAt, data.resolvedAt, t),
                )}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2.6fr) minmax(250px, 0.75fr)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
          background: "var(--surface)",
        }}
      >
        <section
          style={{
            borderRight: "1px solid var(--border)",
            padding: 0,
            background: "var(--surface)",
          }}
        >
          <div
            style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 12px" }}
          >
            {(
              [
                ["conversation", t("complaints.detail.conversation")],
                ["evidence", t("complaints.detail.evidence")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setContentTab(key)}
                style={{
                  border: "none",
                  borderBottom:
                    contentTab === key ? "2px solid var(--text)" : "2px solid transparent",
                  background: "transparent",
                  color: contentTab === key ? "var(--text)" : "var(--text-2)",
                  padding: "10px 8px",
                  marginRight: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {contentTab === "conversation" ? (
            <>
              <div
                ref={threadRef}
                style={{
                  minHeight: 370,
                  maxHeight: 430,
                  overflowY: "auto",
                  padding: 12,
                }}
              >
                <ComplaintMessageList
                  messages={visibleMessages}
                  currentUserId={data.userId}
                  hideInternal
                  otherLabel={t("complaints.detail.supportTeam")}
                  currentUserLabel={t("complaints.detail.you")}
                />
              </div>

              <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
                {isResolved ? (
                  <div
                    style={{
                      color: "#8a4b00",
                      marginBottom: 8,
                      background: "rgba(245, 158, 11, 0.15)",
                      borderLeft: "3px solid #f59e0b",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 13,
                    }}
                  >
                    {t("complaints.detail.resolvedNotice")}
                  </div>
                ) : null}
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: "var(--bg)",
                    padding: 8,
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 8,
                  }}
                >
                  <textarea
                    ref={composerRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (canSendMessage) {
                          void onSend();
                        }
                      }
                    }}
                    placeholder={t("complaints.detail.replyPlaceholder")}
                    rows={1}
                    maxLength={5000}
                    disabled={isResolved || sending}
                    style={{
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 10px",
                      background: "transparent",
                      color: "var(--text)",
                      resize: "none",
                      fontSize: 13,
                      lineHeight: 1.4,
                      width: "100%",
                      outline: "none",
                      minHeight: 38,
                      maxHeight: 120,
                    }}
                  />
                  <button
                    type="button"
                    onClick={onSend}
                    disabled={!canSendMessage}
                    style={{
                      width: 36,
                      height: 36,
                      border: "none",
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      background: "var(--primary)",
                      color: "white",
                      cursor: !canSendMessage ? "not-allowed" : "pointer",
                      opacity: !canSendMessage ? 0.55 : 1,
                      flexShrink: 0,
                    }}
                    aria-label={
                      sending ? t("complaints.detail.sending") : t("complaints.detail.send")
                    }
                    title="Send (Enter)"
                  >
                    <SendHorizontal size={16} />
                  </button>
                </div>
                {composerError ? (
                  <div style={{ color: "var(--danger)", fontSize: 12, marginTop: 6 }}>
                    {composerError}
                  </div>
                ) : null}
                {sending ? (
                  <div style={{ color: "var(--text-2)", fontSize: 12, marginTop: 6 }}>
                    {t("complaints.detail.sending")}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>
                {t("complaints.detail.evidence")}{" "}
                {evidenceAttachments.length > 0
                  ? `(${t("complaints.detail.evidenceCount").replace("{count}", String(evidenceAttachments.length))})`
                  : ""}
              </div>
              {evidenceAttachments.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                    gap: 10,
                  }}
                >
                  {evidenceAttachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "var(--surface)",
                        display: "grid",
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: "4 / 3",
                          background: "var(--bg)",
                          display: "grid",
                          placeItems: "center",
                          overflow: "hidden",
                        }}
                      >
                        {isPreviewableImage(attachment) ? (
                          <img
                            src={attachment.url}
                            alt={attachment.fileName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              color: "var(--text-2)",
                              fontSize: 12,
                              textAlign: "center",
                              padding: 8,
                            }}
                          >
                            {t("complaints.attachments.preview")}
                          </div>
                        )}
                      </div>
                      <div style={{ padding: 8, display: "grid", gap: 2 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, wordBreak: "break-word" }}>
                          {attachment.fileName}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                          {formatFileSize(attachment.sizeBytes)}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  {t("complaints.detail.noEvidence")}
                </div>
              )}
            </div>
          )}
        </section>

        <aside style={{ background: "var(--surface)", minWidth: 0, maxWidth: 340, width: "100%" }}>
          <section style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              {t("complaints.detail.linkedOrder")}
            </div>
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 10,
                display: "grid",
                gap: 8,
                background: "var(--bg)",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {isOrbitCoinTransaction
                    ? t("complaints.detail.transactionId")
                    : t("complaints.detail.orderCode")}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700, fontSize: 12, wordBreak: "break-word" }}>
                    {isOrbitCoinTransaction
                      ? transactionIdDisplay || orderCodeDisplay
                      : orderCodeDisplay}
                  </div>
                  {!isOrbitCoinTransaction && orderIdDisplay ? (
                    <div style={{ fontSize: 12, color: "var(--text-2)", wordBreak: "break-word" }}>
                      {t("complaints.detail.orderId")}:{" "}
                      <span style={{ color: "var(--text)", fontWeight: 700 }}>
                        {orderIdDisplay}
                      </span>
                    </div>
                  ) : null}
                </div>
                {linkedOrder?.orderStatus ? (
                  <div
                    style={{
                      width: "fit-content",
                      marginTop: 2,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "rgba(220, 38, 38, 0.12)",
                      color: "#b91c1c",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {linkedOrder.orderStatus}
                  </div>
                ) : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                    {t("complaints.detail.package")}
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    {linkedOrder?.paymentTargetName || primaryContextText}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                    {t("complaints.detail.price")}
                  </div>
                  <div style={{ fontWeight: 700 }}>{orderAmount}</div>
                </div>
              </div>
            </div>
          </section>

          <section style={{ padding: 14, borderBottom: "1px solid var(--border)" }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              {t("complaints.detail.timeline")}
            </div>
            <ComplaintTimeline histories={orderedHistories} />
          </section>

          <section style={{ padding: 14 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-2)",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              {t("complaints.detail.customer")}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {t("complaints.detail.name")}
                </div>
                <div style={{ fontWeight: 700 }}>{t("complaints.detail.you")}</div>
              </div>
              <div style={{ display: "grid", gap: 2 }}>
                <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                  {t("complaints.detail.eventTime")}
                </div>
                <div style={{ fontWeight: 700 }}>
                  {new Date(eventTime || data.createdAt).toLocaleString()}
                </div>
              </div>
              {secondaryContextText ? (
                <div style={{ display: "grid", gap: 2 }}>
                  <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                    {t("complaints.detail.contextSubtitle")}
                  </div>
                  <div style={{ fontWeight: 700, wordBreak: "break-word" }}>
                    {secondaryContextText}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
