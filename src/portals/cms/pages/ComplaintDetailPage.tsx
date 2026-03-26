import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cmsComplaintsApi } from "@/services/api/cms/complaints.api";
import { cmsUsersApi } from "@/services/api/cms/users.api";
import { cmsAuthApi } from "@/services/api/cms/auth.api";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { ComplaintTimeline } from "@/shared/components/complaints/ComplaintTimeline";
import type { ComplaintDetail, ComplaintStatus } from "@/types/api/complaints";
import {
  getAllowedStatusTransitions,
  normalizeComplaintStatus,
  toComplaintStatusEnumValue,
  validateMessageContent,
} from "@/shared/components/complaints/complaint.utils";
import { CheckCircle2, SendHorizontal, XCircle } from "lucide-react";

type ParticipantInfo = {
  name: string;
  avatarPath: string | null;
};

const DEFAULT_AVATAR = "/brand/avatar-fallback.png";
const PROJECT_LOGO_AVATAR = "/brand/logo.png";

function applyAvatarFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  const target = event.currentTarget;
  if (target.dataset.fallbackApplied === "1") return;
  target.dataset.fallbackApplied = "1";
  target.src = DEFAULT_AVATAR;
}

function buildDisplayName(firstName?: string | null, lastName?: string | null, email?: string | null, fallback?: string) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (email) return email;
  return fallback ?? "Unknown User";
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getUid5(value: string) {
  return (value || "").replace(/-/g, "").slice(0, 5);
}

