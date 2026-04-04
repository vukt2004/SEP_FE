import { learnerAxios } from "@/services/http/axios.learner";
import type {
  ValidateSolutionRequest,
  ValidateSolutionResult,
  MyPlayHistoryResult,
} from "@/types/api/learner/gameplay";

export const learnerGameplayApi = {
  /**
   * Validate solution & save play history.
   * POST /api/learner/gameplay/validate
   */
  async validateSolution(payload: ValidateSolutionRequest) {
    const { data } = await learnerAxios.post<ValidateSolutionResult>(
      "/api/learner/gameplay/validate",
      payload,
    );
    return data;
  },

  /**
   * Get current user's map play history.
   * GET /api/learner/gameplay/my-play-history?pageNumber=&pageSize=&mapId=&playMode=
   */
  async getMyPlayHistory(params: { pageNumber?: number; pageSize?: number; mapId?: string } = {}) {
    const { data } = await learnerAxios.get<MyPlayHistoryResult>(
      "/api/learner/gameplay/my-play-history",
      {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 100,
          ...(params.mapId ? { mapId: params.mapId } : {}),
        },
      },
    );
    return data;
  },
};

