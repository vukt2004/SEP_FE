// src/services/api/learner/maps.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { UploadMapFromJsonParams, UploadMapApiResult } from "@/types/api/learner/maps";

/**
 * Learner Maps API
 * Handles map operations for learners
 */
export const learnerMapsApi = {
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
