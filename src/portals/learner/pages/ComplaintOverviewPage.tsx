import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { learnerComplaintsApi } from "@/services/api/learner/complaints.api";
import { learnerChatApi } from "@/services/api/learner/chat.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import type { ComplaintAttachment, ComplaintDetail } from "@/types/api/complaints";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { useTranslation } from "@/lib/i18n/translations";
import { ROUTES } from "@/lib/constants/routes";
import { MessageCircle } from "lucide-react";

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

export default function ComplaintOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openingChat, setOpeningChat] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await learnerComplaintsApi.getComplaintById(id);
      if (res.data.isSuccess && res.data.data) {
        setData(res.data.data);
        return;
      }
      setError(res.data.message || "Failed to load complaint overview.");
    } catch {
      setError("Failed to load complaint overview.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleChatWithReporter = async () => {
    console.log("ComplaintOverviewPage: handleChatWithReporter clicked", { userId: data?.userId, openingChat });
    if (!data) return;
    try {
      setOpeningChat(true);

      // Determine reporter userId. Some limited views omit `userId`, so try fallbacks.
      let reporterId: string | undefined = data.userId;

      if (!reporterId) {
        // Try to find a senderId from the visible messages that is not the current user.
        const profileRes = await learnerProfileApi.getProfile().catch(() => null);
        const myUserId = profileRes?.data?.userId;
        reporterId = data.messages?.find((m) => !m.isInternal && m.senderId && m.senderId !== myUserId)
          ?.senderId;
        // Fallback to first message senderId (best-effort)
        if (!reporterId && data.messages?.length) reporterId = data.messages[0].senderId;
      }

      if (!reporterId) {
        alert(t("complaints.detail.cannotFindReporter") || "Cannot find reporter information.");
        return;
      }

      // Reporter display name: avoid calling CMS APIs from learner portal (prevents CMS login redirect).
      const reporterName = reporterId;

      // Create or get conversation with reporter
      const response = await learnerChatApi.getOrCreatePrivateConversation(reporterId);
      const conversationId = response.data.data?.id;
      if (!response.data.isSuccess || !conversationId) {
        alert(
          response.data.message ||
            (t("complaints.detail.cannotOpenChat") || "Unable to open chat with reporter."),
        );
        return;
      }
      const params = new URLSearchParams({
        otherUserId: reporterId,
        otherUserName: reporterName,
      });
      navigate(`${ROUTES.LEARNER_CHAT_CONVERSATION(conversationId)}?${params.toString()}`);
    } catch (err) {
      console.error(err);
      alert(t("complaints.detail.errorOpeningChat") || "Error opening chat.");
    } finally {
      setOpeningChat(false);
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

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 14 }}>
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
            }}
          >
            ← {t("complaints.detail.backToComplaints")}
          </button>
          <ComplaintStatusBadge status={data.complaintStatus} />
          {data.contextType?.toLowerCase() === "map" && (
            <button
              type="button"
              onClick={handleChatWithReporter}
              disabled={openingChat}
              style={{
                border: "1px solid var(--border)",
                background: "var(--primary)",
                color: "white",
                borderRadius: 6,
                padding: "5px 11px",
                fontSize: 12,
                cursor: openingChat ? "not-allowed" : "pointer",
                opacity: openingChat ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
              title={t("complaints.detail.chatWithReporter") || "Chat with reporter"}
            >
              <MessageCircle size={14} />
              {openingChat ? t("complaints.detail.openingChat") || "Opening..." : t("complaints.detail.contactReporter") || "Contact reporter"}
            </button>
          )}
        </div>

        <div>
          <h2 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>{data.subject}</h2>
          <div style={{ marginTop: 4, color: "var(--text-2)", fontSize: 13 }}>
            #{data.id.slice(0, 8)}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 10,
            borderTop: "1px solid var(--border)",
            paddingTop: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
              {t("complaints.table.category")}
            </div>
            <div style={{ fontWeight: 700 }}>{data.category}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
              {t("complaints.table.createDate")}
            </div>
            <div style={{ fontWeight: 700 }}>{new Date(data.createdAt).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 2 }}>
              {t("complaints.detail.eventTime")}
            </div>
            <div style={{ fontWeight: 700 }}>
              {new Date(data.occurredAt || data.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: 14,
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-2)", textTransform: "uppercase" }}>
          {t("complaints.description")}
        </div>
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{data.description}</div>
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: 14,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-2)", textTransform: "uppercase" }}>
          {t("complaints.detail.evidence")}
        </div>

        {evidenceAttachments.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    aspectRatio: "4 / 3",
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
                        fontSize: 12,
                        color: "var(--text-2)",
                        padding: 8,
                        textAlign: "center",
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
      </section>
    </div>
  );
}