export default function ComplaintDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [cmsSelfId, setCmsSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus | "">("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2800);
  }

  async function fetchDetail() {
    if (!id) return;
    try {
      setLoading(true);
      setError("");
      const res = await cmsComplaintsApi.getComplaintById(id);
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
    if (!data) return;
    const detail = data;
    let ignore = false;

    async function hydrateParticipants() {
      const next: Record<string, ParticipantInfo> = {};
      const senderIds = Array.from(new Set(detail.messages.map((m) => m.senderId).filter(Boolean)));
      const historyActorIds = Array.from(new Set(detail.statusHistories.map((h) => h.changedBy).filter(Boolean)));
      const userIds = Array.from(new Set([detail.userId, ...senderIds, ...historyActorIds].filter(Boolean)));

      const selfRes = await cmsAuthApi.getProfile().catch(() => null);
      const selfProfile = selfRes?.data?.data;
      if (selfProfile?.userId) {
        setCmsSelfId(selfProfile.userId);
        next[selfProfile.userId] = {
          name: buildDisplayName(selfProfile.firstName, selfProfile.lastName, selfProfile.email, "Support Agent"),
          avatarPath: selfProfile.avatarPath ?? null,
        };
      }

      const userResults = await Promise.allSettled(userIds.map((userId) => cmsUsersApi.getUserById(userId)));
      userResults.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const user = result.value.data.data;
        if (!user?.id) return;
        next[user.id] = {
          name: buildDisplayName(user.firstName, user.lastName, user.email, "User"),
          avatarPath: user.avatarPath ?? null,
        };
      });

      if (!ignore) setParticipants(next);
    }

    hydrateParticipants();
    return () => {
      ignore = true;
    };
  }, [data]);

  useEffect(() => {
    const transitions = getAllowedStatusTransitions(data?.complaintStatus);
    setSelectedStatus(transitions[0] ?? "");
  }, [data?.complaintStatus]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function submitStatusChange() {
    if (!id || !data || !selectedStatus) return;
    try {
      setStatusSubmitting(true);
      const res = await cmsComplaintsApi.changeStatus(id, {
        toStatus: toComplaintStatusEnumValue(selectedStatus),
        note: statusNote || undefined,
      });
      if (!res.data.isSuccess) {
        const msg = res.data.message || "Update status failed.";
        setError(msg);
        showToast("error", msg);
        return;
      }
      setStatusNote("");
      showToast("success", `Status updated to ${selectedStatus}.`);
      await fetchDetail();
    } catch {
      setError("Update status failed.");
      showToast("error", "Update status failed.");
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function onChangeStatus() {
    if (!id || !data) return;
    if (!selectedStatus) {
      setError("Please select a status.");
      showToast("error", "Please select a status.");
      return;
    }
    if (selectedStatus === "Resolved") {
      setConfirmOpen(true);
      return;
    }
    await submitStatusChange();
  }

  async function onSendMessage() {
    if (!id) return;
    const v = validateMessageContent(messageContent);
    setMessageError(v);
    if (v) return;
    try {
      setMessageSubmitting(true);
      const res = await cmsComplaintsApi.addMessage(id, { content: messageContent, isInternal });
      if (!res.data.isSuccess) {
        const msg = res.data.message || "Send message failed.";
        setMessageError(msg);
        showToast("error", msg);
        return;
      }
      const statusNow = normalizeComplaintStatus(data?.complaintStatus);
      if (statusNow === "Open") {
        await cmsComplaintsApi.changeStatus(id, {
          toStatus: toComplaintStatusEnumValue("InProgress"),
          note: "Auto-updated to InProgress after staff reply.",
        });
      }
      setMessageContent("");
      setIsInternal(false);
      showToast("success", "Message sent successfully.");
      await fetchDetail();
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    } catch {
      setMessageError("Send message failed.");
      showToast("error", "Send message failed.");
    } finally {
      setMessageSubmitting(false);
    }
  }

  const orderedMessages = data
    ? [...data.messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];
  const canSendMessage = !messageSubmitting && !!messageContent.trim();

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [orderedMessages.length]);

  if (loading && !data) return <div style={{ padding: 24 }}>Loading detail...</div>;
  if (error) return <div style={{ color: "var(--danger)", padding: 24 }}>{error}</div>;
  if (!data) return <div style={{ padding: 24 }}>No complaint found.</div>;
  const currentStatus = normalizeComplaintStatus(data.complaintStatus);
  const allowedTransitions = getAllowedStatusTransitions(data.complaintStatus);
  const customerName = participants[data.userId]?.name ?? data.userId;
  const formatHistoryActor = (changedBy: string) => {
    const actorName = participants[changedBy]?.name ?? "User";
    return `${actorName} (${getUid5(changedBy)})`;
  };

  return (
    <div style={{ padding: 24, maxWidth: 1480, margin: "0 auto", display: "grid", gap: 16 }}>
      {toast ? (
        <div
          style={{
            position: "fixed",
            top: 82,
            right: 24,
            zIndex: 80,
            minWidth: 280,
            maxWidth: 420,
            border: toast.type === "success" ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(239,68,68,0.35)",
            background: "var(--surface)",
            borderRadius: 12,
            padding: "10px 12px",
            boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
          role="status"
          aria-live="polite"
        >
          {toast.type === "success" ? <CheckCircle2 size={17} color="#16a34a" /> : <XCircle size={17} color="#dc2626" />}
          <span style={{ fontSize: 14, color: "var(--text)" }}>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              marginLeft: "auto",
              border: "none",
              background: "transparent",
              color: "var(--text-2)",
              cursor: "pointer",
              fontSize: 16,
              lineHeight: 1,
            }}
            aria-label="Close toast"
          >
            ×
          </button>
        </div>
      ) : null}

      {confirmOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.45)",
            zIndex: 90,
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              padding: 18,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>Confirm Status Change</div>
            <div style={{ color: "var(--text-2)", fontSize: 14 }}>
              Mark this complaint as <strong style={{ color: "var(--text)" }}>Resolved</strong>? This action is visible in
              the ticket timeline.
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  color: "var(--text)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmOpen(false);
                  await submitStatusChange();
                }}
                style={{
                  border: "none",
                  background: "#16a34a",
                  color: "white",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              onClick={() => navigate("/cms/complaints")}
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
              ← Back to complaints
            </button>
            <div style={{ minWidth: 0 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  lineHeight: 1.3,
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
              <span>Created {new Date(data.createdAt).toLocaleString()}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>Category: {data.category}</span>
              <span style={{ opacity: 0.6 }}>•</span>
              <span>By: {customerName}</span>
            </div>
          </div>

          <h3 style={{ margin: "14px 0 8px 0", fontSize: 15 }}>Conversation</h3>
          <div
            ref={threadRef}
            style={{ maxHeight: 430, overflowY: "auto", paddingRight: 2, borderTop: "1px solid var(--border)" }}
          >
            <div style={{ display: "grid", gap: 0 }}>
              {orderedMessages.length === 0 ? (
                <div style={{ color: "var(--text-2)", padding: "14px 0" }}>No messages yet.</div>
              ) : (
                orderedMessages.map((msg) => {
                  const isUserMessage = msg.senderId === data.userId;
                  const isCmsMessage = cmsSelfId ? msg.senderId === cmsSelfId : !isUserMessage;
                  const displayName = participants[msg.senderId]?.name ?? msg.senderId;
                  const avatarPath = participants[msg.senderId]?.avatarPath;
                  const avatarSrc = avatarPath || (isCmsMessage ? PROJECT_LOGO_AVATAR : DEFAULT_AVATAR);
                  const isInternalNote = msg.isInternal;

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        justifyContent: isCmsMessage ? "flex-end" : "flex-start",
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
                          flexDirection: isCmsMessage ? "row-reverse" : "row",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background: isCmsMessage
                              ? "rgba(148,163,184,0.24)"
                              : "color-mix(in srgb, var(--primary) 30%, #ffffff)",
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
                            background: isInternalNote
                              ? "rgba(22, 163, 74, 0.14)"
                              : isCmsMessage
                                ? "var(--primary)"
                                : "var(--surface-2)",
                            color: isInternalNote ? "#166534" : isCmsMessage ? "#fff" : "var(--text)",
                            padding: "8px 10px",
                            border: isInternalNote
                              ? "1px solid rgba(22, 163, 74, 0.45)"
                              : isCmsMessage
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
                            <strong style={{ fontSize: 12, lineHeight: 1.2 }}>
                              {displayName}{isInternalNote ? " (Internal)" : ""}
                            </strong>
                            <span style={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>{formatMessageTime(msg.createdAt)}</span>
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
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (canSendMessage) {
                      void onSendMessage();
                    }
                  }
                }}
                rows={1}
                maxLength={5000}
                placeholder="Write a reply..."
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
                onClick={onSendMessage}
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
                aria-label={messageSubmitting ? "Sending message" : "Send message"}
                title="Send (Enter)"
              >
                <SendHorizontal size={16} />
              </button>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              Internal note
            </label>
            {messageError ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{messageError}</div> : null}
            {messageSubmitting ? <div style={{ color: "var(--text-2)", fontSize: 12 }}>Sending...</div> : null}
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
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Ticket Details</div>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div><strong>Customer:</strong> {customerName}</div>
              <div><strong>Ticket ID:</strong> #{data.id.slice(0, 8)}</div>
              <div><strong>Category:</strong> {data.category}</div>
              <div><strong>Created:</strong> {new Date(data.createdAt).toLocaleDateString()}</div>
              <div>
                <strong>Status:</strong>{" "}
                {currentStatus ? (
                  <ComplaintStatusBadge status={currentStatus} />
                ) : (
                  <span style={{ color: "var(--text-2)" }}>{data.complaintStatus}</span>
                )}
              </div>
              <div>
                <strong>Description:</strong>
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
              {data.resolvedAt ? <div><strong>Resolved:</strong> {new Date(data.resolvedAt).toLocaleString()}</div> : null}
            </div>
          </section>

          {currentStatus !== "Resolved" ? (
            <section
              style={{
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 16,
                background: "var(--surface)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Status</div>
              <div style={{ display: "grid", gap: 8 }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as ComplaintStatus)}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: 14,
                  }}
                >
                  <option value="" disabled>
                    Select status
                  </option>
                  {allowedTransitions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                {allowedTransitions.length === 0 ? (
                  <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                    This complaint has no further valid transitions in backend workflow.
                  </div>
                ) : null}
                <textarea
                  placeholder={`Note for ${selectedStatus || "status"} (optional)`}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  rows={3}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: 10,
                    background: "var(--bg)",
                    color: "var(--text)",
                    resize: "vertical",
                  }}
                />
                <button
                  onClick={onChangeStatus}
                  disabled={statusSubmitting || !selectedStatus || !allowedTransitions.includes(selectedStatus)}
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "10px 14px",
                    background: selectedStatus === "Resolved" ? "#16a34a" : "var(--primary)",
                    color: "white",
                    fontWeight: 600,
                    cursor:
                      statusSubmitting || !selectedStatus || !allowedTransitions.includes(selectedStatus)
                        ? "not-allowed"
                        : "pointer",
                    opacity: statusSubmitting || !selectedStatus || !allowedTransitions.includes(selectedStatus) ? 0.7 : 1,
                  }}
                >
                  {statusSubmitting ? "Updating..." : `Update to ${selectedStatus || "status"}`}
                </button>
              </div>
            </section>
          ) : null}

          <section
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 16,
              background: "var(--surface)",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 10 }}>Timeline</h3>
            <ComplaintTimeline histories={data.statusHistories} formatChangedBy={formatHistoryActor} />
          </section>
        </div>
      </div>
    </div>
  );
}
