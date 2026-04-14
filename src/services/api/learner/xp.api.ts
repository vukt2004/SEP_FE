import { learnerAxios } from "@/services/http/axios.learner";
import type {
  LeaderboardPeriodType,
  XpGainLeaderboardResult,
  XpLeaderboardResult,
} from "@/types/api/learner/xp";

const BASE = "/api/learner/xp";

export const learnerXpApi = {
  getTopLevelLeaderboard(pageNumber = 1, pageSize = 20) {
    return learnerAxios.get<XpLeaderboardResult>(`${BASE}/leaderboard/top-level`, {
      params: { pageNumber, pageSize },
    });
  },

  getXpGainLeaderboard(periodType: LeaderboardPeriodType = "Week", pageNumber = 1, pageSize = 20) {
    return learnerAxios.get<XpGainLeaderboardResult>(`${BASE}/leaderboard/xp-gain`, {
      params: { periodType, pageNumber, pageSize },
    });
  },

  // Backward-compatible alias for old callers.
  getLeaderboard(pageNumber = 1, pageSize = 20) {
    return learnerXpApi.getTopLevelLeaderboard(pageNumber, pageSize);
  },
};
