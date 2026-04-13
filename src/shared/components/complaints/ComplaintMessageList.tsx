import { useMemo } from "react";
import type { ComplaintMessage } from "@/types/api/complaints";

type Props = {
  messages: ComplaintMessage[];
  currentUserId?: string;
  hideInternal: boolean;
  otherLabel?: string;
  currentUserLabel?: string;
};

export function ComplaintMessageList({
  messages,
  currentUserId,
  hideInternal,
  otherLabel = "Support Team",
  currentUserLabel = "You",
}: Props) {
  const filtered = useMemo(
    () => messages.filter((m) => (hideInternal ? !m.isInternal : true)),
    [hideInternal, messages],
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {filtered.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--border)",
            borderRadius: 12,
            padding: 12,
            color: "var(--text-2)",
            background: "var(--bg)",
            fontSize: 13,
          }}
        >
          No messages yet.
        </div>
      ) : (
        filtered.map((msg) => {
          const mine = currentUserId ? msg.senderId === currentUserId : false;
          const badgeLabel = mine ? currentUserLabel : otherLabel;
          return (
            <div
              key={msg.id}
              style={{
                justifySelf: mine ? "end" : "start",
                maxWidth: "85%",
                background: mine
                  ? "linear-gradient(180deg, color-mix(in srgb, var(--primary) 94%, white 6%) 0%, var(--primary) 100%)"
                  : "var(--surface)",
                color: mine ? "white" : "var(--text)",
                border: mine ? "1px solid transparent" : "1px solid var(--border)",
                borderRadius: 14,
                padding: "10px 12px",
                boxShadow: mine ? "0 10px 22px color-mix(in srgb, var(--primary) 24%, transparent)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                  fontSize: 11,
                  opacity: 0.82,
                }}
              >
                <strong style={{ fontSize: 12, lineHeight: 1.2 }}>{badgeLabel}</strong>
                <span style={{ whiteSpace: "nowrap" }}>{new Date(msg.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 14 }}>
                {msg.content}
              </div>
              {msg.isInternal ? (
                <div
                  style={{
                    marginTop: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: 999,
                    padding: "3px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    background: "rgba(22, 163, 74, 0.12)",
                    color: "#166534",
                    width: "fit-content",
                  }}
                >
                  Internal note
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
