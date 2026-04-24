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

export const getOverview = async (): Promise<DashboardOverview> => {
  const usersResponse = await cmsAxios.get<PaginationResult>("/api/cms/users", {
    params: { pageNumber: 1, pageSize: 1 },
  });
  const mapsResponse = await cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/games", {
    params: { pageNumber: 1, pageSize: 1 },
  });
  const publishedMapsResponse = await cmsAxios.get<ApiResult<PaginationResult>>("/api/cms/games", {
    params: { pageNumber: 1, pageSize: 1, isPublished: true },
  });

  return {
    totalUsers: usersResponse.data.totalItems ?? 0,
    totalMaps: mapsResponse.data.data?.totalItems ?? 0,
    totalPublishedMaps: publishedMapsResponse.data.data?.totalItems ?? 0,
  };
};
export const dashboardApi = {
  getOverview,
};
