import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { ComplaintTimeline } from "@/shared/components/complaints/ComplaintTimeline";
import type { ComplaintAttachment, ComplaintDetail } from "@/types/api/complaints";
import { validateMessageContent } from "@/shared/components/complaints/complaint.utils";
import { SendHorizontal } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

const DEFAULT_AVATAR = "/brand/avatar-fallback.png";
const PROJECT_LOGO_AVATAR = "/brand/logo.png";

function normalizeId(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function applyAvatarFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === "1") return;
  target.dataset.fallbackApplied = "1";
  target.src = DEFAULT_AVATAR;
}

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

export default function ComplaintDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [composerError, setComposerError] = useState("");
  const [learnerAvatar, setLearnerAvatar] = useState<string | null>(null);
  const [currentLearnerId, setCurrentLearnerId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"summary" | "evidence" | "details" | "timeline">(
    "summary",
  );
  const threadRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  async function fetchDetail() {
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
  }

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    let ignore = false;
    async function fetchProfile() {
      try {
        const res = await learnerProfileApi.getProfile();
        if (!ignore && res.isSuccess) {
          setLearnerAvatar(res.data?.avatarPath ?? null);
          setCurrentLearnerId(res.data?.userId ?? null);
        }
      } catch {
        // ignore profile errors on detail page
      }
    }
    fetchProfile();
    return () => {
      ignore = true;
    };
  }, []);

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
  const secondaryContextText =
    resolvedContext?.displaySubtitle?.trim() || resolvedContext?.referenceCode?.trim() || "";

  return (
    <div style={{ padding: 24, maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section
          style={{
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 10,
            background: "var(--surface)",
          }}
        >
          <div
            style={{
              padding: "0",
              marginBottom: 2,
            }}
          >
            <button
              type="button"
              onClick={() => navigate("/app/complaints")}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg)",
                color: "var(--text)",
                borderRadius: 999,
                padding: "5px 11px",
                fontSize: 12,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              ← {t("complaints.detail.backToComplaints")}
            </button>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.35,
                  fontWeight: 600,
                  color: "var(--text)",
                  wordBreak: "break-word",
                }}
              >
                Ticket #{data.id.slice(0, 8)} - {data.subject}
              </h2>
            </div>
            <div
              style={{
                marginTop: 4,
                display: "flex",
                flexWrap: "wrap",
                gap: "1px 6px",
                color: "var(--text-2)",
                fontSize: 11,
              }}
            >
              <span>
                {t("complaints.detail.created")} {new Date(data.createdAt).toLocaleString()}
              </span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>
                {t("complaints.category")}: {data.category}
              </span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>
                {t("complaints.detail.by")}: {t("complaints.detail.you")}
              </span>
            </div>
          </div>

          <h3 style={{ margin: "14px 0 8px 0", fontSize: 15 }}>
            {t("complaints.detail.conversation")}
          </h3>
          <div
            ref={threadRef}
            style={{
              maxHeight: 430,
              overflowY: "auto",
              paddingRight: 2,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "grid", gap: 0 }}>
              {visibleMessages.length === 0 ? (
                <div style={{ color: "var(--text-2)", padding: "14px 0" }}>
                  {t("complaints.detail.noMessages")}
                </div>
              ) : (
                visibleMessages.map((msg) => {
                  const isLearnerMessage =
                    normalizeId(msg.senderId) === normalizeId(currentLearnerId || data.userId);
                  const displayName = isLearnerMessage
                    ? t("complaints.detail.you")
                    : t("complaints.detail.supportTeam");
                  const avatarSrc = isLearnerMessage
                    ? learnerAvatar || DEFAULT_AVATAR
                    : PROJECT_LOGO_AVATAR;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isLearnerMessage ? "flex-end" : "flex-start",
                        borderBottom: "1px solid var(--border)",
                        padding: "10px 0",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "100%",
                          width: "100%",
                          display: "flex",
                          gap: 10,
                          flexDirection: isLearnerMessage ? "row-reverse" : "row",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: isLearnerMessage
                              ? "color-mix(in srgb, var(--primary) 30%, #ffffff)"
                              : "rgba(148,163,184,0.24)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            border: "1px solid var(--border)",
                            overflow: "hidden",
                          }}
                          aria-label={`${displayName} avatar`}
                        >
                          <img
                            src={avatarSrc}
                            alt={displayName}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            data-fallback-applied="0"
                            onError={applyAvatarFallback}
                          />
                        </div>
                        <div
                          style={{
                            borderRadius: 10,
                            background: isLearnerMessage ? "var(--primary)" : "var(--surface-2)",
                            color: isLearnerMessage ? "#fff" : "var(--text)",
                            padding: "8px 10px",
                            border: isLearnerMessage
                              ? "1px solid transparent"
                              : "1px solid var(--border)",
                            minWidth: 0,
                            maxWidth: "calc(100% - 54px)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 8,
                              marginBottom: 6,
                              fontSize: 10,
                              opacity: 0.92,
                            }}
                          >
                            <strong style={{ fontSize: 12, lineHeight: 1.2 }}>{displayName}</strong>
                            <span style={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              lineHeight: 1.45,
                              fontSize: 13,
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {isResolved ? (
              <div style={{ color: "var(--warning)", marginBottom: 2 }}>
                {t("complaints.detail.resolvedNotice")}
              </div>
            ) : null}
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
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
                aria-label={sending ? t("complaints.detail.sending") : t("complaints.detail.send")}
                title="Send (Enter)"
              >
                <SendHorizontal size={16} />
              </button>
            </div>
            {composerError ? (
              <div style={{ color: "var(--danger)", fontSize: 12 }}>{composerError}</div>
            ) : null}
            {sending ? (
              <div style={{ color: "var(--text-2)", fontSize: 12 }}>
                {t("complaints.detail.sending")}
              </div>
            ) : null}
          </div>
        </section>

        <div style={{ display: "grid", gap: 16, position: "sticky", top: 24, alignSelf: "start" }}>
          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {t("complaints.detail.summary")}
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 18,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {data.subject}
                </div>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {t("complaints.detail.description")}
                </div>
                <div style={{ lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {data.description}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {(
                [
                  ["summary", t("complaints.detail.summary")],
                  ["evidence", t("complaints.detail.evidence")],
                  ["details", t("complaints.detail.moreDetails")],
                  ["timeline", t("complaints.detail.timeline")],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSidebarTab(key)}
                  style={{
                    border: `1px solid ${sidebarTab === key ? "var(--primary)" : "var(--border)"}`,
                    background:
                      sidebarTab === key
                        ? "color-mix(in srgb, var(--primary) 10%, var(--bg) 90%)"
                        : "var(--bg)",
                    color: "var(--text)",
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {sidebarTab === "summary" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--bg)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {t("complaints.detail.overview")}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.detail.subject")}
                      </div>
                      <div style={{ fontWeight: 700, wordBreak: "break-word" }}>{data.subject}</div>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.detail.description")}
                      </div>
                      <div
                        style={{ lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                      >
                        {data.description}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--bg)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {t("complaints.detail.statusSummary")}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.category")}
                      </div>
                      <div style={{ fontWeight: 700 }}>{data.category}</div>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.table.status")}
                      </div>
                      <div style={{ fontWeight: 700 }}>{data.complaintStatus}</div>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.detail.created")}
                      </div>
                      <div style={{ fontWeight: 700 }}>
                        {new Date(data.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {data.resolvedAt ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.resolved")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {new Date(data.resolvedAt).toLocaleString()}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 12,
                    background: "var(--bg)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                    {t("complaints.detail.contextInfo")}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.detail.customer")}
                      </div>
                      <div style={{ fontWeight: 700 }}>{t("complaints.detail.you")}</div>
                    </div>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                        {t("complaints.detail.contextTitle")}
                      </div>
                      <div style={{ fontWeight: 700, wordBreak: "break-word" }}>
                        {resolvedContext?.displayTitle || primaryContextText}
                      </div>
                    </div>
                    {resolvedContext?.displaySubtitle || secondaryContextText ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.contextSubtitle")}
                        </div>
                        <div style={{ lineHeight: 1.5, wordBreak: "break-word" }}>
                          {resolvedContext?.displaySubtitle || secondaryContextText}
                        </div>
                      </div>
                    ) : null}
                    {eventTime ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.eventTime")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {new Date(eventTime).toLocaleString()}
                        </div>
                      </div>
                    ) : null}
                    {typeof resolvedContext?.amountValue === "number" ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.amountValue")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {formatNumber(resolvedContext.amountValue)}
                        </div>
                      </div>
                    ) : null}
                    {typeof resolvedContext?.deltaValue === "number" ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.deltaValue")}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          {resolvedContext.deltaValue > 0
                            ? `+${resolvedContext.deltaValue}`
                            : resolvedContext.deltaValue}
                        </div>
                      </div>
                    ) : null}
                    {resolvedContext?.linkedOrder ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          {t("complaints.detail.linkedOrder")}
                        </div>
                        <div style={{ fontWeight: 700, wordBreak: "break-word" }}>
                          {resolvedContext.linkedOrder.orderCode ||
                            resolvedContext.linkedOrder.orderId}
                          {resolvedContext.linkedOrder.orderStatus
                            ? ` (${resolvedContext.linkedOrder.orderStatus})`
                            : ""}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {sidebarTab === "evidence" ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 10,
                  background: "var(--bg)",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {t("complaints.detail.evidence")}{" "}
                  {evidenceAttachments.length > 0
                    ? `(${t("complaints.detail.evidenceCount").replace("{count}", String(evidenceAttachments.length))})`
                    : ""}
                </div>
                {evidenceAttachments.length > 0 ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))",
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
                            gap: 0,
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
                  </div>
                ) : (
                  <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                    {t("complaints.detail.noEvidence")}
                  </div>
                )}
              </div>
            ) : null}

            {sidebarTab === "details" ? (
              <div style={{ display: "grid", gap: 8, paddingTop: 4 }}>
                <div>
                  <strong>{t("complaints.detail.ticketDetails")}:</strong> #{data.id.slice(0, 8)}
                </div>
                <div>
                  <strong>{t("complaints.detail.categoryKey")}:</strong> {data.categoryKey}
                </div>
                {resolvedContext?.displayTitle ? (
                  <div>
                    <strong>{t("complaints.detail.contextTitle")}:</strong>{" "}
                    {resolvedContext.displayTitle}
                  </div>
                ) : null}
                {resolvedContext?.displaySubtitle ? (
                  <div>
                    <strong>{t("complaints.detail.contextSubtitle")}:</strong>{" "}
                    {resolvedContext.displaySubtitle}
                  </div>
                ) : null}
                {eventTime ? (
                  <div>
                    <strong>{t("complaints.detail.eventTime")}:</strong>{" "}
                    {new Date(eventTime).toLocaleString()}
                  </div>
                ) : null}
                {typeof resolvedContext?.amountValue === "number" ? (
                  <div>
                    <strong>{t("complaints.detail.amountValue")}:</strong>{" "}
                    {formatNumber(resolvedContext.amountValue)}
                  </div>
                ) : null}
                {typeof resolvedContext?.deltaValue === "number" ? (
                  <div>
                    <strong>{t("complaints.detail.deltaValue")}:</strong>{" "}
                    {resolvedContext.deltaValue > 0
                      ? `+${resolvedContext.deltaValue}`
                      : resolvedContext.deltaValue}
                  </div>
                ) : null}
                {data.contextType ? (
                  <div>
                    <strong>{t("complaints.detail.contextType")}:</strong> {data.contextType}
                  </div>
                ) : null}
                {resolvedContext?.linkedOrder ? (
                  <div>
                    <strong>{t("complaints.detail.linkedOrder")}:</strong>{" "}
                    {resolvedContext.linkedOrder.orderCode || resolvedContext.linkedOrder.orderId}
                    {resolvedContext.linkedOrder.orderStatus
                      ? ` (${resolvedContext.linkedOrder.orderStatus})`
                      : ""}
                  </div>
                ) : null}
              </div>
            ) : null}

            {sidebarTab === "timeline" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                  {t("complaints.detail.historyHint")}
                </div>
                <ComplaintTimeline histories={data.statusHistories} />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
