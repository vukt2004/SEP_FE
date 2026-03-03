// src/services/api/cms/maps.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetMapsParams,
  MapsListResult,
  MapDetailResult,
  ApproveMapParams,
  RejectMapParams,
} from "@/types/api/cms/maps";
import type { ApiResult } from "@/types/api/common";

/**
 * CMS Maps API
 * Handles CRUD operations for challenge maps
 */
export const cmsMapsApi = {
  /**
   * Get paginated list of all maps
   * GET /api/cms/challenges/maps
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated maps list
   */
  getMaps(params?: GetMapsParams) {
    return cmsAxios.get<MapsListResult>("/api/cms/challenges/maps", { params });
  },

  /**
   * Get detailed map information by ID
   * GET /api/cms/challenges/maps/{id}
   *
   * @param id - Map ID
   * @returns Detailed map information
   */
  getMapById(id: string) {
    return cmsAxios.get<MapDetailResult>(`/api/cms/challenges/maps/${id}`);
  },

  /**
   * Approve a map
   * POST /api/cms/challenges/maps/{id}/approve
   *
   * @param id - Map ID
   * @param params - Review note (optional)
   * @returns Success result
   */
  approveMap(id: string, params?: ApproveMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/challenges/maps/${id}/approve`, null, { params });
  },

  /**
   * Reject a map
   * POST /api/cms/challenges/maps/{id}/reject
   *
   * @param id - Map ID
   * @param params - Reject reason (optional)
   * @returns Success result
   */
  rejectMap(id: string, params?: RejectMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/challenges/maps/${id}/reject`, null, { params });
  },
};
