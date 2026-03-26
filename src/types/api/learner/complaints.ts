import type { ApiResult } from "../common";
import type { ComplaintDetailResult, ComplaintListResult, ComplaintStatus } from "../complaints";

export type CreateComplaintRequest = {
  subject: string;
  category: string;
  description: string;
};

export type CreateComplaintResult = ApiResult<string>;

export type LearnerComplaintListQuery = {
  status?: ComplaintStatus;
  pageNumber?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type AddLearnerComplaintMessageRequest = {
  content: string;
};

export type AddLearnerComplaintMessageResult = ApiResult<string>;

export type LearnerComplaintListResult = ComplaintListResult;
export type LearnerComplaintDetailResult = ComplaintDetailResult;
