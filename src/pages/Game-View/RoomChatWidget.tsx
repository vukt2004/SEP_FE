import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { gameLobbyHub, type RoomChatMessagePayload } from "@/lib/realtime/gameLobbyHub";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import styles from "./RoomChatWidget.module.css";

function getCurrentUserId(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return String(payload?.nameid ?? payload?.sub ?? payload?.userId ?? "") || null;
  } catch {
    return null;
  }
}

type Props = {
  roomId?: string | null;
  roomCode?: string | null;
};

export default function RoomChatWidget({ roomId, roomCode }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<RoomChatMessagePayload[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessageNotice, setNewMessageNotice] = useState<string | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);
  const messagesWrapRef = useRef<HTMLDivElement | null>(null);
  const currentUserId = useMemo(() => getCurrentUserId(tokenStorage.getLearnerToken()), []);
  const roomIdNormalized = roomId?.trim() || "";

  useEffect(() => {
    if (!roomIdNormalized) return;
    let unsubRoomChat: (() => void) | undefined;
    const loadMessages = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        await gameLobbyHub.connect();
        const payload = await gameLobbyHub.getRoomChatMessages(roomIdNormalized, 100);
        setMessages(payload);
      } catch {
        setMessages([]);
        setLoadError("Không thể tải chat phòng lúc này.");
      } finally {
        setLoading(false);
      }
    };
    void loadMessages();
    unsubRoomChat = gameLobbyHub.on("RoomChatMessage", (raw: unknown) => {
      const message = raw as RoomChatMessagePayload | undefined;
      const incomingRoomId = String(message?.roomId ?? "").toLowerCase();
      if (!incomingRoomId || incomingRoomId !== roomIdNormalized.toLowerCase()) return;
      setMessages((prev) => [...prev, message!].slice(-200));
      if (!open && String(message?.senderId ?? "").toLowerCase() !== String(currentUserId ?? "").toLowerCase()) {
        setUnreadCount((prev) => prev + 1);
        setNewMessageNotice(`${message?.senderName || "Một người chơi"} vừa gửi tin nhắn`);
        if (noticeTimeoutRef.current != null) window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = window.setTimeout(() => {
          setNewMessageNotice(null);
          noticeTimeoutRef.current = null;
        }, 2500);
      }
    });
    return () => {
      unsubRoomChat?.();
    };
  }, [currentUserId, open, roomIdNormalized]);

  useEffect(() => {
    if (!open) return;
    setUnreadCount(0);
    setNewMessageNotice(null);
  }, [open]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current != null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || !messagesWrapRef.current) return;
    messagesWrapRef.current.scrollTop = messagesWrapRef.current.scrollHeight;
  }, [messages, open]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!roomIdNormalized || !content || sending) return;
    setSending(true);
    try {
      await gameLobbyHub.sendRoomChatMessage(roomIdNormalized, content);
      setInput("");
    } catch {
      setLoadError("Không thể gửi tin nhắn lúc này.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={styles.dock}>
      {newMessageNotice && !open ? <div className={styles.notice}>{newMessageNotice}</div> : null}
      {open ? (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span className={styles.title}>Chat phòng {roomCode ? `(${roomCode})` : ""}</span>
            <button type="button" className={styles.close} onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div ref={messagesWrapRef} className={styles.messages}>
            {loading ? <div className={styles.stateText}>Đang tải chat phòng...</div> : null}
            {!loading && messages.length === 0 ? (
              <div className={styles.stateText}>{loadError ?? "Chưa có tin nhắn nào."}</div>
            ) : null}
            {!loading &&
              messages.map((m) => {
                const isSelf =
                  String(m.senderId ?? "").toLowerCase() === String(currentUserId ?? "").toLowerCase();
                return (
                  <div key={m.id} className={`${styles.msgRow} ${isSelf ? styles.msgRowSelf : ""}`}>
                    <div className={`${styles.msgBubble} ${isSelf ? styles.msgBubbleSelf : ""}`}>
                      <div className={styles.meta}>
                        <span className={styles.sender}>{m.senderName}</span>
                        <span className={styles.time}>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className={styles.content}>{m.content}</div>
                    </div>
                  </div>
                );
              })}
          </div>
          <div className={styles.composer}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Nhập tin nhắn..."
              className={styles.input}
            />
            <button
              type="button"
              className={styles.send}
              onClick={() => void handleSend()}
              disabled={sending || input.trim().length === 0}
            >
              Gửi
            </button>
          </div>
        </div>
      ) : null}
      <button type="button" className={styles.toggle} onClick={() => void toggleOpen()}>
        <MessageCircle size={19} />
        Chat phòng
        {unreadCount > 0 ? (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : String(unreadCount)}</span>
        ) : null}
      </button>
    </div>
  );
}
