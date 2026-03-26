import type { ComplaintHistory } from "@/types/api/complaints";
import { ComplaintStatusBadge } from "./ComplaintStatusBadge";

type Props = {
  histories: ComplaintHistory[];
  formatChangedBy?: (changedBy: string) => string;
};

export function ComplaintTimeline({ histories, formatChangedBy }: Props) {
  const ordered = [...histories].sort(
    (a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime(),
  );
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {ordered.length === 0 ? (
        <div style={{ color: "var(--text-2)" }}>No status history yet.</div>
      ) : (
        ordered.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--surface)",
              padding: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {item.fromStatus ? <ComplaintStatusBadge status={item.fromStatus} /> : <span>—</span>}
              <span style={{ color: "var(--text-2)" }}>→</span>
              <ComplaintStatusBadge status={item.toStatus} />
              <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-2)" }}>
                {new Date(item.changedAt).toLocaleString()}
              </span>
            </div>
            <div style={{ marginTop: 8, color: "var(--text)", fontSize: 13 }}>
              Changed by: {formatChangedBy ? formatChangedBy(item.changedBy) : item.changedBy}
            </div>
            {item.note ? (
              <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>{item.note}</div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
