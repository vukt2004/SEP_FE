import { useMemo } from "react";
import type { ComplaintMessage } from "@/types/api/complaints";

type Props = {
  messages: ComplaintMessage[];
  currentUserId?: string;
  hideInternal: boolean;
};

export function ComplaintMessageList({ messages, currentUserId, hideInternal }: Props) {
  const filtered = useMemo(
    () => messages.filter((m) => (hideInternal ? !m.isInternal : true)),
    [hideInternal, messages],
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {filtered.length === 0 ? (
        <div style={{ color: "var(--text-2)" }}>No messages yet.</div>
      ) : (
        filtered.map((msg) => {
          const mine = currentUserId ? msg.senderId === currentUserId : false;
          return (
            <div
              key={msg.id}
              style={{
                justifySelf: mine ? "end" : "start",
                maxWidth: "85%",
                background: mine ? "var(--primary)" : "var(--surface)",
                color: mine ? "white" : "var(--text)",
                border: mine ? "1px solid transparent" : "1px solid var(--border)",
                borderRadius: 14,
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                {msg.senderId} • {new Date(msg.createdAt).toLocaleString()}
                {msg.isInternal ? " • Internal" : ""}
              </div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14 }}>
                {msg.content}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
