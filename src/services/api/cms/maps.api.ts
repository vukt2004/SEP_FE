// src/services/api/cms/maps.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetMapsParams,
  MapsListResult,
  MapDetailResult,
  ApproveMapParams,
  RejectMapParams,
  MapTagsResult,
} from "@/types/api/cms/maps";
import type { ApiResult } from "@/types/api/common";
import type { UploadMapFromJsonParams } from "@/types/api/learner/maps";

/**
 * CMS Maps API
 * Handles CRUD operations for maps
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
    return cmsAxios.get<MapsListResult>("/api/cms/maps/all", { params });
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
   * Get available map tags
   * GET /api/cms/maps/tags
   */
  getMapTags() {
    return cmsAxios.get<MapTagsResult>("/api/cms/maps/tags");
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
   * Publish an Approved map to the learner catalog (Admin / Moderator).
   * POST /api/cms/maps/{id}/publish
   */
  publishMap(id: string) {
    return cmsAxios.post<ApiResult>(`/api/cms/maps/${id}/publish`);
  },

  /**
   * Upload a new map from JSON file (creates draft map)
   * POST /api/cms/maps/upload-json
   *
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Upload result with created map ID
   */
  uploadMapFromJson(params: UploadMapFromJsonParams) {
    const formData = new FormData();
    formData.append("Title", params.Title);
    formData.append("Description", params.Description);
    formData.append("Difficulty", params.Difficulty.toString());
    formData.append("Price", String(params.Price ?? 0));

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

    return cmsAxios.post<ApiResult>("/api/cms/maps/upload-json", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Update an existing map from JSON file (draft only)
   * PUT /api/cms/maps/{id}/upload-json
   */
  updateMapFromJson(id: string, params: UploadMapFromJsonParams) {
    const formData = new FormData();
    formData.append("Title", params.Title);
    formData.append("Description", params.Description);
    formData.append("Difficulty", params.Difficulty.toString());
    formData.append("Price", String(params.Price ?? 0));

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

    return cmsAxios.put<ApiResult>(`/api/cms/maps/${id}/upload-json`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * POST /api/cms/maps/{id}/gallery — form field "files" (one or more).
   */
  uploadMapGallery(id: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    return cmsAxios.post<ApiResult>(`/api/cms/maps/${id}/gallery`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Note: /api/cms/level-maps endpoints have been deprecated.
  // Map upload and management now use /api/cms/maps endpoints.
};
