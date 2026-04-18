import { cmsAxios } from "@/services/http/axios.cms";
import type { GetPaymentsReportParams, PaymentsReportResult } from "@/types/api/cms/marketplaceReports";

export const cmsMarketplaceReportsApi = {
  /**
   * GET /api/cms/marketplace/reports/payments
   */
  getPaymentsReport(params?: GetPaymentsReportParams) {
    return cmsAxios.get<PaymentsReportResult>("/api/cms/marketplace/reports/payments", { params });
  },
};