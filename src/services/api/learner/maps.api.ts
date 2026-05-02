// src/services/api/learner/maps.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type {
  UploadGameFromJsonParams,
  UploadMapApiResult,
  GetMapsParams,
  GamesListResult,
  MostPlayedCreatedMapsLeaderboardResult,
  GameDetailResult,
  GameOwnershipResult,
  GameInfoResult,
  MapTagsResult,
  UpdateGameMetadataParams,
  DuplicateGameAsNewRequest,
} from "@/types/api/learner/maps";
import type { ApiResult } from "@/types/api/common";
import type { LeaderboardPeriodType } from "@/types/api/learner/xp";

const GAME_FIELD_ALIASES: Array<[source: string, target: string]> = [
  ["gameId", "mapId"],
  ["gameDetailId", "mapDetailId"],
  ["selectedGameId", "selectedMapId"],
  ["gameStatus", "mapStatus"],
  ["gameDetailJson", "mapDetailJson"],
  ["gameTitle", "mapTitle"],
  ["AvatarUrl", "avatarUrl"],
  ["Gallery", "gallery"],
  /** Nested media DTOs (e.g. gallery items) may use PascalCase from some serializers */
  ["Url", "url"],
  ["Kind", "kind"],
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
 * Learner Maps API
 * Handles map operations for learners
 */
export const learnerMapsApi = {
  /**
   * Get all maps owned by current user (created + purchased with OrbitCoin)
   * GET /api/learner/games/my-games
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of user's maps
   */
  getMyMaps(params?: GetMapsParams) {
    return learnerAxios
      .get<GamesListResult>("/api/learner/games/my-games", {
        params,
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Get list of maps with filters and pagination
   * GET /api/learner/games
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated list of maps
   */
  getMaps(params?: GetMapsParams) {
    return learnerAxios
      .get<GamesListResult>("/api/learner/games", {
        params,
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  getMostPlayedCreatedLeaderboard(
    periodType: LeaderboardPeriodType = "Week",
    pageNumber = 1,
    pageSize = 20,
  ) {
    return learnerAxios
      .get<MostPlayedCreatedMapsLeaderboardResult>(
        "/api/learner/games/leaderboard/most-played-created",
        {
          params: { periodType, pageNumber, pageSize },
        },
      )
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Get detailed map information by ID
    * GET /api/learner/games/{id}
   *
   * @param id - Map ID
   * @param includeEditorialForUser - Whether to include editorial content (optional)
   * @returns Detailed map information
   */
  getMapById(id: string, includeEditorialForUser: boolean = false) {
    return learnerAxios
      .get<GameDetailResult>(`/api/learner/games/${id}`, {
        params: { includeEditorialForUser },
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Get the newest game version in the same line for learner playtesting.
   * GET /api/learner/games/{id}/latest
   */
  getLatestMapById(id: string) {
    return learnerAxios.get<GameDetailResult>(`/api/learner/games/${id}/latest`).then((response) => {
      normalizeGameContractDeep(response.data?.data);
      return response;
    });
  },

  /**
   * Get lightweight map info for marketplace modal
   * GET /api/learner/games/{id}/info
   */
  getMapInfo(id: string) {
    return learnerAxios.get<GameInfoResult>(`/api/learner/games/${id}/info`).then((response) => {
      normalizeGameContractDeep(response.data?.data);
      return response;
    });
  },

  /**
   * Get hints for a map during gameplay
    * GET /api/learner/gameplay/games/{id}/hints
   *
   * @param id - Map ID
   * @returns List of hints with orderNo and content
   */
  getMapHints(id: string) {
    return learnerAxios.get<ApiResult<Array<{ orderNo: number; content: string }>>>(
      `/api/learner/gameplay/games/${id}/hints`,
    );
  },

  /**
   * Get available map tags
   * GET /api/learner/games/tags
   */
  getMapTags() {
    return learnerAxios.get<MapTagsResult>("/api/learner/games/tags");
  },

  /**
   * Check if current user owns/has access to a map
    * GET /api/learner/games/{id}/check-ownership
   *
   * @param id - Map ID
   * @returns Ownership check result
   */
  checkMapOwnership(id: string) {
    return learnerAxios
      .get<GameOwnershipResult>(`/api/learner/games/${id}/check-ownership`)
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Upload a new map from JSON file (creates draft map)
    * POST /api/learner/games/upload-json
   *
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Upload result with created map ID
   */
  /**
   * Cập nhật metadata map (draft) — không gửi file JSON level.
   * PUT /api/learner/games/{id}
   */
  updateMapMetadata(id: string, body: UpdateGameMetadataParams) {
    return learnerAxios.put<ApiResult>(`/api/learner/games/${id}`, body);
  },

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

    return learnerAxios
      .post<UploadMapApiResult>("/api/learner/games/upload-json", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Update an existing map from JSON file (draft only)
    * PUT /api/learner/games/{id}/upload-json
   *
   * @param id - Map ID to update
   * @param params - Upload parameters with map metadata and JSON file
   * @returns Update result
   */
  /**
   * Tạo bản ghi map mới từ map nguồn (MapId mới, contentVersion = 1). Map nguồn không đổi.
   * POST /api/learner/games/{id}/duplicate-as-new
   */
  duplicateMapAsNew(id: string, body?: DuplicateGameAsNewRequest) {
    return learnerAxios.post<ApiResult<string | { id: string }>>(
      `/api/learner/games/${id}/duplicate-as-new`,
      body ?? {},
    );
  },

  /**
   * Create a new draft version from an approved/published map in the same game line.
   * POST /api/learner/games/{id}/create-version
   */
  createMapVersion(id: string) {
    return learnerAxios.post<ApiResult<string | { id: string }>>(
      `/api/learner/games/${id}/create-version`,
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

    return learnerAxios
      .put<UploadMapApiResult>(`/api/learner/games/${id}/upload-json`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        normalizeGameContractDeep(response.data?.data);
        return response;
      });
  },

  /**
   * Upload/replace map avatar image
    * POST /api/learner/games/{id}/avatar
   *
   * @param id - Map ID
   * @param avatar - Image file
   */
  uploadMapAvatar(id: string, avatar: File) {
    const formData = new FormData();
    formData.append("avatar", avatar);

    return learnerAxios.post<ApiResult>(`/api/learner/games/${id}/avatar`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Append gallery media to an existing map (images/videos).
    * POST /api/learner/games/{id}/gallery — form field "files" (one or more).
   */
  uploadMapGallery(id: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) {
      formData.append("files", f);
    }
    return learnerAxios.post<ApiResult>(`/api/learner/games/${id}/gallery`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },

  /**
   * Submit a draft map for review (author only)
    * POST /api/learner/games/{id}/submit
   *
   * @param id - Map ID to submit
   * @returns Submit result
   */
  submitMapForReview(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/games/${id}/submit`);
  },

  /**
   * Publish an approved map (author only)
    * POST /api/learner/games/{id}/publish
   *
   * @param id - Map ID to publish
   * @returns Publish result
   */
  publishMap(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/games/${id}/publish`);
  },

  /**
   * Add free map to user's collection (published maps with price = 0 or null)
    * POST /api/learner/games/{id}/add-to-my-games
   *
   * @param id - Map ID
   * @returns Add result (success if already in collection)
   */
  addMapToMyMaps(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/games/${id}/add-to-my-games`);
  },

  /**
   * Purchase a paid map in marketplace with OrbitCoin
   * POST /api/learner/marketplace/maps/{id}/purchase
   *
   * @param id - Map ID
   * @returns Purchase result
   */
  purchaseMap(id: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/marketplace/games/${id}/purchase`);
  },

  /**
   * Delete a map (author only, draft maps)
    * DELETE /api/learner/games/{id}
   *
   * @param id - Map ID to delete
   * @returns Delete result
   */
  deleteMap(id: string) {
    return learnerAxios.delete<ApiResult<null>>(`/api/learner/games/${id}`);
  },
};
