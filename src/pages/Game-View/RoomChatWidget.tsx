import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { MessageCircle, X } from "lucide-react";
import { learnerChatApi } from "@/services/api/learner/chat.api";
import { ROUTES } from "@/lib/constants/routes";

const widgetStyles: Record<string, CSSProperties> = {
  button: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 1200,
    width: 52,
    height: 52,
    borderRadius: 999,
    border: "1px solid rgba(99,102,241,0.45)",
    background: "rgba(16,24,40,0.88)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  panel: {
    position: "fixed",
    right: 20,
    bottom: 84,
    zIndex: 1200,
    width: 360,
    height: 480,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.45)",
    overflow: "hidden",
    background: "#ffffff",
    boxShadow: "0 12px 32px rgba(2,6,23,0.45)",
  },
  header: {
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px 0 12px",
    color: "#0f172a",
    background: "#ffffff",
    borderBottom: "1px solid rgba(148,163,184,0.2)",
  },
  close: {
    background: "transparent",
    border: "none",
    color: "#334155",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },
  iframe: {
    width: "100%",
    height: "calc(100% - 40px)",
    border: "none",
    background: "#fff",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    padding: "0 6px",
    borderRadius: 999,
    background: "#ef4444",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,0.35)",
  },
  newMessageToast: {
    position: "fixed",
    right: 20,
    bottom: 146,
    zIndex: 1202,
    padding: "8px 12px",
    borderRadius: 10,
    background: "rgba(15,23,42,0.95)",
    color: "#e2e8f0",
    border: "1px solid rgba(148,163,184,0.3)",
    fontSize: 12,
    fontWeight: 700,
    boxShadow: "0 10px 26px rgba(2,6,23,0.45)",
  },
};

export default function RoomChatWidget({ roomCode }: { roomCode?: string | null }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessageNotice, setNewMessageNotice] = useState<string | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const resolveRoomConversation = useCallback(async (): Promise<string | null> => {
    const code = roomCode?.trim();
    const res = await learnerChatApi.getConversations({
      pageNumber: 1,
      pageSize: 100,
      searchTerm: code || undefined,
    });
    const items = res.data.data?.items ?? [];
    const expected = code ? `lobby ${code}`.toLowerCase() : "";
    const byExactName = expected
      ? items.find((c) => c.roomType === 1 && (c.name ?? "").trim().toLowerCase() === expected)
      : null;
    const fallbackGroup = !byExactName
      ? items
          .filter((c) => c.roomType === 1)
          .sort((a, b) => {
            const aTs = new Date(a.lastMessageAt ?? a.createdAt).getTime();
            const bTs = new Date(b.lastMessageAt ?? b.createdAt).getTime();
            return bTs - aTs;
          })[0] ?? null
      : null;
    const found = byExactName ?? fallbackGroup;
    setConversationId(found?.id ?? null);
    setUnreadCount(found?.unreadCount ?? 0);
    return found?.id ?? null;
  }, [roomCode]);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    resolveRoomConversation().catch(() => {
      if (alive) {
        setConversationId(null);
      }
    });

    return () => {
      alive = false;
    };
  }, [resolveRoomConversation]);

  useEffect(() => {
    if (!conversationId) return;
    let alive = true;
    let prevUnread = 0;
    const readConversations = () => {
      learnerChatApi
        .getConversations({ pageNumber: 1, pageSize: 100, searchTerm: roomCode?.trim() || undefined })
        .then((res) => {
          if (!alive) return;
          const items = res.data.data?.items ?? [];
          const found = items.find((c) => c.id === conversationId);
          const nextUnread = found?.unreadCount ?? 0;
          if (!open && nextUnread > prevUnread) {
            setNewMessageNotice("Tin nhắn mới trong Room Chat");
            window.setTimeout(() => setNewMessageNotice(null), 2500);
          }
          prevUnread = nextUnread;
          setUnreadCount(open ? 0 : nextUnread);
        })
        .catch(() => {});
    };

    readConversations();
    const timerId = window.setInterval(readConversations, 5000);
    return () => {
      alive = false;
      window.clearInterval(timerId);
    };
  }, [conversationId, open, roomCode]);

  useEffect(() => {
    if (!open) return;
    setUnreadCount(0);
    setNewMessageNotice(null);
  }, [open]);

  const chatUrl = useMemo(
    () => (conversationId ? `${ROUTES.LEARNER_CHAT_CONVERSATION(conversationId)}?embed=1` : null),
    [conversationId],
  );

  const toggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!conversationId) {
      try {
        setLoadingConversation(true);
        setLoadError(null);
        await resolveRoomConversation();
      } catch {
        setLoadError("Không thể mở chat phòng lúc này.");
      } finally {
        setLoadingConversation(false);
      }
    }
    setOpen(true);
  };

  return (
    <>
      {newMessageNotice && !open ? <div style={widgetStyles.newMessageToast}>{newMessageNotice}</div> : null}
      {open ? (
        <div style={widgetStyles.panel}>
          <div style={widgetStyles.header}>
            <span>Room Chat</span>
            <button type="button" style={widgetStyles.close} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {chatUrl ? (
            <iframe title="Room chat" src={chatUrl} style={widgetStyles.iframe} />
          ) : (
            <div
              style={{
                ...widgetStyles.iframe,
                display: "grid",
                placeItems: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              {loadingConversation ? "Đang tải Room Chat..." : loadError ?? "Không tìm thấy Room Chat"}
            </div>
          )}
        </div>
      ) : null}
      <button type="button" style={widgetStyles.button} onClick={() => void toggleOpen()}>
        <MessageCircle size={22} />
        {unreadCount > 0 ? (
          <span style={widgetStyles.badge}>{unreadCount > 99 ? "99+" : String(unreadCount)}</span>
        ) : null}
      </button>
    </>
  );
}
