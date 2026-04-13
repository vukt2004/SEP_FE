import type { ComplaintStatus } from "@/types/api/complaints";

const styleByStatus: Record<ComplaintStatus, React.CSSProperties> = {
  Open: {
    background: "rgba(59, 130, 246, 0.12)",
    color: "#1d4ed8",
    border: "1px solid rgba(59, 130, 246, 0.28)",
  },
  InProgress: {
    background: "rgba(245, 158, 11, 0.14)",
    color: "#92400e",
    border: "1px solid rgba(245, 158, 11, 0.28)",
  },
  Resolved: {
    background: "rgba(34, 197, 94, 0.12)",
    color: "#166534",
    border: "1px solid rgba(34, 197, 94, 0.28)",
  },
};

const labelByStatus: Record<ComplaintStatus, string> = {
  Open: "Open",
  InProgress: "In progress",
  Resolved: "Resolved",
};

type Props = {
  status: ComplaintStatus;
};

export function ComplaintStatusBadge({ status }: Props) {
  return (
    <span
      style={{
        ...styleByStatus[status],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        padding: "4px 11px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.1,
        whiteSpace: "nowrap",
      }}
    >
      {labelByStatus[status]}
    </span>
  );
}
