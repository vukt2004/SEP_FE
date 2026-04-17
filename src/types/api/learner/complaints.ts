import type { ApiResult } from "../common";
import type {
  ComplaintContextResolved,
  ComplaintDetailResult,
  ComplaintListResult,
  ComplaintStatus,
} from "../complaints";

export type ComplaintCreateContextInput = {
  paymentRecordId?: string;
  gameId?: string;
  mapId?: string;
  packageId?: string;
  submissionId?: string;
  playHistoryId?: string;
  xpTransactionId?: string;
  orbitCoinTransactionId?: string;
  occurredAt?: string;
};

export type CreateComplaintRequest = {
  subject: string;
  categoryKey: string;
  description: string;
  context: ComplaintCreateContextInput;
  attachments?: File[];
};

export type ComplaintCategoryConfigItem = {
  categoryKey: string;
  displayName: string;
  description?: string | null;
  isEnabled: boolean;
  sortOrder: number;
  requiredAnyContextFields?: string[];
  allowManualContextInput?: boolean;
};

export type ComplaintCategoryConfigListResult = ApiResult<ComplaintCategoryConfigItem[]>;

export type CreateComplaintResponse = {
  id: string;
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
  createdAt: string | null;
};

export type CreateComplaintResult = ApiResult<CreateComplaintResponse>;

export type LearnerComplaintListQuery = {
  status?: ComplaintStatus;
  pageNumber?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type AddLearnerComplaintMessageRequest = {
  content: string;
  attachments?: File[];
};

export type AddLearnerComplaintMessageResult = ApiResult<string>;

export type LearnerComplaintListResult = ComplaintListResult;
export type LearnerComplaintDetailResult = ComplaintDetailResult;
