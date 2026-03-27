import { learnerAxios } from "@/services/http/axios.learner";
import type { XpLeaderboardResult } from "@/types/api/learner/xp";

const BASE = "/api/learner/xp";

export const learnerXpApi = {
  getLeaderboard(pageNumber = 1, pageSize = 20) {
    return learnerAxios.get<XpLeaderboardResult>(`${BASE}/leaderboard`, {
      params: { pageNumber, pageSize },
    });
  },
};
