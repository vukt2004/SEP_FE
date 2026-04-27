import { cmsAxios } from "@/services/http/axios.cms";
import type { ApiResult } from "@/types/api/common";

interface PaginationResult {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface DashboardOverview {
  totalUsers: number;
  totalMaps: number;
  totalPublishedMaps: number;
}

export interface DashboardTrendPoint {
  period: string;
  grossRevenueVnd: number;
  transactionCount: number;
}

export interface DashboardAnalytics {
  mapStatusCounts: Array<{ name: string; value: number }>;
  complaintStatusCounts: Array<{ name: string; value: number }>;
  revenueTrend: DashboardTrendPoint[];
}

const mapStatusLabels: Record<number, string> = {
  0: "Draft",
  1: "PendingReview",
  2: "Approved",
  3: "Rejected",
  4: "Published",
};

const complaintStatuses = [
  "Open",
  "SellerPending",
  "FixInProgress",
  "FixSubmitted",
  "ResolvedRefund",
  "ResolvedReject",
  "Closed",
];

const getTotalItems = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") return 0;
  const anyPayload = payload as { totalItems?: unknown };
  return typeof anyPayload.totalItems === "number" ? anyPayload.totalItems : 0;
};

export const getOverview = async (): Promise<DashboardOverview> => {
  const usersResponse = await cmsAxios.get<PaginationResult>("/api/cms/users", {
    params: { pageNumber: 1, pageSize: 1 },
  });
  const mapsResponse = await cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/games", {
    params: { pageNumber: 1, pageSize: 1 },
  });
  const publishedMapsResponse = await cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/games", {
    params: { pageNumber: 1, pageSize: 1, gameStatus: 4 },
  });

  return {
    totalUsers: usersResponse.data.totalItems ?? 0,
    totalMaps: mapsResponse.data.data?.totalItems ?? 0,
    totalPublishedMaps: publishedMapsResponse.data.data?.totalItems ?? 0,
  };
};

export const getAnalytics = async (): Promise<DashboardAnalytics> => {
  const mapStatusCalls = Object.keys(mapStatusLabels).map((statusKey) =>
    cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/games", {
      params: { pageNumber: 1, pageSize: 1, gameStatus: Number(statusKey) },
    }),
  );

  const complaintCalls = complaintStatuses.map((status) =>
    cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/complaints", {
      params: { pageNumber: 1, pageSize: 1, status },
    }),
  );

  const [mapStatusResponses, complaintResponses, revenueOverviewResponse] = await Promise.all([
    Promise.all(mapStatusCalls),
    Promise.all(complaintCalls),
    cmsAxios.get<ApiResult<{ trend?: Array<{ period?: string; grossRevenueVnd?: number; transactionCount?: number }> }>>(
      "/api/cms/marketplace/reports/overview",
      { params: { groupBy: "Month" } },
    ),
  ]);

  const mapStatusCounts = mapStatusResponses.map((response, idx) => {
    const statusCode = Number(Object.keys(mapStatusLabels)[idx]);
    return {
      name: mapStatusLabels[statusCode],
      value: getTotalItems(response.data?.data),
    };
  });

  const complaintStatusCounts = complaintResponses.map((response, idx) => ({
    name: complaintStatuses[idx],
    value: getTotalItems(response.data?.data),
  }));

  const revenueTrend = (revenueOverviewResponse.data?.data?.trend ?? []).map((item) => ({
    period: item.period ?? "-",
    grossRevenueVnd: typeof item.grossRevenueVnd === "number" ? item.grossRevenueVnd : 0,
    transactionCount: typeof item.transactionCount === "number" ? item.transactionCount : 0,
  }));

  return { mapStatusCounts, complaintStatusCounts, revenueTrend };
};

export const dashboardApi = {
  getOverview,
  getAnalytics,
};
