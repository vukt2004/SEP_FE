import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { ComplaintTimeline } from "@/shared/components/complaints/ComplaintTimeline";
import type { ComplaintDetail } from "@/types/api/complaints";
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

  if (loading && !data) return <div>{t("complaints.detail.loading")}</div>;
  if (error) return <div style={{ color: "var(--danger)" }}>{error}</div>;
  if (!data) return <div>{t("complaints.detail.noComplaint")}</div>;

  const isResolved = data.complaintStatus === "Resolved";
  const visibleMessages = [...data.messages]
    .filter((m) => !m.isInternal)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const canSendMessage = !isResolved && !sending && !!content.trim();

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
              <span>{t("complaints.detail.created")} {new Date(data.createdAt).toLocaleString()}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{t("complaints.category")}: {data.category}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>{t("complaints.detail.by")}: {t("complaints.detail.you")}</span>
            </div>
          </div>

          <h3 style={{ margin: "14px 0 8px 0", fontSize: 15 }}>{t("complaints.detail.conversation")}</h3>
          <div
            ref={threadRef}
            style={{ maxHeight: 430, overflowY: "auto", paddingRight: 2, borderTop: "1px solid var(--border)" }}
          >
            <div style={{ display: "grid", gap: 0 }}>
              {visibleMessages.length === 0 ? (
                <div style={{ color: "var(--text-2)", padding: "14px 0" }}>{t("complaints.detail.noMessages")}</div>
              ) : (
                visibleMessages.map((msg) => {
                  const isLearnerMessage = normalizeId(msg.senderId) === normalizeId(currentLearnerId || data.userId);
                  const displayName = isLearnerMessage ? t("complaints.detail.you") : t("complaints.detail.supportTeam");
                  const avatarSrc = isLearnerMessage ? learnerAvatar || DEFAULT_AVATAR : PROJECT_LOGO_AVATAR;

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
                            border: isLearnerMessage ? "1px solid transparent" : "1px solid var(--border)",
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
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45, fontSize: 13 }}>
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
            {composerError ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{composerError}</div> : null}
            {sending ? <div style={{ color: "var(--text-2)", fontSize: 12 }}>{t("complaints.detail.sending")}</div> : null}
          </div>
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t("complaints.detail.ticketDetails")}</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div><strong>{t("complaints.detail.customer")}:</strong> {t("complaints.detail.you")}</div>
              <div><strong>{t("complaints.table.ticketId")}:</strong> #{data.id.slice(0, 8)}</div>
              <div><strong>{t("complaints.category")}:</strong> {data.category}</div>
              <div><strong>{t("complaints.table.createDate")}:</strong> {new Date(data.createdAt).toLocaleDateString()}</div>
              <div><strong>{t("complaints.table.status")}:</strong> <ComplaintStatusBadge status={data.complaintStatus} /></div>
              <div>
                <strong>{t("complaints.description")}:</strong>
                <div
                  style={{
                    marginTop: 6,
                    textAlign: "left",
                    color: "var(--text)",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {data.description}
                </div>
              </div>
              {data.resolvedAt ? <div><strong>{t("complaints.detail.resolved")}:</strong> {new Date(data.resolvedAt).toLocaleString()}</div> : null}
            </div>
          </section>

          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>{t("complaints.detail.timeline")}</h3>
            <ComplaintTimeline histories={data.statusHistories} />
          </section>
        </div>
      </div>
    </div>
  );
}
