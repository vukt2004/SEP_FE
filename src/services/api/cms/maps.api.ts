// src/services/api/cms/maps.api.ts
import { cmsAxios } from "@/services/http/axios.cms";
import type {
  GetMapsParams,
  GamesListResult,
  GameDetailResult,
  ApproveMapParams,
  RejectMapParams,
  MapTagsResult,
} from "@/types/api/cms/maps";
import type { ApiResult } from "@/types/api/common";
import type { DuplicateGameAsNewRequest, UploadGameFromJsonParams } from "@/types/api/learner/maps";

const GAME_FIELD_ALIASES: Array<[source: string, target: string]> = [
  ["gameId", "mapId"],
  ["gameDetailId", "mapDetailId"],
  ["gameStatus", "mapStatus"],
  ["gameDetailJson", "mapDetailJson"],
  ["gameTitle", "mapTitle"],
];

function normalizeGameContractDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeGameContractDeep(item));
    return value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  for (const [source, target] of GAME_FIELD_ALIASES) {
    if (record[source] != null && record[target] == null) {
      record[target] = record[source];
    }
  }

  for (const key of Object.keys(record)) {
    const child = record[key];
    if (child && typeof child === "object") {
      normalizeGameContractDeep(child);
    }
  }

  return value;
}

/**
 * CMS Maps API
 * Handles CRUD operations for maps
 */
export const cmsMapsApi = {
  /**
   * Get paginated list of all maps
    * GET /api/cms/games
   *
   * @param params - Query parameters (page, size, filters)
   * @returns Paginated maps list
   */
  getMaps(params?: GetMapsParams) {
    return cmsAxios.get<GamesListResult>("/api/cms/games", { params }).then((response) => {
      normalizeGameContractDeep(response.data?.data);
      return response;
    });
  },

  /**
   * Get paginated list of locked games.
   * GET /api/cms/games/locked
   */
  getLockedMaps(params?: Pick<GetMapsParams, "pageNumber" | "pageSize">) {
    return cmsAxios.get<GamesListResult>("/api/cms/games/locked", { params }).then((response) => {
      normalizeGameContractDeep(response.data?.data);
      return response;
    });
  },

  /**
   * Get detailed map information by ID
    * GET /api/cms/games/{id}
   *
   * @param id - Map ID
   * @param includeEditorialForUser - Whether to include editorial content (optional)
   * @returns Detailed map information
   */
  getMapById(id: string, includeEditorialForUser?: boolean) {
    return cmsAxios
      .get<GameDetailResult>(`/api/cms/games/${id}`, {
        params: { includeEditorialForUser },
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Get available map tags
   * GET /api/cms/games/tags
   */
  getMapTags() {
    return cmsAxios.get<MapTagsResult>("/api/cms/games/tags");
  },

  /**
   * Approve a map
    * POST /api/cms/games/{id}/approve
   *
   * @param id - Map ID
   * @param params - Review note (optional)
   * @returns Success result
   */
  approveMap(id: string, params?: ApproveMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/approve`, null, { params });
  },

  /**
   * Reject a map
    * POST /api/cms/games/{id}/reject
   *
   * @param id - Map ID
   * @param params - Reject reason (optional)
   * @returns Success result
   */
  rejectMap(id: string, params?: RejectMapParams) {
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/reject`, null, { params });
  },

  /**
   * Publish an Approved map to the learner catalog (Admin / Moderator).
   * POST /api/cms/games/{id}/publish
   */
  publishMap(id: string) {
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/publish`);
  },

  /**
   * Lock a game from learner catalog visibility.
   * POST /api/cms/games/{id}/lock
   */
  lockMap(id: string, note?: string) {
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/lock`, null, {
      params: { note: note?.trim() || undefined },
    });
  },

  /**
   * Unlock a game and optionally republish if status is Published.
   * POST /api/cms/games/{id}/unlock
   */
  unlockMap(id: string, republishIfPublishedStatus = true) {
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/unlock`, null, {
      params: { republishIfPublishedStatus },
    });
  },

  /**
   * Upload a new map from JSON file (creates draft map)
    * POST /api/cms/games/upload-json
   *
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Upload result with created map ID
   */
  uploadMapFromJson(params: UploadGameFromJsonParams) {
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

    const gameDetailFile = params.GameDetailFile ?? params.MapDetailFile;
    if (gameDetailFile) {
      formData.append("gameDetailFiles", gameDetailFile);
    }

    if (params.AvatarFile) {
      formData.append("AvatarFile", params.AvatarFile);
    }

    for (const f of params.GalleryFiles ?? []) {
      formData.append("GalleryFiles", f);
    }

    return cmsAxios.post<ApiResult>("/api/cms/games/upload-json", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Update an existing map from JSON file (draft only)
   * PUT /api/cms/games/{id}/upload-json
   */
  duplicateMapAsNew(id: string, body?: DuplicateGameAsNewRequest) {
    return cmsAxios.post<ApiResult<string | { id: string }>>(
      `/api/cms/games/${id}/duplicate-as-new`,
      body ?? {},
    );
  },

  updateMapFromJson(id: string, params: UploadGameFromJsonParams) {
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

    const gameDetailFile = params.GameDetailFile ?? params.MapDetailFile;
    if (gameDetailFile) {
      formData.append("gameDetailFiles", gameDetailFile);
    }

    if (params.AvatarFile) {
      formData.append("AvatarFile", params.AvatarFile);
    }

    return cmsAxios.put<ApiResult>(`/api/cms/games/${id}/upload-json`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
    * POST /api/cms/games/{id}/gallery — form field "files" (one or more).
   */
  uploadMapGallery(id: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    return cmsAxios.post<ApiResult>(`/api/cms/games/${id}/gallery`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  // Note: /api/cms/level-maps endpoints have been deprecated.
  // Game upload and management now use /api/cms/games endpoints.
};
