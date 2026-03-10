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
   * GET /api/cms/maps
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated maps list
   */
  getMaps(params?: GetMapsParams) {
    return cmsAxios.get<MapsListResult>("/api/cms/maps", { params });
  },

  /**
   * Get detailed map information by ID
   * GET /api/cms/maps/{id}
   *
   * @param id - Map ID
   * @param includeEditorialForUser - Whether to include editorial content (optional)
   * @returns Detailed map information
   */
  getMapById(id: string, includeEditorialForUser?: boolean) {
    return cmsAxios.get<MapDetailResult>(`/api/cms/maps/${id}`, {
      params: { includeEditorialForUser },
    });
  },

  /**
   * Approve a map
   * POST /api/cms/maps/{id}/approve
   *
   * @param id - Map ID
   * @param params - Review note (optional)
   * @returns Success result
   */
  approveMap(id: string, params?: ApproveMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/maps/${id}/approve`, null, { params });
  },

  /**
   * Reject a map
   * POST /api/cms/maps/{id}/reject
   *
   * @param id - Map ID
   * @param params - Reject reason (optional)
   * @returns Success result
   */
  rejectMap(id: string, params?: RejectMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/maps/${id}/reject`, null, { params });
  },

  /**
   * Upload a new map from JSON file (creates draft map)
   * POST /api/cms/maps/upload-json
   *
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Upload result with created map ID
   */
  uploadMapFromJson(params: {
    Title: string;
    Description: string;
    Type: "Topdown" | "Platform";
    Difficulty: number;
    TimeLimitMs: number;
    WinCondition: number;
    Price: number;
    MapDetailFile: File;
    HintsJson?: string;
    TagIdsCsv?: string;
  }) {
    const formData = new FormData();
    formData.append("Title", params.Title);
    formData.append("Description", params.Description);
    formData.append("Type", params.Type);
    formData.append("Difficulty", params.Difficulty.toString());
    formData.append("TimeLimitMs", params.TimeLimitMs.toString());
    formData.append("WinCondition", params.WinCondition.toString());
    formData.append("Price", params.Price.toString());

    if (params.HintsJson) {
      formData.append("HintsJson", params.HintsJson);
    }

    if (params.TagIdsCsv) {
      formData.append("TagIdsCsv", params.TagIdsCsv);
    }

    formData.append("MapDetailFile", params.MapDetailFile);

    return cmsAxios.post<ApiResult>("/api/cms/maps/upload-json", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Note: /api/cms/level-maps endpoints have been deprecated.
  // Map upload and management now use /api/cms/maps endpoints.
};
