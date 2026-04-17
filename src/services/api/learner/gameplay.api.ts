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
    const requestPayload: ValidateSolutionRequest = {
      ...payload,
      gameId: payload.gameId ?? payload.mapId,
      gameDetailId: payload.gameDetailId ?? payload.mapDetailId,
    };
    const { data } = await learnerAxios.post<ValidateSolutionResult>(
      "/api/learner/gameplay/validate",
      requestPayload,
    );
    return data;
  },

  /**
   * Get current user's map play history.
   * GET /api/learner/gameplay/my-play-history?pageNumber=&pageSize=&gameId=&playMode=
   */
  async getMyPlayHistory(
    params: { pageNumber?: number; pageSize?: number; gameId?: string; mapId?: string } = {},
  ) {
    const gameId = params.gameId ?? params.mapId;
    const { data } = await learnerAxios.get<MyPlayHistoryResult>(
      "/api/learner/gameplay/my-play-history",
      {
        params: {
          pageNumber: params.pageNumber ?? 1,
          pageSize: params.pageSize ?? 100,
          ...(gameId ? { gameId } : {}),
        },
      },
    );

    const items = data?.data?.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.gameId && !item.mapId) {
          item.mapId = item.gameId;
        }
        if (item.gameTitle && !item.mapTitle) {
          item.mapTitle = item.gameTitle;
        }
      }
    }

    return data;
  },
};
