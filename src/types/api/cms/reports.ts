// src/types/api/cms/reports.ts
import type { ApiResult } from "../common";

/**
 * Generic pagination result structure
 */
export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string;
  errors: string[];
  errorCode: string;
}

/**
 * Report item in list view
 */
export interface ReportListItem {
  id: string;
  gameId?: string;
  mapId: string;
  gameTitle?: string;
  mapTitle: string;
  userId: string;
  reason: string;
  details: string;
  reportStatus: string;
  createdAt: string;
}

/**
 * Pagination result for reports list
 */
export type ReportsPaginationResult = PaginationResult<ReportListItem>;

/**
 * Full API response wrapper for reports
 */
export type ReportsListResult = ApiResult<ReportsPaginationResult>;

/**
 * Query parameters for getting reports list
 */
export interface GetReportsParams {
  pageNumber?: number;
  pageSize?: number;
  reportStatus?: string;
  searchTerm?: string;
}

/**
 * Resolve/Dismiss report action parameters
 */
export interface ResolveReportParams {
  reviewNote?: string;
}

export interface DismissReportParams {
  reviewNote?: string;
}
