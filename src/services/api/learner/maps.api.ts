// src/services/api/learner/maps.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type {
  UploadMapFromJsonParams,
  UploadMapApiResult,
  GetMapsParams,
  MapsListResult,
  MapDetailResult,
  MapOwnershipResult,
  MapInfoResult,
  MapTagsResult,
} from "@/types/api/learner/maps";
import type { ApiResult } from "@/types/api/common";

/**
 * Learner Maps API
 * Handles map operations for learners
 */
export const learnerMapsApi = {
  /**
   * Get all maps owned by current user (created + purchased with OrbitCoin)
   * GET /api/learner/maps/my-maps
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of user's maps
   */
  getMyMaps(params?: GetMapsParams) {
    return learnerAxios.get<MapsListResult>("/api/learner/maps/my-maps", {
      params,
    });
  },

  /**
   * Get list of maps with filters and pagination
   * GET /api/learner/maps
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of maps
   */
  getMaps(params?: GetMapsParams) {
    return learnerAxios.get<MapsListResult>("/api/learner/maps", {
      params,
    });
  },

  /**
   * Get detailed map information by ID
   * GET /api/learner/maps/{id}
   *
   * @param id - Map ID
   * @param includeEditorialForUser - Whether to include editorial content (optional)
   * @returns Detailed map information
   */
  getMapById(id: string, includeEditorialForUser: boolean = false) {
    return learnerAxios.get<MapDetailResult>(`/api/learner/maps/${id}`, {
      params: { includeEditorialForUser },
    });
  },

  /**
   * Get lightweight map info for marketplace modal
   * GET /api/learner/maps/{id}/info
   */
  getMapInfo(id: string) {
    return learnerAxios.get<MapInfoResult>(`/api/learner/maps/${id}/info`);
  },

  /**
   * Get hints for a map during gameplay
   * GET /api/learner/gameplay/maps/{id}/hints
   *
   * @param id - Map ID
   * @returns List of hints with orderNo and content
   */
  getMapHints(id: string) {
    return learnerAxios.get<ApiResult<Array<{ orderNo: number; content: string }>>>(
      `/api/learner/gameplay/maps/${id}/hints`,
    );
  },

  /**
   * Get available map tags
   * GET /api/learner/maps/tags
   */
  getMapTags() {
    return learnerAxios.get<MapTagsResult>("/api/learner/maps/tags");
  },

  /**
   * Check if current user owns/has access to a map
   * GET /api/learner/maps/{id}/check-ownership
   *
   * @param id - Map ID
   * @returns Ownership check result
   */
  checkMapOwnership(id: string) {
    return learnerAxios.get<MapOwnershipResult>(`/api/learner/maps/${id}/check-ownership`);
  },

  /**
   * Upload a new map from JSON file (creates draft map)
   * POST /api/learner/maps/upload-json
   *
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Upload result with created map ID
   */
  uploadMapFromJson(params: UploadMapFromJsonParams) {
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

    if (params.AvatarFile) {
      formData.append("AvatarFile", params.AvatarFile);
    }

    return learnerAxios.post<UploadMapApiResult>("/api/learner/maps/upload-json", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Update an existing map from JSON file (draft only)
   * PUT /api/learner/maps/{id}/upload-json
   *
   * @param id - Map ID to update
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Update result
   */
  updateMapFromJson(id: string, params: UploadMapFromJsonParams) {
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

    if (params.AvatarFile) {
      formData.append("AvatarFile", params.AvatarFile);
    }

    return learnerAxios.put<UploadMapApiResult>(`/api/learner/maps/${id}/upload-json`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Upload/replace map avatar image
   * POST /api/learner/maps/{id}/avatar
   *
   * @param id - Map ID
   * @param avatar - Image file
   */
  uploadMapAvatar(id: string, avatar: File) {
    const formData = new FormData();
    formData.append("avatar", avatar);

    return learnerAxios.post<ApiResult>(`/api/learner/maps/${id}/avatar`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Submit a draft map for review (author only)
   * POST /api/learner/maps/{id}/submit
   *
   * @param id - Map ID to submit
   * @returns Submit result
   */
  submitMapForReview(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/maps/${id}/submit`);
  },

  /**
   * Add free map to user's collection (published maps with price = 0 or null)
   * POST /api/learner/maps/{id}/add-to-my-maps
   *
   * @param id - Map ID
   * @returns Add result (success if already in collection)
   */
  addMapToMyMaps(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/maps/${id}/add-to-my-maps`);
  },
};
