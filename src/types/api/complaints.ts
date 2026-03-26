import type { ApiResult } from "./common";

export type ComplaintStatus = "Open" | "InProgress" | "Resolved";

export type ComplaintItem = {
  id: string;
  userId: string;
  subject: string;
  category: string;
  description: string;
  complaintStatus: ComplaintStatus;
  createdAt: string;
  resolvedAt: string | null;
};

export type ComplaintMessage = {
  id: string;
  senderId: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
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
