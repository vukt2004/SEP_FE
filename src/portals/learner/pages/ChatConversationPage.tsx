import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { learnerChatApi } from "@/services/api/learner/chat.api.ts";
import type { ChatConversation, ChatConversationMember, ChatMessage } from "@/types/api/learner/chat";
import { ROUTES } from "@/lib/constants/routes";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./ChatConversationPage.module.css";

const CONVERSATIONS_PAGE_SIZE = 20;
const MESSAGES_PAGE_SIZE = 50;

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
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

function getOtherMemberById(conversation: ChatConversation, userId: string | null) {
  if (!userId) return null;
  return conversation.members.find((m) => m.userId === userId) ?? null;
}

function getConversationDisplayName(
  conversation: ChatConversation,
  preferredOtherUserId: string | null,
  preferredOtherUserName: string | null,
  locale: string,
) {
  if (conversation.name?.trim()) return conversation.name.trim();

  const exact = getOtherMemberById(conversation, preferredOtherUserId);
  if (exact?.userName?.trim()) return exact.userName.trim();

  if (preferredOtherUserName?.trim()) return preferredOtherUserName.trim();

  const names = conversation.members
    .map((m) => m.userName?.trim())
    .filter((name): name is string => Boolean(name));

  if (names.length === 1) return names[0];
  if (names.length > 1) return names.join(", ");
  return locale.startsWith("vi") ? "Chat riêng" : "Private chat";
}

