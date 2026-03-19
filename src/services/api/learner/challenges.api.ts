// src/services/api/learner/challenges.api.ts
import { learnerAxios } from "@/services/http/axios.learner";
import type { ChallengesListResult } from "@/types/api/learner/challenges";

export const learnerChallengesApi = {
  getAll(page: number = 1, pageSize: number = 20) {
    return learnerAxios.get<ChallengesListResult>("/api/learner/challenges", {
      params: { page, pageSize },
    });
  },
};
