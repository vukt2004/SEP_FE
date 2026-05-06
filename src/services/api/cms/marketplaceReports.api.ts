import { cmsAxios } from "@/services/http/axios.cms";
import type {
  CmsOrbitCoinTransactionItem,
  CmsOrbitCoinInsightsData,
  CmsEscrowPendingResult,
  CmsPagedResult,
  CmsRevenueOverviewResult,
  GetPaymentsReportParams,
  PaymentsReportResult,
  CmsMarketplaceTransactionItem,
} from "@/types/api/cms/marketplaceReports";

export const cmsMarketplaceReportsApi = {
  /**
   * GET /api/cms/marketplace/reports/payments
   */
  getPaymentsReport(params?: GetPaymentsReportParams) {
    return cmsAxios.get<PaymentsReportResult>("/api/cms/marketplace/reports/payments", { params });
  },

  getRevenueOverview(params?: GetPaymentsReportParams) {
    return cmsAxios.get<CmsRevenueOverviewResult>("/api/cms/marketplace/reports/overview", { params });
  },

  getMarketplaceTransactions(params?: {
    pageNumber?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    paymentStatus?: string;
    search?: string;
  }) {
    return cmsAxios.get<CmsPagedResult<CmsMarketplaceTransactionItem>>(
      "/api/cms/marketplace/transactions/marketplace",
      { params },
    );
  },

  getOrbitCoinTransactions(params?: {
    pageNumber?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    transactionType?: string;
    search?: string;
  }) {
    return cmsAxios.get<CmsPagedResult<CmsOrbitCoinTransactionItem>>(
      "/api/cms/marketplace/transactions/orbitcoin",
      { params },
    );
  },

  getOrbitCoinInsights(params?: { top?: number }) {
    return cmsAxios.get<{ isSuccess: boolean; message: string | null; data: CmsOrbitCoinInsightsData }>(
      "/api/cms/marketplace/reports/orbitcoin-insights",
      { params },
    );
  },

  getEscrowPending(params?: {
    pageNumber?: number;
    pageSize?: number;
    from?: string;
    to?: string;
    search?: string;
  }) {
    return cmsAxios.get<CmsEscrowPendingResult>("/api/cms/marketplace/transactions/escrow/pending", { params });
  },

  exportRevenue(params: { from?: string; to?: string; groupBy?: string; format: "csv" | "xlsx" | "pdf" }) {
    return cmsAxios.get("/api/cms/marketplace/reports/payments/export", {
      params,
      responseType: "blob",
    });
  },

  exportTransactions(params: { source: "marketplace" | "orbitcoin"; from?: string; to?: string; format: "csv" | "xlsx" | "pdf" }) {
    return cmsAxios.get("/api/cms/marketplace/transactions/export", {
      params,
      responseType: "blob",
    });
  },
};