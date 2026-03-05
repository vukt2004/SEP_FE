// src/services/api/cms/maps.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetMapsParams,
  MapsListResult,
  MapDetailResult,
  ApproveMapParams,
  RejectMapParams,
  UploadMapParams,
  UploadMapResult,
  GetLevelMapsParams,
  LevelMapsListResult,
  LevelMapDetailResult,
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

  /**
   * Upload a new level map
   * POST /api/cms/level-maps/upload
   *
   * @param params - Upload parameters with level file and metadata
   * @returns Upload result
   */
  uploadMap(params: UploadMapParams) {
    const formData = new FormData();
    formData.append("levelFile", params.levelFile);
    formData.append("name", params.name);
    formData.append("type", params.type);
    formData.append("difficulty", params.difficulty);

    return cmsAxios.post<UploadMapResult>("/api/cms/level-maps/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Get paginated list of level maps
   * GET /api/cms/level-maps
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated level maps list
   */
  getLevelMaps(params?: GetLevelMapsParams) {
    return cmsAxios.get<LevelMapsListResult>("/api/cms/level-maps", { params });
  },

  /**
   * Get level map detail by ID
   * GET /api/cms/level-maps/{id}
   *
   * @param id - Level map ID
   * @returns Level map detail with full JSON content
   */
  getLevelMapById(id: string) {
    return cmsAxios.get<LevelMapDetailResult>(`/api/cms/level-maps/${id}`);
  },
};