export default function ChatConversationPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const preferredOtherUserId = searchParams.get("otherUserId");
  const preferredOtherUserName = searchParams.get("otherUserName");

  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = useMemo(
    () => getCurrentLearnerUserId(tokenStorage.getLearnerToken()),
    [],
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;
    const loadConversations = async () => {
      try {
        setLoadingConversations(true);
        const res = await learnerChatApi.getConversations({
          pageNumber: 1,
          pageSize: CONVERSATIONS_PAGE_SIZE,
          PageNumber: 1,
          PageSize: CONVERSATIONS_PAGE_SIZE,
        });
        if (cancelled) return;
        if (res.data.isSuccess && Array.isArray(res.data.data?.items)) {
          setConversations(res.data.data.items);
          return;
        }
        setConversations([]);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setConversations([]);
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };

    void loadConversations();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const fetchMessages = useCallback(
    async (silent: boolean) => {
      if (!conversationId?.trim()) {
        setError(null);
        setLoadingMessages(false);
        setMessages([]);
        return;
      }

      try {
        if (!silent) setLoadingMessages(true);
        if (!silent) setError(null);

        const res = await learnerChatApi.getConversationMessages(conversationId, {
          pageNumber: 1,
          pageSize: MESSAGES_PAGE_SIZE,
          PageNumber: 1,
          PageSize: MESSAGES_PAGE_SIZE,
        });

        if (!res.data.isSuccess || !Array.isArray(res.data.data?.items)) {
          if (!silent) {
            setError(
              res.data.message ||
                (locale.startsWith("vi")
                  ? "Không thể tải tin nhắn cuộc trò chuyện."
                  : "Unable to load conversation messages."),
            );
            setMessages([]);
          }
          return;
        }

        const sorted = [...res.data.data.items].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        setMessages(sorted);
      } catch (err) {
        console.error(err);
        if (!silent) {
          setError(
            locale.startsWith("vi")
              ? "Có lỗi khi tải tin nhắn cuộc trò chuyện."
              : "An error occurred while loading messages.",
          );
          setMessages([]);
        }
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [conversationId, locale],
  );

  useEffect(() => {
    void fetchMessages(false);
  }, [fetchMessages]);

  useEffect(() => {
    if (!conversationId?.trim()) return;
    const intervalId = window.setInterval(() => {
      void fetchMessages(true);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [conversationId, fetchMessages]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversations, conversationId],
  );

  const conversationTitle = useMemo(() => {
    if (activeConversation) {
      return getConversationDisplayName(
        activeConversation,
        preferredOtherUserId,
        preferredOtherUserName,
        locale,
      );
    }
    return (
      preferredOtherUserName?.trim() ||
      (locale.startsWith("vi") ? "Cuộc trò chuyện" : "Conversations")
    );
  }, [activeConversation, locale, preferredOtherUserId, preferredOtherUserName]);

  const openConversation = (conversation: ChatConversation) => {
    const otherMember: ChatConversationMember | null =
      getOtherMemberById(conversation, preferredOtherUserId) ?? conversation.members[0] ?? null;

    const query = new URLSearchParams();
    if (otherMember?.userId) query.set("otherUserId", otherMember.userId);
    if (otherMember?.userName) query.set("otherUserName", otherMember.userName);

    const next = ROUTES.LEARNER_CHAT_CONVERSATION(conversation.id);
    navigate(query.toString() ? `${next}?${query.toString()}` : next);
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!conversationId || !content || sending) return;

    try {
      setSending(true);
      const res = await learnerChatApi.sendConversationMessage(conversationId, {
        request: {
          chatRoomId: conversationId,
          content,
          messageType: 0,
        },
      });

      if (!res.data.isSuccess || !res.data.data) {
        alert(
          res.data.message ||
            (locale.startsWith("vi") ? "Không thể gửi tin nhắn." : "Unable to send message."),
        );
        return;
      }

      const createdMessage = res.data.data;
      setMessages((prev) => [...prev, createdMessage]);
      setDraft("");
    } catch (err) {
      console.error(err);
      alert(
        locale.startsWith("vi")
          ? "Có lỗi khi gửi tin nhắn."
          : "An error occurred while sending message.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> {t("back")}
        </button>

        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            <MessageCircle size={22} /> {conversationTitle}
          </h1>
        </div>

        <div className={styles.chatLayout}>
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>
              {locale.startsWith("vi") ? "Cuộc trò chuyện" : "Conversations"}
            </h2>
            {loadingConversations ? (
              <p className={styles.stateText}>{t("loadingMapDetails")}</p>
            ) : conversations.length === 0 ? (
              <p className={styles.stateText}>
                {locale.startsWith("vi") ? "Chưa có cuộc trò chuyện." : "No conversations yet."}
              </p>
            ) : (
              <div className={styles.conversationList}>
                {conversations.map((item) => {
                  const name = getConversationDisplayName(
                    item,
                    preferredOtherUserId,
                    preferredOtherUserName,
                    locale,
                  );
                  const snippet = item.lastMessage?.content?.trim();
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.conversationItem} ${
                        item.id === conversationId ? styles.conversationItemActive : ""
                      }`}
                      onClick={() => openConversation(item)}
                    >
                      <span className={styles.conversationName}>{name}</span>
                      <span className={styles.conversationSnippet}>
                        {snippet ||
                          (locale.startsWith("vi")
                            ? "Chưa có tin nhắn"
                            : "No messages yet")}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className={styles.chatPanel}>
            <header className={styles.chatHeader}>
              <h3 className={styles.chatName}>{conversationTitle}</h3>
            </header>

            <div className={styles.messagesWrap}>
              {!conversationId ? (
                <p className={styles.stateText}>
                  {locale.startsWith("vi")
                    ? "Chọn một cuộc trò chuyện ở danh sách bên trái để bắt đầu."
                    : "Select a conversation from the left list to start."}
                </p>
              ) : loadingMessages ? (
                <p className={styles.stateText}>{t("loadingMapDetails")}</p>
              ) : error ? (
                <p className={styles.errorText}>{error}</p>
              ) : messages.length === 0 ? (
                <p className={styles.stateText}>
                  {locale.startsWith("vi")
                    ? "Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện."
                    : "No messages yet. Start the conversation."}
                </p>
              ) : (
                messages.map((m) => {
                  const isOwn = currentUserId
                    ? m.senderId.toLowerCase() === currentUserId.toLowerCase()
                    : preferredOtherUserId
                      ? m.senderId.toLowerCase() !== preferredOtherUserId.toLowerCase()
                      : false;
                  return (
                  <div
                    key={m.id}
                    className={`${styles.messageItem} ${isOwn ? styles.messageItemOwn : ""}`}
                  >
                    <div className={`${styles.messageMeta} ${isOwn ? styles.messageMetaOwn : ""}`}>
                      <span>{m.senderName}</span>
                      <span>{formatDateTime(m.createdAt)}</span>
                    </div>
                    <div
                      className={`${styles.messageBubble} ${isOwn ? styles.messageBubbleOwn : ""}`}
                    >
                      {m.content}
                    </div>
                  </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            <form className={styles.composer} onSubmit={handleSendMessage}>
              <input
                type="text"
                className={styles.composerInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={locale.startsWith("vi") ? "Nhập tin nhắn..." : "Type a message..."}
                maxLength={5000}
                disabled={!conversationId}
              />
              <button
                type="submit"
                className={styles.composerBtn}
                disabled={!conversationId || sending || !draft.trim()}
              >
                <Send size={16} /> {sending ? (locale.startsWith("vi") ? "Đang gửi" : "Sending") : (locale.startsWith("vi") ? "Gửi" : "Send")}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
