import { learnerAxios } from "@/services/http/axios.learner";
import type { RecommendationResultApi } from "@/types/api/learner/recommendations";

export const learnerRecommendationsApi = {
  /**
   * GET /api/recommendations
   */
  async getRecommendations() {
    const response = await learnerAxios.get<RecommendationResultApi>("/api/recommendations");
    const payload = response.data?.data as
      | {
          recommendedMaps?: Array<Record<string, unknown>>;
          recommendedGames?: Array<Record<string, unknown>>;
          reviewMaps?: Array<Record<string, unknown>>;
          reviewGames?: Array<Record<string, unknown>>;
          suggestedPracticeMaps?: Array<Record<string, unknown>>;
          suggestedPracticeGames?: Array<Record<string, unknown>>;
        }
      | undefined;

    if (payload) {
      payload.recommendedMaps = payload.recommendedMaps ?? payload.recommendedGames ?? [];
      payload.reviewMaps = payload.reviewMaps ?? payload.reviewGames ?? [];
      payload.suggestedPracticeMaps =
        payload.suggestedPracticeMaps ?? payload.suggestedPracticeGames ?? [];

      const groups = [payload.recommendedMaps, payload.reviewMaps, payload.suggestedPracticeMaps];
      for (const group of groups) {
        for (const item of group ?? []) {
          if (item.gameId != null && item.mapId == null) {
            item.mapId = item.gameId;
          }
        }
      }
    }

    return response;
  },
};

