import { learnerAxios } from "@/services/http/axios.learner";
import type { RecommendationResultApi } from "@/types/api/learner/recommendations";

export const learnerRecommendationsApi = {
  /**
   * GET /api/recommendations
   */
  getRecommendations() {
    return learnerAxios.get<RecommendationResultApi>("/api/recommendations");
  },
};

