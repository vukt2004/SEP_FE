import type { ApiResult } from "../common";
import type { ComplaintDetailResult, ComplaintListResult, ComplaintStatus } from "../complaints";

export type CmsComplaintListQuery = {
  status?: ComplaintStatus;
  pageNumber?: number;
  pageSize?: number;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
};

export type CmsChangeComplaintStatusRequest = {
  toStatus: ComplaintStatus | number;
  note?: string;
};

export type CmsChangeComplaintStatusResult = ApiResult<string>;

export type CmsComplaintMessageRequest = {
  content: string;
  isInternal: boolean;
};

export type CmsComplaintMessageResult = ApiResult<string>;

export type CmsComplaintListResult = ComplaintListResult;
export type CmsComplaintDetailResult = ComplaintDetailResult;
