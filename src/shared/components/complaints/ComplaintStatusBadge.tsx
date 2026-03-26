import type { ComplaintStatus } from "@/types/api/complaints";

const styleByStatus: Record<ComplaintStatus, React.CSSProperties> = {
  Open: {
    background: "rgba(59, 130, 246, 0.12)",
    color: "#1d4ed8",
    border: "1px solid rgba(59, 130, 246, 0.36)",
  },
  InProgress: {
    background: "rgba(245, 158, 11, 0.16)",
    color: "#92400e",
    border: "1px solid rgba(245, 158, 11, 0.36)",
  },
  Resolved: {
    background: "rgba(34, 197, 94, 0.14)",
    color: "#166534",
    border: "1px solid rgba(34, 197, 94, 0.36)",
  },
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
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {status}
    </span>
  );
}
