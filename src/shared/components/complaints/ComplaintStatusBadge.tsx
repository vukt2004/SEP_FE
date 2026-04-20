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
  SellerPending: {
    background: "rgba(251, 146, 60, 0.14)",
    color: "#9a3412",
    border: "1px solid rgba(251, 146, 60, 0.28)",
  },
  FixInProgress: {
    background: "rgba(6, 182, 212, 0.14)",
    color: "#0e7490",
    border: "1px solid rgba(6, 182, 212, 0.28)",
  },
  FixSubmitted: {
    background: "rgba(14, 165, 233, 0.14)",
    color: "#0369a1",
    border: "1px solid rgba(14, 165, 233, 0.28)",
  },
  Verified: {
    background: "rgba(16, 185, 129, 0.14)",
    color: "#047857",
    border: "1px solid rgba(16, 185, 129, 0.28)",
  },
  SellerRejected: {
    background: "rgba(239, 68, 68, 0.12)",
    color: "#991b1b",
    border: "1px solid rgba(239, 68, 68, 0.26)",
  },
  SellerNoResponse: {
    background: "rgba(71, 85, 105, 0.14)",
    color: "#334155",
    border: "1px solid rgba(71, 85, 105, 0.26)",
  },
  ResolvedRefund: {
    background: "rgba(132, 204, 22, 0.14)",
    color: "#3f6212",
    border: "1px solid rgba(132, 204, 22, 0.26)",
  },
  ResolvedReject: {
    background: "rgba(248, 113, 113, 0.12)",
    color: "#b91c1c",
    border: "1px solid rgba(248, 113, 113, 0.26)",
  },
  Closed: {
    background: "rgba(100, 116, 139, 0.14)",
    color: "#334155",
    border: "1px solid rgba(100, 116, 139, 0.3)",
  },
};

const labelByStatus: Record<ComplaintStatus, string> = {
  Open: "Open",
  InProgress: "In progress",
  Resolved: "Resolved",
  SellerPending: "Seller pending",
  FixInProgress: "Fix in progress",
  FixSubmitted: "Fix submitted",
  Verified: "Verified",
  SellerRejected: "Seller rejected",
  SellerNoResponse: "Seller no response",
  ResolvedRefund: "Resolved with refund",
  ResolvedReject: "Resolved and rejected",
  Closed: "Closed",
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
