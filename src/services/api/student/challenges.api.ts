// src/services/api/student/challenges.api.ts
import { studentAxios } from "@/services/http/axios.student";
import type { ChallengesListResult } from "@/types/api/student/challenges";

export const studentChallengesApi = {
  getAll(page: number = 1, pageSize: number = 20) {
    return studentAxios.get<ChallengesListResult>("/api/learner/challenges", {
      params: { page, pageSize },
    });
  },
};
