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
  UpdateMapMetadataParams,
  DuplicateMapAsNewRequest,
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
  /**
   * Cập nhật metadata map (draft) — không gửi file JSON level.
   * PUT /api/learner/maps/{id}
   */
  updateMapMetadata(id: string, body: UpdateMapMetadataParams) {
    return learnerAxios.put<ApiResult>(`/api/learner/maps/${id}`, body);
  },

  uploadMapFromJson(params: UploadMapFromJsonParams) {
    const formData = new FormData();
    formData.append("Title", params.Title);
    formData.append("Description", params.Description);
    formData.append("Difficulty", params.Difficulty.toString());
    formData.append("Price", String(params.Price ?? 0));
    if (typeof params.FreeTrialAttemptLimit === "number") {
      formData.append("FreeTrialAttemptLimit", String(Math.max(0, params.FreeTrialAttemptLimit)));
    }

    if (params.TagIdsCsv) {
      formData.append("TagIdsCsv", params.TagIdsCsv);
    }

    if (params.LearnedTagsCsv) {
      formData.append("LearnedTagsCsv", params.LearnedTagsCsv);
    }

    formData.append("mapDetailFiles", params.MapDetailFile);

    if (params.AvatarFile) {
      formData.append("AvatarFile", params.AvatarFile);
    }

    for (const f of params.GalleryFiles ?? []) {
      formData.append("GalleryFiles", f);
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
  /**
   * Tạo bản ghi map mới từ map nguồn (MapId mới, contentVersion = 1). Map nguồn không đổi.
   * POST /api/learner/maps/{id}/duplicate-as-new
   */
  duplicateMapAsNew(id: string, body?: DuplicateMapAsNewRequest) {
    return learnerAxios.post<ApiResult<string | { id: string }>>(
      `/api/learner/maps/${id}/duplicate-as-new`,
      body ?? {},
    );
  },

  /**
   * Create a new draft version from an approved/published map in the same game line.
   * POST /api/learner/maps/{id}/create-version
   */
  createMapVersion(id: string) {
    return learnerAxios.post<ApiResult<string | { id: string }>>(
      `/api/learner/maps/${id}/create-version`,
    );
  },

  updateMapFromJson(id: string, params: UploadMapFromJsonParams) {
    const formData = new FormData();
    formData.append("Title", params.Title);
    formData.append("Description", params.Description);
    formData.append("Difficulty", params.Difficulty.toString());
    formData.append("Price", String(params.Price ?? 0));
    if (typeof params.FreeTrialAttemptLimit === "number") {
      formData.append("FreeTrialAttemptLimit", String(Math.max(0, params.FreeTrialAttemptLimit)));
    }

    if (params.TagIdsCsv) {
      formData.append("TagIdsCsv", params.TagIdsCsv);
    }

    if (params.LearnedTagsCsv) {
      formData.append("LearnedTagsCsv", params.LearnedTagsCsv);
    }

    formData.append("mapDetailFiles", params.MapDetailFile);

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
   * Append gallery media to an existing map (images/videos).
   * POST /api/learner/maps/{id}/gallery — form field "files" (one or more).
   */
  uploadMapGallery(id: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    return learnerAxios.post<ApiResult>(`/api/learner/maps/${id}/gallery`, formData, {
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
   * Publish an approved map (author only)
   * POST /api/learner/maps/{id}/publish
   *
   * @param id - Map ID to publish
   * @returns Publish result
   */
  publishMap(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/maps/${id}/publish`);
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

  /**
   * Purchase a paid map in marketplace with OrbitCoin
   * POST /api/learner/marketplace/maps/{id}/purchase
   *
   * @param id - Map ID
   * @returns Purchase result
   */
  purchaseMap(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/marketplace/maps/${id}/purchase`);
  },

  /**
   * Delete a map (author only, draft maps)
   * DELETE /api/learner/maps/{id}
   *
   * @param id - Map ID to delete
   * @returns Delete result
   */
  deleteMap(id: string) {
    return learnerAxios.delete<ApiResult<null>>(`/api/learner/maps/${id}`);
  },
};
