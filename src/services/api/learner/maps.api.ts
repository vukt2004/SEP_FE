// src/services/api/learner/maps.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type {
  UploadMapFromJsonParams,
  UploadMapApiResult,
  GetMapsParams,
  MapsListResult,
  MapDetailResult,
} from "@/types/api/learner/maps";

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

    return learnerAxios.post<UploadMapApiResult>("/api/learner/maps/upload-json", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
