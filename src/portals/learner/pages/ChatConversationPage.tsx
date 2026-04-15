import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import {
  BellOff,
  Edit2,
  Image as ImageIcon,
  Info,
  Languages,
  MessageCircle,
  Mic,
  Moon,
  MoreHorizontal,
  Phone,
  Reply,
  Search,
  Send,
  Smile,
  Sun,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  HubConnection,
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from "@microsoft/signalr";
import { learnerChatApi } from "@/services/api/learner/chat.api.ts";
import type { ChatUserItem } from "@/services/api/learner/chat.api.ts";
import type {
  ChatConversation,
  ChatConversationMember,
  ChatMessage,
} from "@/types/api/learner/chat";
import { ROUTES } from "@/lib/constants/routes";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import { useTranslation } from "@/lib/i18n/translations";
import { useLanguageStore } from "@/stores/language.store";
import { useThemeStore } from "@/stores/theme.store";
import styles from "./ChatConversationPage.module.css";

// ── Constants ────────────────────────────────────────────────────────────────
const CONVERSATIONS_PAGE_SIZE = 30;
const MESSAGES_PAGE_SIZE = 50;

type FilterTab = "all" | "unread" | "group";

const COMMON_EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "🤣",
  "😂",
  "🙂",
  "😊",
  "😇",
  "🥰",
  "😍",
  "🤩",
  "😘",
  "☺️",
  "😚",
  "😙",
  "🥲",
  "😋",
  "😛",
  "😜",
  "🤪",
  "😝",
  "🤑",
  "🤗",
  "🤔",
  "🤫",
  "🤭",
  "😐",
  "😑",
  "😶",
  "😏",
  "😒",
  "🙄",
  "😬",
  "🤥",
  "😌",
  "😔",
  "😪",
  "👋",
  "🤚",
  "✋",
  "👌",
  "✌️",
  "🤞",
  "👍",
  "👎",
  "✊",
  "🤝",
  "🙏",
  "❤️",
  "🔥",
  "⭐",
  "🎉",
  "🎊",
  "💯",
  "🚀",
  "😭",
  "🥺",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function resolveChatLocale(locale: string | undefined): string {
  return locale?.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
}

function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(resolveChatLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatConversationTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const dateLocale = resolveChatLocale(locale);
  const now = new Date();
  if (now.toDateString() === d.toDateString())
    return d.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) return d.toLocaleDateString(dateLocale, { weekday: "short" });
  return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
}

function getInitials(name: string | null | undefined): string {
  const safe = (name ?? "").trim();
  if (!safe) return "?";
  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getUserDisplayName(u: ChatUserItem): string {
  const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return full || u.userName || u.email || "Unknown";
}

function getCurrentUserId(token: string | null | undefined): string | null {
  if (!token) return null;
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
    const keys = [
      "sub",
      "nameid",
      "uid",
      "userId",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
    ];
    for (const k of keys) {
      const v = payload[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  } catch {
    return null;
  }
}

function getCounterpart(
  conv: ChatConversation,
  currentUserId: string | null,
  fallbackOtherId: string | null,
): ChatConversationMember | null {
  const norm = currentUserId?.toLowerCase() ?? "";
  if (norm) {
    const m = conv.members.find((m) => m.userId.toLowerCase() !== norm);
    if (m) return m;
  }
  if (fallbackOtherId) {
    const m = conv.members.find((m) => m.userId.toLowerCase() === fallbackOtherId.toLowerCase());
    if (m) return m;
  }
  return conv.members[0] ?? null;
}

function getConversationDisplayName(
  conv: ChatConversation,
  currentUserId: string | null,
  fallbackOtherId: string | null,
  fallbackName: string | null,
  fallbackConversationName: string,
): string {
  if (conv.name?.trim()) return conv.name.trim();
  const cp = getCounterpart(conv, currentUserId, fallbackOtherId);
  if (cp?.userName?.trim()) return cp.userName.trim();
  if (fallbackName?.trim()) return fallbackName.trim();
  return fallbackConversationName;
}

function isGroupStart(messages: ChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = messages[index];
  const prev = messages[index - 1];
  if (curr.senderId !== prev.senderId) return true;
  const gap = new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
  return gap > 5 * 60 * 1000;
}

function isGroupEnd(messages: ChatMessage[], index: number): boolean {
  if (index === messages.length - 1) return true;
  const curr = messages[index];
  const next = messages[index + 1];
  if (curr.senderId !== next.senderId) return true;
  const gap = new Date(next.createdAt).getTime() - new Date(curr.createdAt).getTime();
  return gap > 5 * 60 * 1000;
}

// ── Sub-components ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <span className={styles.typingDots}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </span>
  );
}

