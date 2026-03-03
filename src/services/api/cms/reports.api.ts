// src/services/api/cms/reports.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetReportsParams,
  ReportsListResult,
  ResolveReportParams,
  DismissReportParams,
} from "@/types/api/cms/reports";
import type { ApiResult } from "@/types/api/common";

/**
 * CMS Reports API
 * Handles community reports management
 */
export const cmsReportsApi = {
  /**
   * Get paginated list of all community reports
   * GET /api/cms/community/reports
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated reports list
   */
  getReports(params?: GetReportsParams) {
    return cmsAxios.get<ReportsListResult>("/api/cms/community/reports", { params });
  },

  /**
   * Resolve a report
   * POST /api/cms/community/reports/{id}/resolve
   *
   * @param id - Report ID
   * @param params - Review note (optional)
   * @returns Success result
   */
  resolveReport(id: string, params?: ResolveReportParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/community/reports/${id}/resolve`, null, { params });
  },

  /**
   * Dismiss a report
   * POST /api/cms/community/reports/{id}/dismiss
   *
   * @param id - Report ID
   * @param params - Review note (optional)
   * @returns Success result
   */
  dismissReport(id: string, params?: DismissReportParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/community/reports/${id}/dismiss`, null, { params });
  },
};
