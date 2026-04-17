import { learnerAxios } from "@/services/http/axios.learner";
import type { ApiResult } from "@/types/api/common";

export const learnerMarketplaceApi = {
  /**
   * Purchase a paid map (price > 0) with OrbitCoin
   * POST /api/learner/marketplace/maps/{mapId}/purchase
   */
  purchaseMap(mapId: string) {
    return learnerAxios.post<ApiResult<null>>(`/api/learner/marketplace/games/${mapId}/purchase`);
  },
};