function EmojiPickerPanel({
  onPick,
  onClose,
}: {
  onPick: (e: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div ref={ref} className={styles.emojiPicker}>
      {COMMON_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className={styles.emojiBtn}
          onClick={() => {
            onPick(emoji);
            onClose();
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ImageLightbox({
  url,
  onClose,
  closeLabel,
}: {
  url: string;
  onClose: () => void;
  closeLabel: string;
}) {
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose} aria-label={closeLabel}>
        <X size={22} />
      </button>
      <img
        className={styles.lightboxImg}
        src={url}
        alt="Full size"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function NewChatModal({
  onClose,
  onSelect,
  copy,
}: {
  onClose: () => void;
  onSelect: (userId: string, userName: string) => void;
  copy: {
    title: string;
    close: string;
    searchUsersPlaceholder: string;
    searchingUsers: string;
    noUsersFound: string;
    typeNameToSearch: string;
  };
}) {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<ChatUserItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const res = await learnerChatApi.getUsers({ searchTerm: search.trim(), pageSize: 20 });
        setUsers(res.data.data?.items ?? []);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{copy.title}</h3>
          <button className={styles.modalCloseBtn} onClick={onClose} aria-label={copy.close}>
            <X size={18} />
          </button>
        </div>
        <label className={styles.modalSearch}>
          <Search size={14} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={copy.searchUsersPlaceholder}
            className={styles.modalSearchInput}
          />
        </label>
        <div className={styles.modalUserList}>
          {loading && <p className={styles.modalStateText}>{copy.searchingUsers}</p>}
          {!loading && search.trim() && users.length === 0 && (
            <p className={styles.modalStateText}>{copy.noUsersFound}</p>
          )}
          {!loading && !search.trim() && (
            <p className={styles.modalStateText}>{copy.typeNameToSearch}</p>
          )}
          {users.map((u) => {
            const name = getUserDisplayName(u);
            return (
              <button
                key={u.id}
                className={styles.modalUserItem}
                onClick={() => onSelect(u.id, name)}
              >
                <span className={styles.modalUserAvatar}>{getInitials(name)}</span>
                <div>
                  <div className={styles.modalUserName}>{name}</div>
                  {u.email && <div className={styles.modalUserEmail}>{u.email}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ChatConversationPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const preferredOtherUserId = searchParams.get("otherUserId");
  const preferredOtherUserName = searchParams.get("otherUserName");
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const isVi = locale.startsWith("vi");
  const text = useMemo(
    () =>
      isVi
        ? {
            conversationFallback: "Cuộc trò chuyện",
            cannotLoadMessages: "Không thể tải tin nhắn.",
            loadMessagesError: "Lỗi tải tin nhắn.",
            cannotSendMessage: "Không thể gửi tin nhắn.",
            sendMessageError: "Lỗi gửi tin nhắn.",
            invalidImageType: "Chỉ chấp nhận PNG, JPG, GIF, WEBP.",
            imageTooLarge: "Ảnh không được vượt quá 10MB.",
            cannotCreateConversation: "Không thể tạo cuộc trò chuyện.",
            confirmDeleteMessage: "Xoá tin nhắn này?",
            deleteMessageError: "Lỗi xoá tin nhắn.",
            sidebarTitle: "Đoạn chat",
            options: "Tuỳ chọn",
            newConversation: "Cuộc trò chuyện mới",
            searchInMessenger: "Tìm kiếm trên Messenger",
            tabAll: "Tất cả",
            tabUnread: "Chưa đọc",
            tabGroup: "Nhóm",
            loading: "Đang tải...",
            notFound: "Không tìm thấy.",
            noUnreadMessages: "Không có tin nhắn chưa đọc.",
            noConversations: "Chưa có cuộc trò chuyện.",
            deletedSnippet: "(Tin nhắn đã bị xoá)",
            imageSnippet: "📷 Ảnh",
            startConversation: "Bắt đầu cuộc trò chuyện",
            activeNow: "Đang hoạt động",
            callVoice: "Gọi điện",
            callVideo: "Gọi video",
            info: "Thông tin",
            selectConversationToStart: "Chọn một cuộc trò chuyện để bắt đầu nhắn tin",
            loadingMessages: "Đang tải tin nhắn...",
            youRevokedMessage: "Bạn đã thu hồi một tin nhắn",
            messageDeleted: "Tin nhắn đã bị xoá",
            reply: "Trả lời",
            delete: "Xoá",
            edited: "Đã chỉnh sửa",
            you: "Bạn",
            cancelReply: "Huỷ trả lời",
            emoji: "Emoji",
            sendImage: "Gửi ảnh",
            voice: "Ghi âm",
            send: "Gửi",
            unmute: "Bật lại",
            search: "Tìm kiếm",
            membersInChat: "Thành viên trong đoạn chat",
            youTag: "Bạn",
            mediaFiles: "File phương tiện",
            close: "Đóng",
            imageAlt: "hinh",
            newChatTitle: "Cuộc trò chuyện mới",
            searchUsersPlaceholder: "Tìm kiếm người dùng...",
            searchingUsers: "Đang tìm...",
            noUsersFound: "Không tìm thấy người dùng.",
            typeNameToSearch: "Nhập tên để tìm người dùng.",
          }
        : {
            conversationFallback: "Conversation",
            cannotLoadMessages: "Could not load messages.",
            loadMessagesError: "Failed to load messages.",
            cannotSendMessage: "Could not send message.",
            sendMessageError: "Failed to send message.",
            invalidImageType: "Only PNG, JPG, GIF, WEBP are accepted.",
            imageTooLarge: "Image must be smaller than 10MB.",
            cannotCreateConversation: "Could not create conversation.",
            confirmDeleteMessage: "Delete this message?",
            deleteMessageError: "Failed to delete message.",
            sidebarTitle: "Chats",
            options: "Options",
            newConversation: "New conversation",
            searchInMessenger: "Search in Messenger",
            tabAll: "All",
            tabUnread: "Unread",
            tabGroup: "Groups",
            loading: "Loading...",
            notFound: "No results found.",
            noUnreadMessages: "No unread messages.",
            noConversations: "No conversations yet.",
            deletedSnippet: "(Message deleted)",
            imageSnippet: "📷 Photo",
            startConversation: "Start a conversation",
            activeNow: "Active now",
            callVoice: "Voice call",
            callVideo: "Video call",
            info: "Info",
            selectConversationToStart: "Select a conversation to start chatting",
            loadingMessages: "Loading messages...",
            youRevokedMessage: "You unsent a message",
            messageDeleted: "Message deleted",
            reply: "Reply",
            delete: "Delete",
            edited: "Edited",
            you: "You",
            cancelReply: "Cancel reply",
            emoji: "Emoji",
            sendImage: "Send image",
            voice: "Voice",
            send: "Send",
            unmute: "Unmute",
            search: "Search",
            membersInChat: "Members in this chat",
            youTag: "You",
            mediaFiles: "Media files",
            close: "Close",
            imageAlt: "image",
            newChatTitle: "New conversation",
            searchUsersPlaceholder: "Search users...",
            searchingUsers: "Searching...",
            noUsersFound: "No users found.",
            typeNameToSearch: "Type a name to search users.",
          },
    [isVi],
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // SignalR
  const [hubConnection, setHubConnection] = useState<HubConnection | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const currentConversationIdRef = useRef<string | undefined>(conversationId);
  const messagesWrapRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = useMemo(() => getCurrentUserId(tokenStorage.getLearnerToken()), []);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    currentConversationIdRef.current = conversationId;
  }, [conversationId]);

  // Clear composer state when switching conversations
  useEffect(() => {
    setReplyTo(null);
    setAttachedImage(null);
    setAttachedImagePreview(null);
    setDraft("");
    setShowEmojiPicker(false);
    setIsTyping(false);
    setError(null);
  }, [conversationId]);

  useEffect(() => {
    const ta = composerRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [draft]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!attachedImage) {
      setAttachedImagePreview(null);
      return;
    }
    const url = URL.createObjectURL(attachedImage);
    setAttachedImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [attachedImage]);

  // ── API ────────────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async (silent: boolean) => {
    if (!silent) setLoadingConversations(true);
    try {
      const res = await learnerChatApi.getConversations({
        pageNumber: 1,
        pageSize: CONVERSATIONS_PAGE_SIZE,
      });
      setConversations(res.data.isSuccess ? (res.data.data?.items ?? []) : []);
    } catch {
      if (!silent) setConversations([]);
    } finally {
      if (!silent) setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations(false);
  }, [loadConversations]);

  // Auto-select the most recent conversation when landing on /app/chat with no conversationId
  useEffect(() => {
    if (conversationId) return; // already on a specific conversation
    if (conversations.length === 0) return; // not loaded yet
    const first = conversations[0];
    const cp = getCounterpart(first, currentUserId, null);
    const q = new URLSearchParams();
    if (cp?.userId) q.set("otherUserId", cp.userId);
    if (cp?.userName) q.set("otherUserName", cp.userName);
    const next = ROUTES.LEARNER_CHAT_CONVERSATION(first.id);
    navigate(q.toString() ? `${next}?${q}` : next, { replace: true });
  }, [conversationId, conversations, currentUserId, navigate]);

  const fetchMessages = useCallback(
    async (silent: boolean, beforeMessageId?: string) => {
      if (!conversationId?.trim()) {
        if (!silent) {
          setMessages([]);
          setLoadingMessages(false);
          setError(null);
        }
        return;
      }
      if (!silent && !beforeMessageId) {
        setLoadingMessages(true);
        setError(null);
      }
      try {
        const res = await learnerChatApi.getConversationMessages(conversationId, {
          pageNumber: 1,
          pageSize: MESSAGES_PAGE_SIZE,
          ...(beforeMessageId ? { beforeMessageId } : {}),
        });
        if (!res.data.isSuccess || !Array.isArray(res.data.data?.items)) {
          if (!silent) setError(res.data.message ?? text.cannotLoadMessages);
          return;
        }
        const sorted = [...res.data.data.items].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        if (beforeMessageId) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id.toLowerCase()));
            const newOnes = sorted.filter((m) => !existingIds.has(m.id.toLowerCase()));
            return [...newOnes, ...prev];
          });
        } else {
          setMessages(sorted);
          if (!silent) void loadConversations(true);
        }
        setHasMore(sorted.length >= MESSAGES_PAGE_SIZE);
      } catch {
        if (!silent) setError(text.loadMessagesError);
      } finally {
        if (!silent && !beforeMessageId) setLoadingMessages(false);
        setLoadingMore(false);
      }
    },
    [conversationId, loadConversations, text.cannotLoadMessages, text.loadMessagesError],
  );

  useEffect(() => {
    void fetchMessages(false);
  }, [fetchMessages]);

  const handleScroll = useCallback(() => {
    const wrap = messagesWrapRef.current;
    if (!wrap || loadingMore || !hasMore || messages.length === 0) return;
    if (wrap.scrollTop < 60) {
      setLoadingMore(true);
      void fetchMessages(true, messages[0].id);
    }
  }, [fetchMessages, hasMore, loadingMore, messages]);

  // ── SignalR ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = tokenStorage.getLearnerToken();
    if (!token) return;

    let base = (import.meta.env.VITE_API_BASE_URL as string) || "";
    if (base.endsWith("/")) base = base.slice(0, -1);

    const connection = new HubConnectionBuilder()
      .withUrl(`${base}/hubs/chat`, {
        accessTokenFactory: () => token,
        transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (message: ChatMessage) => {
      if (message.chatRoomId === currentConversationIdRef.current) {
        setIsTyping(false);
        setMessages((prev) => {
          if (prev.some((m) => m.id.toLowerCase() === message.id.toLowerCase())) return prev;
          return [...prev, message].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      }
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === message.chatRoomId);
        if (idx === -1) {
          void loadConversations(true);
          return prev;
        }
        const isActive = message.chatRoomId === currentConversationIdRef.current;
        const isSelf = !!(
          currentUserId && message.senderId.toLowerCase() === currentUserId.toLowerCase()
        );
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          lastMessage: message,
          lastMessageAt: message.createdAt,
          unreadCount: isActive || isSelf ? 0 : updated[idx].unreadCount + 1,
        };
        const [moved] = updated.splice(idx, 1);
        return [moved, ...updated];
      });
    });

    connection.on(
      "ConversationUpdated",
      // C# backend sends PascalCase; SignalR JS client auto-camelCase but safe to handle both
      (data: {
        conversationId?: string;
        ConversationId?: string;
        lastMessage?: ChatMessage;
        LastMessage?: ChatMessage;
        unreadCount?: number;
        UnreadCount?: number;
      }) => {
        const convId = data.conversationId ?? data.ConversationId ?? "";
        const lastMsg = data.lastMessage ?? data.LastMessage;
        const unread = data.unreadCount ?? data.UnreadCount ?? 0;
        if (!convId || !lastMsg) return;

        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === convId);
          if (idx === -1) {
            void loadConversations(true);
            return prev;
          }
          const isActive = convId === currentConversationIdRef.current;
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: lastMsg,
            lastMessageAt: lastMsg.createdAt,
            // If active conversation: keep 0 unread; otherwise use server count
            unreadCount: isActive ? 0 : unread,
          };
          const [moved] = updated.splice(idx, 1);
          return [moved, ...updated];
        });
      },
    );

    connection.on(
      "UserTyping",
      (data: { userId: string; conversationId: string; isTyping: boolean }) => {
        if (
          data.conversationId === currentConversationIdRef.current &&
          currentUserId &&
          data.userId.toLowerCase() !== currentUserId.toLowerCase()
        ) {
          setIsTyping(data.isTyping);
        }
      },
    );

    connection.on("ConversationClosed", () => {
      void loadConversations(true);
    });

    // On reconnect, refresh conversation list once to catch any missed events
    connection.onreconnected(() => {
      void loadConversations(true);
      // Re-join the active conversation room after reconnect
      const activeId = currentConversationIdRef.current;
      if (activeId) {
        connection.invoke("JoinConversation", activeId).catch(console.error);
      }
    });

    connection
      .start()
      .then(() => setHubConnection(connection))
      .catch(console.error);
    return () => {
      void connection.stop();
    };
  }, [currentUserId, loadConversations]);

  useEffect(() => {
    if (!hubConnection || hubConnection.state !== "Connected") return;
    if (conversationId) {
      hubConnection.invoke("JoinConversation", conversationId).catch(console.error);
    }
    return () => {
      if (conversationId) {
        hubConnection.invoke("LeaveConversation", conversationId).catch(console.error);
        setIsTyping(false);
      }
    };
  }, [conversationId, hubConnection]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId],
  );

  const conversationTitle = useMemo(() => {
    if (activeConversation)
      return getConversationDisplayName(
        activeConversation,
        currentUserId,
        preferredOtherUserId,
        preferredOtherUserName,
        text.conversationFallback,
      );
    return preferredOtherUserName?.trim() || text.conversationFallback;
  }, [
    activeConversation,
    currentUserId,
    preferredOtherUserId,
    preferredOtherUserName,
    text.conversationFallback,
  ]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (filterTab === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filterTab === "group") list = list.filter((c) => c.roomType === 1);
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return list;
    return list.filter((c) => {
      const name = getConversationDisplayName(
        c,
        currentUserId,
        preferredOtherUserId,
        null,
        text.conversationFallback,
      );
      const last = c.lastMessage?.content ?? "";
      return `${name} ${last}`.toLowerCase().includes(kw);
    });
  }, [
    conversations,
    filterTab,
    searchTerm,
    currentUserId,
    preferredOtherUserId,
    text.conversationFallback,
  ]);

  const sharedImages = useMemo(
    () => messages.filter((m) => m.messageType === 1 && m.filePath).slice(-9),
    [messages],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openConversation = (conv: ChatConversation) => {
    const cp = getCounterpart(conv, currentUserId, preferredOtherUserId);
    setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
    const q = new URLSearchParams();
    if (cp?.userId) q.set("otherUserId", cp.userId);
    if (cp?.userName) q.set("otherUserName", cp.userName);
    const next = ROUTES.LEARNER_CHAT_CONVERSATION(conv.id);
    navigate(q.toString() ? `${next}?${q}` : next);
  };

  useEffect(() => {
    if (!conversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId && c.unreadCount > 0 ? { ...c, unreadCount: 0 } : c,
      ),
    );
  }, [conversationId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!conversationId || sending || (!content && !attachedImage)) return;
    setSending(true);
    try {
      const res = await learnerChatApi.sendConversationMessage(conversationId, {
        content,
        messageType: attachedImage ? 1 : 0,
        imageFile: attachedImage,
        replyToMessageId: replyTo?.id ?? null,
      });
      if (!res.data.isSuccess || !res.data.data) {
        alert(res.data.message ?? text.cannotSendMessage);
        return;
      }
      const created = res.data.data;
      setMessages((prev) => {
        if (prev.some((m) => m.id.toLowerCase() === created.id.toLowerCase())) return prev;
        return [...prev, created];
      });
      setDraft("");
      setAttachedImage(null);
      setReplyTo(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      void loadConversations(true);
    } catch {
      alert(text.sendMessageError);
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!sending && conversationId && (draft.trim() || attachedImage)) {
      void handleSendMessage(e as unknown as FormEvent);
    }
  };

  const handleDraftChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    if (hubConnection?.state === "Connected" && conversationId) {
      hubConnection.invoke("SendTyping", conversationId, true).catch(console.error);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        hubConnection.invoke("SendTyping", conversationId, false).catch(console.error);
      }, 2000);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
      alert(text.invalidImageType);
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(text.imageTooLarge);
      e.target.value = "";
      return;
    }
    setAttachedImage(file);
  };

  const handleEmojiPick = (emoji: string) => {
    setDraft((prev) => prev + emoji);
    setTimeout(() => composerRef.current?.focus(), 0);
  };

  const handleNewChat = async (userId: string, userName: string) => {
    setShowNewChatModal(false);
    try {
      const res = await learnerChatApi.getOrCreatePrivateConversation(userId);
      if (res.data.isSuccess && res.data.data) {
        const conv = res.data.data;
        void loadConversations(true);
        const q = new URLSearchParams();
        q.set("otherUserId", userId);
        q.set("otherUserName", userName);
        navigate(`${ROUTES.LEARNER_CHAT_CONVERSATION(conv.id)}?${q}`);
      }
    } catch {
      alert(text.cannotCreateConversation);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm(text.confirmDeleteMessage)) return;
    try {
      await learnerChatApi.deleteMessage(msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, isDeleted: true, content: "" } : m)),
      );
    } catch {
      alert(text.deleteMessageError);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`${styles.page} ${theme === "dark" ? styles.themeDark : ""}`}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <div className={`${styles.chatLayout} ${showRightPanel ? styles.chatLayoutWith3Col : ""}`}>
          {/* ── LEFT: Sidebar ───────────────────────────────────────── */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.sidebarTitleRow}>
                <h2 className={styles.sidebarTitle}>{text.sidebarTitle}</h2>
                <div className={styles.sidebarActions}>
                  <button type="button" className={styles.sidebarIconBtn} aria-label={text.options}>
                    <MoreHorizontal size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.sidebarIconBtn}
                    aria-label={text.newConversation}
                    onClick={() => setShowNewChatModal(true)}
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>
              <div className={styles.preferenceRow}>
                <button
                  type="button"
                  className={styles.preferenceBtn}
                  onClick={() => toggleTheme()}
                  title={theme === "dark" ? t("themeLight") : t("themeDark")}
                  aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
                >
                  {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                  <span>{theme === "dark" ? t("themeLight") : t("themeDark")}</span>
                </button>
                <button
                  type="button"
                  className={styles.preferenceBtn}
                  onClick={() => toggleLocale()}
                  title={locale === "en" ? t("languageVi") : t("languageEn")}
                  aria-label={t("language")}
                >
                  <Languages size={14} />
                  <span>{locale === "en" ? "EN" : "VI"}</span>
                </button>
              </div>
              <label className={styles.searchWrap}>
                <Search size={14} />
                <input
                  type="search"
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={text.searchInMessenger}
                />
              </label>
              <div className={styles.filterTabs}>
                {(["all", "unread", "group"] as FilterTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`${styles.filterTab} ${filterTab === tab ? styles.filterTabActive : ""}`}
                    onClick={() => setFilterTab(tab)}
                  >
                    {tab === "all" ? text.tabAll : tab === "unread" ? text.tabUnread : text.tabGroup}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.conversationList}>
              {loadingConversations && <p className={styles.stateText}>{text.loading}</p>}
              {!loadingConversations && filteredConversations.length === 0 && (
                <p className={styles.stateText}>
                  {searchTerm
                    ? text.notFound
                    : filterTab === "unread"
                      ? text.noUnreadMessages
                      : text.noConversations}
                </p>
              )}
              {filteredConversations.map((item) => {
                const name = getConversationDisplayName(
                  item,
                  currentUserId,
                  preferredOtherUserId,
                  null,
                  text.conversationFallback,
                );
                const snippet = item.lastMessage?.isDeleted
                  ? text.deletedSnippet
                  : item.lastMessage?.messageType === 1
                    ? text.imageSnippet
                    : item.lastMessage?.content?.trim() || "";
                const timeLabel = formatConversationTime(
                  item.lastMessageAt ?? item.lastMessage?.createdAt,
                  locale,
                );
                const unread = item.unreadCount > 0;
                const isActive = item.id === conversationId;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.convItem} ${isActive ? styles.convItemActive : ""}`}
                    onClick={() => openConversation(item)}
                  >
                    <div className={styles.convAvatarWrap}>
                      <span className={styles.convAvatar}>{getInitials(name)}</span>
                      <span className={styles.convOnlineDot} />
                    </div>
                    <div className={styles.convBody}>
                      <div className={styles.convTopRow}>
                        <span className={`${styles.convName} ${unread ? styles.convNameBold : ""}`}>
                          {name}
                        </span>
                        <span className={`${styles.convTime} ${unread ? styles.convTimeBold : ""}`}>
                          {timeLabel}
                        </span>
                      </div>
                      <div className={styles.convBottomRow}>
                        <span
                          className={`${styles.convSnippet} ${unread ? styles.convSnippetBold : ""}`}
                        >
                          {snippet || text.startConversation}
                        </span>
                        {unread && (
                          <span className={styles.unreadBadge}>
                            {item.unreadCount > 9 ? "9+" : item.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── CENTER: Chat panel ──────────────────────────────────── */}
          <section className={styles.chatPanel}>
            {/* Header */}
            <header className={styles.chatHeader}>
              <div className={styles.chatIdentity}>
                <div className={styles.chatAvatarWrap}>
                  <span className={styles.chatAvatar}>{getInitials(conversationTitle)}</span>
                  <span className={styles.chatOnlineDot} />
                </div>
                <div>
                  <h3 className={styles.chatName}>{conversationTitle}</h3>
                  <p className={styles.chatStatus}>{text.activeNow}</p>
                </div>
              </div>
              <div className={styles.chatHeaderActions}>
                <button type="button" className={styles.headerActionBtn} aria-label={text.callVoice}>
                  <Phone size={18} />
                </button>
                <button type="button" className={styles.headerActionBtn} aria-label={text.callVideo}>
                  <Video size={18} />
                </button>
                <button
                  type="button"
                  className={`${styles.headerActionBtn} ${showRightPanel ? styles.headerActionBtnActive : ""}`}
                  aria-label={text.info}
                  onClick={() => setShowRightPanel((v) => !v)}
                >
                  <Info size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div ref={messagesWrapRef} className={styles.messagesWrap} onScroll={handleScroll}>
              {loadingMore && (
                <div className={styles.loadMoreRow}>
                  <TypingDots />
                </div>
              )}

              {!conversationId ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    <MessageCircle size={52} strokeWidth={1.5} />
                  </div>
                  <p className={styles.emptyStateText}>{text.selectConversationToStart}</p>
                </div>
              ) : loadingMessages ? (
                <div className={styles.emptyState}>
                  <p className={styles.stateText}>{text.loadingMessages}</p>
                </div>
              ) : error ? (
                <div className={styles.emptyState}>
                  <p className={styles.errorText}>{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyAvatarLarge}>{getInitials(conversationTitle)}</div>
                  <h4 className={styles.emptyStateName}>{conversationTitle}</h4>
                  <p className={styles.stateText}>{text.startConversation}</p>
                </div>
              ) : (
                messages.map((m, i) => {
                  const isOwn = !!(
                    currentUserId && m.senderId.toLowerCase() === currentUserId.toLowerCase()
                  );
                  const gStart = isGroupStart(messages, i);
                  const gEnd = isGroupEnd(messages, i);
                  const isImage = m.messageType === 1 && !!m.filePath;

                  if (m.isDeleted) {
                    return (
                      <div
                        key={m.id}
                        className={`${styles.messageRow} ${isOwn ? styles.messageRowOwn : ""} ${gStart ? styles.messageRowGroupStart : ""}`}
                      >
                        {!isOwn && <span className={styles.msgAvatarSpacer} />}
                        <span className={styles.deletedMsg}>
                          {isOwn ? text.youRevokedMessage : text.messageDeleted}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`${styles.messageRow} ${isOwn ? styles.messageRowOwn : ""} ${gStart ? styles.messageRowGroupStart : ""}`}
                    >
                      {/* Avatar */}
                      {!isOwn ? (
                        gEnd ? (
                          <span className={styles.msgAvatar} title={m.senderName}>
                            {getInitials(m.senderName)}
                          </span>
                        ) : (
                          <span className={styles.msgAvatarSpacer} />
                        )
                      ) : null}

                      <div className={styles.msgBlock}>
                        {/* Sender name for group chats */}
                        {!isOwn && gStart && (
                          <span className={styles.msgSenderName}>{m.senderName}</span>
                        )}

                        {/* Reply reference */}
                        {m.replyToMessage && (
                          <div className={`${styles.replyRef} ${isOwn ? styles.replyRefOwn : ""}`}>
                            <span className={styles.replyRefAuthor}>
                              {m.replyToMessage.senderName}
                            </span>
                            <span className={styles.replyRefText}>
                              {m.replyToMessage.messageType === 1 ? text.imageSnippet : m.replyToMessage.content}
                            </span>
                          </div>
                        )}

                        {/* Bubble + hover actions (reply always on RIGHT) */}
                        <div
                          className={`${styles.bubbleWrap} ${isOwn ? styles.bubbleWrapOwn : ""}`}
                        >
                          <div
                            className={[
                              styles.bubble,
                              isOwn ? styles.bubbleOwn : styles.bubbleOther,
                              isImage ? styles.bubbleImg : "",
                              gStart && !isOwn ? styles.bubbleTopOther : "",
                              gEnd && !isOwn ? styles.bubbleBottomOther : "",
                              gStart && isOwn ? styles.bubbleTopOwn : "",
                              gEnd && isOwn ? styles.bubbleBottomOwn : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {isImage ? (
                              <button
                                type="button"
                                className={styles.imageMsgBtn}
                                onClick={() => setLightboxUrl(m.filePath!)}
                              >
                                <img
                                  className={styles.msgImage}
                                  src={m.filePath!}
                                  alt={m.fileName || text.imageAlt}
                                />
                                {m.content?.trim() && (
                                  <p className={styles.imgCaption}>{m.content}</p>
                                )}
                              </button>
                            ) : (
                              m.content
                            )}
                          </div>

                          {/* Actions always on RIGHT of bubble */}
                          <div className={styles.msgActions}>
                            <button
                              type="button"
                              className={styles.msgActionBtn}
                              title={text.reply}
                              onClick={() => setReplyTo(m)}
                            >
                              <Reply size={13} />
                            </button>
                            {isOwn && (
                              <button
                                type="button"
                                className={styles.msgActionBtn}
                                title={text.delete}
                                onClick={() => void handleDeleteMessage(m.id)}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Timestamp at group end only */}
                        {gEnd && (
                          <span className={`${styles.msgTime} ${isOwn ? styles.msgTimeOwn : ""}`}>
                            {formatTime(m.createdAt, locale)}
                            {m.isEdited && ` · ${text.edited}`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {isTyping && (
                <div className={styles.messageRow}>
                  <span className={styles.msgAvatar} style={{ opacity: 0.5 }}>
                    ?
                  </span>
                  <div className={styles.msgBlock}>
                    <div className={styles.bubble}>
                      <TypingDots />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className={styles.composerWrap}>
              {/* Reply preview */}
              {replyTo && (
                <div className={styles.replyPreview}>
                  <Reply size={13} className={styles.replyPreviewIcon} />
                  <div className={styles.replyPreviewBody}>
                    <span className={styles.replyPreviewName}>
                      {replyTo.senderId === currentUserId ? text.you : replyTo.senderName}
                    </span>
                    <span className={styles.replyPreviewText}>
                      {replyTo.messageType === 1 ? text.imageSnippet : replyTo.content}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.replyPreviewClose}
                    onClick={() => setReplyTo(null)}
                    aria-label={text.cancelReply}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Attachment preview */}
              {attachedImagePreview && (
                <div className={styles.attachPreview}>
                  <div className={styles.attachPreviewThumb}>
                    <img src={attachedImagePreview} alt="preview" />
                    <button
                      type="button"
                      className={styles.attachPreviewRemove}
                      onClick={() => {
                        setAttachedImage(null);
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <span className={styles.attachPreviewName}>{attachedImage?.name}</span>
                </div>
              )}

              {/* Emoji picker */}
              {showEmojiPicker && (
                <EmojiPickerPanel
                  onPick={handleEmojiPick}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}

              <form className={styles.composer} onSubmit={handleSendMessage}>
                <button
                  type="button"
                  className={styles.composerIconBtn}
                  aria-label={text.emoji}
                  onClick={() => setShowEmojiPicker((v) => !v)}
                >
                  <Smile size={22} />
                </button>
                <button
                  type="button"
                  className={styles.composerIconBtn}
                  aria-label={text.sendImage}
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon size={22} />
                </button>
                <button type="button" className={styles.composerIconBtn} aria-label={text.voice}>
                  <Mic size={22} />
                </button>
                <div className={styles.composerInputWrap}>
                  <textarea
                    ref={composerRef}
                    className={styles.composerTextarea}
                    value={draft}
                    onChange={handleDraftChange}
                    onKeyDown={handleComposerKeyDown}
                    placeholder="Aa"
                    rows={1}
                    disabled={!conversationId}
                  />
                </div>
                <button
                  type="submit"
                  className={styles.composerSendBtn}
                  disabled={!conversationId || sending || (!draft.trim() && !attachedImage)}
                  aria-label={text.send}
                >
                  <Send size={18} style={{ marginLeft: 2 }} />
                </button>
              </form>
            </div>
          </section>

          {/* ── RIGHT: Info panel ───────────────────────────────────── */}
          {showRightPanel && (
            <aside className={styles.rightPanel}>
              <div className={styles.rightTop}>
                <div className={styles.rightAvatarWrap}>
                  <span className={styles.rightAvatar}>{getInitials(conversationTitle)}</span>
                  <span className={styles.rightOnlineDot} />
                </div>
                <h3 className={styles.rightName}>{conversationTitle}</h3>
                <p className={styles.rightStatus}>{text.activeNow}</p>
                <div className={styles.rightActions}>
                  <div className={styles.rightActionItem}>
                    <button type="button" className={styles.rightActionBtn} aria-label={text.unmute}>
                      <BellOff size={16} />
                    </button>
                    <span>{text.unmute}</span>
                  </div>
                  <div className={styles.rightActionItem}>
                    <button type="button" className={styles.rightActionBtn} aria-label={text.search}>
                      <Search size={16} />
                    </button>
                    <span>{text.search}</span>
                  </div>
                </div>
              </div>

              <div className={styles.infoSections}>
                {/* Members – only for group conversations (roomType === 1) */}
                {activeConversation && activeConversation.roomType === 1 && (
                  <div className={styles.infoSection}>
                    <p className={styles.infoSectionLabel}>{text.membersInChat}</p>
                    <div className={styles.memberList}>
                      {activeConversation.members.map((mem) => (
                        <div key={mem.id} className={styles.memberItem}>
                          <span className={styles.memberAvatar}>{getInitials(mem.userName)}</span>
                          <span className={styles.memberName}>{mem.userName}</span>
                          {mem.userId.toLowerCase() === currentUserId?.toLowerCase() && (
                            <span className={styles.memberYouTag}>{text.youTag}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared media grid – shown directly without accordion */}
                {sharedImages.length > 0 && (
                  <div className={styles.infoSection}>
                    <p className={styles.infoSectionLabel}>{text.mediaFiles}</p>
                    <div className={styles.mediaGrid}>
                      {sharedImages.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={styles.mediaGridItem}
                          onClick={() => setLightboxUrl(m.filePath!)}
                        >
                          <img src={m.filePath!} alt="" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
        className={styles.hiddenFileInput}
        onChange={handleImageChange}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <ImageLightbox
          url={lightboxUrl}
          closeLabel={text.close}
          onClose={() => setLightboxUrl(null)}
        />
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onSelect={handleNewChat}
          copy={{
            title: text.newChatTitle,
            close: text.close,
            searchUsersPlaceholder: text.searchUsersPlaceholder,
            searchingUsers: text.searchingUsers,
            noUsersFound: text.noUsersFound,
            typeNameToSearch: text.typeNameToSearch,
          }}
        />
      )}
    </div>
  );
}
