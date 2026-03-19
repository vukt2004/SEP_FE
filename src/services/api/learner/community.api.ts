// src/services/api/learner/community.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { ApiResult } from "@/types/api/common";
import type { RateMapParams, ReportMapParams } from "@/types/api/learner/community";

/**
 * Learner Community API
 * Handles community interactions (rating, reporting, etc.)
 */
export const learnerCommunityApi = {
  /**
   * Rate a community map
   * POST /api/learner/community/maps/{id}/rate
   *
   * @param id - Map ID to rate
   * @param params - Rating and comment
   * @returns Rating result
   */
  rateMap(id: string, params: RateMapParams) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/community/maps/${id}/rate`, params);
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
    return learnerAxios.post<ApiResult<string>>(`/api/learner/community/maps/${id}/report`, params);
  },
};
