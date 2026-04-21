import { useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { cmsComplaintsApi } from "@/services/api/cms/complaints.api";
import { cmsUsersApi } from "@/services/api/cms/users.api";
import { cmsAuthApi } from "@/services/api/cms/auth.api";
import { ComplaintStatusBadge } from "@/shared/components/complaints/ComplaintStatusBadge";
import { ComplaintTimeline } from "@/shared/components/complaints/ComplaintTimeline";
import {
  COMPLAINT_STATUS_VALUE_TO_CODE,
  type ComplaintDetail,
  type ComplaintStatus,
} from "@/types/api/complaints";
import {
  validateMessageContent,
} from "@/shared/components/complaints/complaint.utils";
import { CheckCircle2, SendHorizontal, XCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";

type CmsStatusAction = {
  id:
    | "requestSellerResponse"
    | "markSellerNoResponse"
    | "markSellerRejected"
    | "confirmSellerAccepted"
    | "confirmSellerSubmittedFix"
    | "moveToBuyerVerify"
    | "resolveRefund"
    | "resolveReject"
    | "closeTicket";
  labelKey: string;
  toStatus: ComplaintStatus;
  issueRefund: boolean;
  allowedFrom: ComplaintStatus[];
  defaultNoteKey: string;
};

const CMS_STATUS_ACTIONS: CmsStatusAction[] = [
  {
    id: "requestSellerResponse",
    labelKey: "complaints.cmsDetail.action.requestSellerResponse",
    toStatus: "SellerPending",
    issueRefund: false,
    allowedFrom: ["Open"],
    defaultNoteKey: "complaints.cmsDetail.note.requestSellerResponse",
  },
  {
    id: "markSellerNoResponse",
    labelKey: "complaints.cmsDetail.action.markSellerNoResponse",
    toStatus: "SellerNoResponse",
    issueRefund: false,
    allowedFrom: ["Open", "SellerPending", "FixInProgress"],
    defaultNoteKey: "complaints.cmsDetail.note.markSellerNoResponse",
  },
  {
    id: "markSellerRejected",
    labelKey: "complaints.cmsDetail.action.markSellerRejected",
    toStatus: "SellerRejected",
    issueRefund: false,
    allowedFrom: ["SellerPending"],
    defaultNoteKey: "complaints.cmsDetail.note.markSellerRejected",
  },
  {
    id: "confirmSellerAccepted",
    labelKey: "complaints.cmsDetail.action.confirmSellerAccepted",
    toStatus: "FixInProgress",
    issueRefund: false,
    allowedFrom: ["SellerPending"],
    defaultNoteKey: "complaints.cmsDetail.note.confirmSellerAccepted",
  },
  {
    id: "confirmSellerSubmittedFix",
    labelKey: "complaints.cmsDetail.action.confirmSellerSubmittedFix",
    toStatus: "FixSubmitted",
    issueRefund: false,
    allowedFrom: ["FixInProgress"],
    defaultNoteKey: "complaints.cmsDetail.note.confirmSellerSubmittedFix",
  },
  {
    id: "moveToBuyerVerify",
    labelKey: "complaints.cmsDetail.action.moveToBuyerVerify",
    toStatus: "Verified",
    issueRefund: false,
    allowedFrom: ["FixSubmitted"],
    defaultNoteKey: "complaints.cmsDetail.note.moveToBuyerVerify",
  },
  {
    id: "resolveRefund",
    labelKey: "complaints.cmsDetail.action.resolveRefund",
    toStatus: "ResolvedRefund",
    issueRefund: true,
    allowedFrom: ["Verified", "SellerRejected", "SellerNoResponse"],
    defaultNoteKey: "complaints.cmsDetail.note.resolveRefund",
  },
  {
    id: "resolveReject",
    labelKey: "complaints.cmsDetail.action.resolveReject",
    toStatus: "ResolvedReject",
    issueRefund: false,
    allowedFrom: ["Verified", "SellerRejected", "SellerNoResponse"],
    defaultNoteKey: "complaints.cmsDetail.note.resolveReject",
  },
  {
    id: "closeTicket",
    labelKey: "complaints.cmsDetail.action.closeTicket",
    toStatus: "Closed",
    issueRefund: false,
    allowedFrom: ["ResolvedRefund", "ResolvedReject"],
    defaultNoteKey: "complaints.cmsDetail.note.closeTicket",
  },
];

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

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewableImageAttachment(fileName?: string | null, mimeType?: string | null) {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName ?? "");
}

function getUid5(value: string) {
  return (value || "").replace(/-/g, "").slice(0, 5);
}

function formatContextType(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function parseContextDataJson(raw?: string | null) {
  if (!raw) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {} as Record<string, string>;
    const asStringRecord: Record<string, string> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        asStringRecord[key] = value.trim();
      }
    });
    return asStringRecord;
  } catch {
    return {} as Record<string, string>;
  }
}

