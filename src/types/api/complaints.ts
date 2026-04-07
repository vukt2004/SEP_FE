import type { ApiResult } from "./common";

export type ComplaintStatus = "Open" | "InProgress" | "Resolved";

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
};

export type ComplaintMessage = {
  id: string;
  senderId: string;
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
  items: T[];
};

export type ComplaintDetail = ComplaintItem & {
  messages: ComplaintMessage[];
  statusHistories: ComplaintHistory[];
};

export type ComplaintListResult = ApiResult<PaginationData<ComplaintItem>>;
export type ComplaintDetailResult = ApiResult<ComplaintDetail>;
