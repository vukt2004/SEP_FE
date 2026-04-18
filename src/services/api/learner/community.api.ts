// src/services/api/learner/community.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { ApiResult } from "@/types/api/common";
import type {
  GameRatingItem,
  RateMapParams,
  ReportMapParams,
} from "@/types/api/learner/community";

/**
 * Learner Community API
 * Handles community interactions (rating, reporting, etc.)
 */
export const learnerCommunityApi = {
  /**
   * Get list of ratings for a game
   * GET /api/learner/community/games/{id}/ratings?isAuthor=false
   *
   * @param id - Game ID
   * @param isAuthor - Filter by author ratings
   */
  getMapRatings(id: string, isAuthor: boolean = false) {
    return learnerAxios.get<ApiResult<GameRatingItem[]>>(`/api/learner/community/games/${id}/ratings`, {
      params: { isAuthor },
    });
  },

  /**
   * @deprecated Use getMapRatings instead.
   */
  getGameRatings(id: string, isAuthor: boolean = false) {
    return this.getMapRatings(id, isAuthor);
  },

  /**
   * Rate a community map
   * POST /api/learner/community/maps/{id}/rate
   *
   * @param id - Map ID to rate
   * @param params - Rating and comment
   * @returns Rating result
   */
  rateMap(id: string, params: RateMapParams) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/community/games/${id}/rate`, params);
  },

  /**
   * @deprecated Use rateMap instead.
   */
  rateGame(id: string, params: RateMapParams) {
    return this.rateMap(id, params);
  },

  /**
   * Report a community map
   * POST /api/learner/community/maps/{id}/report
   *
   * @param id - Map ID to report
   * @param params - Report reason and details
   * @returns Report result with report ID
   */
  reportMap(id: string, params: ReportMapParams) {
    return learnerAxios.post<ApiResult<string>>(`/api/learner/community/games/${id}/report`, params);
  },
};