export default function ComplaintDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState<ComplaintDetail | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [cmsSelfId, setCmsSelfId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [messageContent, setMessageContent] = useState("");
  const [messageError, setMessageError] = useState("");
  const [messageSubmitting, setMessageSubmitting] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
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
      else setError(res.data.message || t("complaints.cmsDetail.error.load"));
    } catch {
      setError(t("complaints.cmsDetail.error.load"));
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
      const senderPartyByUserId = new Map<string, string>();
      detail.messages.forEach((message) => {
        const party = (message.senderParty ?? "").trim();
        if (message.senderId && party) {
          senderPartyByUserId.set(message.senderId, party.toLowerCase());
        }
      });

      async function resolveUser(userId: string) {
        const byId = await cmsUsersApi.getUserById(userId).catch(() => null);
        const byIdUser = byId?.data?.data;
        if (byIdUser?.id) {
          return byIdUser;
        }

        const bySearch = await cmsUsersApi
          .getUsers({ page: 1, pageSize: 20, search: userId })
          .catch(() => null);
        const exactUser = bySearch?.data?.items?.find((u) => u.id === userId);
        if (exactUser?.id) {
          return exactUser;
        }

        return null;
      }

      const selfRes = await cmsAuthApi.getProfile().catch(() => null);
      const selfProfile = selfRes?.data?.data;
      if (selfProfile?.userId) {
        setCmsSelfId(selfProfile.userId);
        next[selfProfile.userId] = {
          name: buildDisplayName(
            selfProfile.firstName,
            selfProfile.lastName,
            selfProfile.email,
            t("complaints.cmsDetail.supportAgent"),
          ),
          avatarPath: selfProfile.avatarPath ?? null,
        };
      }

      const userResults = await Promise.allSettled(userIds.map((userId) => resolveUser(userId)));
      userResults.forEach((result) => {
        if (result.status !== "fulfilled") return;
        const user = result.value;
        if (!user?.id) return;
        next[user.id] = {
          name: buildDisplayName(user.firstName, user.lastName, user.email, t("complaints.cmsDetail.user")),
          avatarPath: user.avatarPath ?? null,
        };
      });

      // Keep chat labels informative even when some user profiles cannot be resolved.
      userIds.forEach((userId) => {
        if (next[userId]) return;
        const senderParty = senderPartyByUserId.get(userId);
        const isBuyer =
          senderParty === "buyer" ||
          userId === detail.userId ||
          (detail.buyerUserId ? userId === detail.buyerUserId : false);
        const isSeller =
          senderParty === "seller" ||
          (detail.sellerUserId ? userId === detail.sellerUserId : false);
        next[userId] = {
          name:
            isBuyer
              ? t("complaints.cmsDetail.customerWithId").replace("{id}", getUid5(userId))
              : isSeller
                ? t("complaints.cmsDetail.sellerWithId").replace("{id}", getUid5(userId))
                : t("complaints.cmsDetail.userWithId").replace("{id}", getUid5(userId)),
          avatarPath: null,
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
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  async function submitStatusChange(action: CmsStatusAction) {
    if (!id || !data) return;
    try {
      setStatusSubmitting(true);
      setError("");
      const note = statusNote.trim() || t(action.defaultNoteKey);
      const res = await cmsComplaintsApi.changeStatus(id, {
        toStatus: COMPLAINT_STATUS_VALUE_TO_CODE[action.toStatus],
        note,
        issueRefund: action.issueRefund,
      });
      if (!res.data.isSuccess) {
        const msg = res.data.message || t("complaints.cmsDetail.error.updateStatus");
        setError(msg);
        showToast("error", msg);
        return;
      }
      setStatusNote("");
      const statusText = t(`complaints.status.${action.toStatus}`);
      showToast(
        "success",
        t("complaints.cmsDetail.toast.statusUpdated").replace(
          "{status}",
          statusText === `complaints.status.${action.toStatus}` ? action.toStatus : statusText,
        ),
      );
      await fetchDetail();
    } catch (err) {
      if (isAxiosError(err)) {
        const payload = err.response?.data as
          | { message?: string; errorCode?: string }
          | undefined;
        const statusCode = err.response?.status;
        let msg = payload?.message || t("complaints.cmsDetail.error.updateStatus");

        if (statusCode === 401) msg = t("complaints.cmsDetail.error.unauthorized");
        else if (statusCode === 403) msg = t("complaints.cmsDetail.error.forbidden");
        else if (statusCode === 404) msg = t("complaints.cmsDetail.error.notFound");
        else if (statusCode === 400 && payload?.errorCode === "ValidationFailed") {
          msg = payload?.message || t("complaints.cmsDetail.error.invalidTransition");
        }

        setError(msg);
        showToast("error", msg);
        return;
      }
      setError(t("complaints.cmsDetail.error.updateStatus"));
      showToast("error", t("complaints.cmsDetail.error.updateStatus"));
    } finally {
      setStatusSubmitting(false);
    }
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
        const msg = res.data.message || t("complaints.cmsDetail.error.sendMessage");
        setMessageError(msg);
        showToast("error", msg);
        return;
      }
      setMessageContent("");
      setIsInternal(false);
      showToast("success", t("complaints.cmsDetail.toast.messageSent"));
      await fetchDetail();
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    } catch {
      setMessageError(t("complaints.cmsDetail.error.sendMessage"));
      showToast("error", t("complaints.cmsDetail.error.sendMessage"));
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

  if (loading && !data) return <div style={{ padding: 24 }}>{t("complaints.detail.loading")}</div>;
  if (error) return <div style={{ color: "var(--danger)", padding: 24 }}>{error}</div>;
  if (!data) return <div style={{ padding: 24 }}>{t("complaints.detail.noComplaint")}</div>;
  const currentStatus = data.complaintStatus;
  const availableActions = CMS_STATUS_ACTIONS.filter((action) =>
    action.allowedFrom.includes(currentStatus),
  );
  const customerName =
    participants[data.userId]?.name ?? t("complaints.cmsDetail.customerWithId").replace("{id}", getUid5(data.userId));
  const contextData = parseContextDataJson(data.contextDataJson);
  const linkedOrderType = (data.contextResolved?.linkedOrder?.paymentTargetType ?? "").trim().toLowerCase();
  const normalizedContextType = ((data.contextType ?? linkedOrderType) || "").trim().toLowerCase();

  const gameContextId =
    normalizedContextType === "map" || normalizedContextType === "game"
      ? (data.contextId ||
        contextData.GameId ||
        contextData.gameId ||
        contextData.MapId ||
        contextData.mapId ||
        data.contextResolved?.linkedOrder?.paymentTargetId ||
        data.contextResolved?.referenceCode ||
        "")
      : "";
  const packageContextId =
    normalizedContextType === "package"
      ? (data.contextId ||
        contextData.PackageId ||
        contextData.packageId ||
        data.contextResolved?.linkedOrder?.paymentTargetId ||
        data.contextResolved?.referenceCode ||
        "")
      : "";

  const contextAction = gameContextId
    ? {
      label: t("complaints.cmsDetail.reportedGame"),
      title: t("complaints.cmsDetail.openReportedGameTitle"),
      cta: t("complaints.cmsDetail.openGameCta").replace("{id}", gameContextId.slice(0, 8)),
      link: `/cms/games?gameId=${encodeURIComponent(gameContextId)}`,
    }
    : packageContextId
      ? {
        label: t("complaints.cmsDetail.reportedPackage"),
        title: t("complaints.cmsDetail.openReportedPackageTitle"),
        cta: t("complaints.cmsDetail.openPackageCta").replace("{id}", packageContextId.slice(0, 8)),
        link: `/cms/packages?packageId=${encodeURIComponent(packageContextId)}`,
      }
      : null;
  const reportedAbout = data.contextResolved?.displayTitle?.trim() || data.subject;
  const reportedAboutSub = data.contextResolved?.displaySubtitle?.trim() || "";
  const issueType = formatContextType(data.contextType) || data.category;
  const issueReference =
    data.contextResolved?.referenceCode?.trim() ||
    data.contextKey?.trim() ||
    (data.contextId ? `#${data.contextId.slice(0, 8)}` : "");
  const formatHistoryActor = (changedBy: string) => {
    const actorName = participants[changedBy]?.name ?? t("complaints.cmsDetail.user");
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
            aria-label={t("complaints.closeToast")}
          >
            ×
          </button>
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
              ← {t("complaints.detail.backToComplaints")}
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
                {t("complaints.cmsDetail.ticketLabel")} #{data.id.slice(0, 8)} - {data.subject}
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
              <span>{t("complaints.detail.by")}: {customerName}</span>
            </div>
          </div>

          <h3 style={{ margin: "14px 0 8px 0", fontSize: 15 }}>{t("complaints.detail.conversation")}</h3>
          <div
            ref={threadRef}
            style={{ maxHeight: 430, overflowY: "auto", paddingRight: 2, borderTop: "1px solid var(--border)" }}
          >
            <div style={{ display: "grid", gap: 0 }}>
              {orderedMessages.length === 0 ? (
                <div style={{ color: "var(--text-2)", padding: "14px 0" }}>{t("complaints.detail.noMessages")}</div>
              ) : (
                orderedMessages.map((msg) => {
                  const senderParty = (msg.senderParty ?? "").trim().toLowerCase();
                  const isBuyerMessage =
                    senderParty === "buyer" ||
                    msg.senderId === data.userId ||
                    (data.buyerUserId ? msg.senderId === data.buyerUserId : false);
                  const isSellerMessage =
                    senderParty === "seller" ||
                    (data.sellerUserId ? msg.senderId === data.sellerUserId : false);
                  const isCmsMessage = cmsSelfId
                    ? msg.senderId === cmsSelfId
                    : !(isBuyerMessage || isSellerMessage);
                  const fallbackByParty = isBuyerMessage
                    ? t("complaints.cmsDetail.customerWithId").replace("{id}", getUid5(msg.senderId))
                    : isSellerMessage
                      ? t("complaints.cmsDetail.sellerWithId").replace("{id}", getUid5(msg.senderId))
                      : t("complaints.cmsDetail.userWithId").replace("{id}", getUid5(msg.senderId));
                  const displayName =
                    participants[msg.senderId]?.name ??
                    (isCmsMessage ? t("complaints.cmsDetail.supportAgent") : fallbackByParty);
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
                              {displayName}{isInternalNote ? ` (${t("complaints.cmsDetail.internalTag")})` : ""}
                            </strong>
                            <span style={{ whiteSpace: "nowrap", lineHeight: 1.2 }}>{formatMessageTime(msg.createdAt)}</span>
                          </div>
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45, fontSize: 13 }}>
                            {msg.content}
                          </div>
                          {msg.attachments?.length ? (
                            <div
                              style={{
                                marginTop: 8,
                                display: "grid",
                                gap: 6,
                                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                              }}
                            >
                              {msg.attachments
                                .slice()
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((attachment) => {
                                  const isImage = isPreviewableImageAttachment(
                                    attachment.fileName,
                                    attachment.mimeType,
                                  );
                                  const cardBg = isCmsMessage ? "rgba(255,255,255,0.15)" : "var(--surface)";
                                  const borderColor = isCmsMessage ? "rgba(255,255,255,0.35)" : "var(--border)";

                                  return (
                                    <a
                                      key={attachment.id}
                                      href={attachment.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={t("complaints.cmsDetail.openAttachment")}
                                      style={{
                                        textDecoration: "none",
                                        color: isCmsMessage ? "#fff" : "var(--text)",
                                        border: `1px solid ${borderColor}`,
                                        borderRadius: 10,
                                        overflow: "hidden",
                                        background: cardBg,
                                        display: "grid",
                                      }}
                                    >
                                      <div
                                        style={{
                                          aspectRatio: "16 / 10",
                                          background: isCmsMessage ? "rgba(255,255,255,0.08)" : "var(--bg)",
                                          display: "grid",
                                          placeItems: "center",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {isImage ? (
                                          <img
                                            src={attachment.url}
                                            alt={attachment.fileName}
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                          />
                                        ) : (
                                          <span style={{ fontSize: 12, opacity: 0.9 }}>
                                            {t("complaints.cmsDetail.openAttachment")}
                                          </span>
                                        )}
                                      </div>
                                      <div style={{ padding: 8, display: "grid", gap: 2 }}>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            wordBreak: "break-word",
                                            lineHeight: 1.35,
                                          }}
                                        >
                                          {attachment.fileName}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color: isCmsMessage ? "rgba(255,255,255,0.86)" : "var(--text-2)",
                                          }}
                                        >
                                          {formatFileSize(attachment.sizeBytes)}
                                        </div>
                                      </div>
                                    </a>
                                  );
                                })}
                            </div>
                          ) : null}
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
                placeholder={t("complaints.detail.replyPlaceholder")}
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
                aria-label={messageSubmitting ? t("complaints.detail.sending") : t("complaints.detail.send")}
                title={t("complaints.detail.sendShortcut")}
              >
                <SendHorizontal size={16} />
              </button>
            </div>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--text-2)" }}>
              <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
              {t("complaints.cmsDetail.internalNote")}
            </label>
            {messageError ? <div style={{ color: "var(--danger)", fontSize: 12 }}>{messageError}</div> : null}
            {messageSubmitting ? (
              <div style={{ color: "var(--text-2)", fontSize: 12 }}>{t("complaints.detail.sending")}</div>
            ) : null}
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
              <div><strong>{t("complaints.detail.customer")}:</strong> {customerName}</div>
              <div><strong>{t("complaints.table.ticketId")}:</strong> #{data.id.slice(0, 8)}</div>
              <div><strong>{t("complaints.category")}:</strong> {data.category}</div>
              <div>
                <strong>{t("complaints.cmsDetail.reportedAbout")}:</strong>
                <div
                  style={{
                    marginTop: 6,
                    color: "var(--text)",
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                    fontWeight: 600,
                  }}
                >
                  {reportedAbout}
                </div>
                {reportedAboutSub ? (
                  <div
                    style={{
                      marginTop: 4,
                      color: "var(--text-2)",
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}
                  >
                    {reportedAboutSub}
                  </div>
                ) : null}
              </div>
              <div><strong>{t("complaints.cmsDetail.issueType")}:</strong> {issueType}</div>
              {issueReference ? <div><strong>{t("complaints.cmsDetail.reference")}:</strong> {issueReference}</div> : null}
              {contextAction ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong>{contextAction.label}:</strong>
                  <button
                    type="button"
                    onClick={() => navigate(contextAction.link)}
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title={contextAction.title}
                  >
                    {contextAction.cta}
                  </button>
                </div>
              ) : null}
              <div><strong>{t("complaints.detail.created")}:</strong> {new Date(data.createdAt).toLocaleDateString()}</div>
              <div><strong>{t("complaints.table.status")}:</strong> <ComplaintStatusBadge status={currentStatus} /></div>
              <div>
                <strong>{t("complaints.cmsDetail.issueDetails")}:</strong>
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
              {data.resolvedAt ? (
                <div><strong>{t("complaints.detail.resolved")}:</strong> {new Date(data.resolvedAt).toLocaleString()}</div>
              ) : null}
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
            <div style={{ fontWeight: 700, marginBottom: 10 }}>{t("complaints.cmsDetail.statusActions")}</div>
            <div style={{ display: "grid", gap: 8 }}>
              <textarea
                placeholder={t("complaints.cmsDetail.actionNotePlaceholder")}
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

              {availableActions.length === 0 ? (
                <div style={{ color: "var(--text-2)", fontSize: 13 }}>
                  {t("complaints.cmsDetail.noValidActions")}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {availableActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => void submitStatusChange(action)}
                      disabled={statusSubmitting}
                      style={{
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 14px",
                        background:
                          action.toStatus === "ResolvedRefund"
                            ? "#16a34a"
                            : action.toStatus === "ResolvedReject" || action.toStatus === "SellerNoResponse"
                              ? "#dc2626"
                              : "var(--primary)",
                        color: "white",
                        fontWeight: 600,
                        cursor: statusSubmitting ? "not-allowed" : "pointer",
                        opacity: statusSubmitting ? 0.7 : 1,
                        textAlign: "left",
                      }}
                    >
                      {statusSubmitting
                        ? t("complaints.cmsDetail.actionUpdating")
                        : `${t(action.labelKey)} -> ${t(`complaints.status.${action.toStatus}`)}`}
                    </button>
                  ))}
                </div>
              )}
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
            <ComplaintTimeline histories={data.statusHistories} formatChangedBy={formatHistoryActor} />
          </section>
        </div>
      </div>
    </div>
  );
}
