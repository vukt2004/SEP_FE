import type { ApiResult } from "./common";

export const COMPLAINT_STATUSES = [
  "Open",
  "InProgress",
  "Resolved",
  "SellerPending",
  "FixInProgress",
  "FixSubmitted",
  "Verified",
  "SellerRejected",
  "SellerNoResponse",
  "ResolvedRefund",
  "ResolvedReject",
  "Closed",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const COMPLAINT_STATUS_CODE_TO_VALUE: Record<number, ComplaintStatus> = {
  0: "Open",
  1: "InProgress",
  2: "Resolved",
  3: "SellerPending",
  4: "FixInProgress",
  5: "FixSubmitted",
  6: "Verified",
  7: "SellerRejected",
  8: "SellerNoResponse",
  9: "ResolvedRefund",
  10: "ResolvedReject",
  11: "Closed",
};

export const COMPLAINT_STATUS_VALUE_TO_CODE: Record<ComplaintStatus, number> = {
  Open: 0,
  InProgress: 1,
  Resolved: 2,
  SellerPending: 3,
  FixInProgress: 4,
  FixSubmitted: 5,
  Verified: 6,
  SellerRejected: 7,
  SellerNoResponse: 8,
  ResolvedRefund: 9,
  ResolvedReject: 10,
  Closed: 11,
};

export type ComplaintAttachment = {
  id: string;
  fileName: string;
  url: string;
  mimeType: string | null;
  sizeBytes: number;
  sortOrder: number;
};

export type ComplaintLinkedOrder = {
  orderId: string;
  orderCode: string | null;
  orderStatus: string | null;
  amountOrbitCoin: number | null;
  amountVnd: number | null;
  paidAt: string | null;
  paymentTargetType: string | null;
  paymentTargetId: string | null;
  paymentTargetName: string | null;
};

export type ComplaintContextResolved = {
  displayTitle: string | null;
  displaySubtitle: string | null;
  referenceCode: string | null;
  eventTime: string | null;
  amountValue: number | null;
  deltaValue: number | null;
  linkedOrder: ComplaintLinkedOrder | null;
};

export type ComplaintItem = {
  id: string;
  userId: string;
  buyerUserId?: string;
  sellerUserId?: string;
  subject: string;
  category: string;
  categoryKey: string;
  description: string;
  complaintStatus: ComplaintStatus;
  contextType: string | null;
  contextId: string | null;
  contextKey: string | null;
  contextDataJson: string | null;
  occurredAt: string | null;
  contextResolved: ComplaintContextResolved | null;
  createdAt: string;
  resolvedAt: string | null;
  refundProcessed?: boolean;
  refundedPaymentRecordId?: string | null;
  refundAmount?: number | null;
  refundedAt?: string | null;
  refundReason?: string | null;
};

export type ComplaintMessage = {
  id: string;
  senderId: string;
  senderParty?: string | null;
  content: string;
  isInternal: boolean;
  createdAt: string;
  attachments: ComplaintAttachment[];
};

export type ComplaintHistory = {
  id: string;
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus;
  changedBy: string;
  changedAt: string;
  note: string | null;
};

export type PaginationData<T> = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
  items: T[];
};

export type ComplaintDetail = ComplaintItem & {
  messages: ComplaintMessage[];
  statusHistories: ComplaintHistory[];
};

export type ComplaintListResult = ApiResult<PaginationData<ComplaintItem>>;
export type ComplaintDetailResult = ApiResult<ComplaintDetail>;
