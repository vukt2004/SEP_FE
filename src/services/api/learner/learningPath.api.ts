// src/services/api/learner/learningPath.api.ts
// Learning Path – align with BE /api/learner/learning-path

import { learnerAxios } from "@/services/http/axios.learner";
import type { ApiResult } from "@/types/api/common";
import type {
  GoalsResult,
  GoalResult,
  MyPathResult,
  SelectLearningGoalRequest,
  ConceptDetailResult,
  ConceptCompletionResult,
  ConceptsListResult,
  PathItemsPreviewResult,
  SelectedGoalResult,
  ProgressResult,
} from "@/types/api/learner/learningPath";

const BASE = "/api/learner/learning-path";

function normalizeGameFields<T>(value: T): T {
  if (Array.isArray(value)) {
    value.forEach((item) => normalizeGameFields(item));
    return value;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const row = value as Record<string, unknown>;
  if (row.gameId != null && row.mapId == null) row.mapId = row.gameId;
  if (row.gameTitle != null && row.mapTitle == null) row.mapTitle = row.gameTitle;
  if (row.gameDescription != null && row.mapDescription == null)
    row.mapDescription = row.gameDescription;
  if (row.gameDifficulty != null && row.mapDifficulty == null)
    row.mapDifficulty = row.gameDifficulty;
  if (row.gameAvatarUrl != null && row.mapAvatarUrl == null) row.mapAvatarUrl = row.gameAvatarUrl;
  if (row.suggestedReviewGameIds != null && row.suggestedReviewMapIds == null)
    row.suggestedReviewMapIds = row.suggestedReviewGameIds;

  for (const key of Object.keys(row)) {
    const child = row[key];
    if (child && typeof child === "object") {
      normalizeGameFields(child);
    }
  }

  return value;
}

export const learnerLearningPathApi = {
  /** GET goals – danh sách mục tiêu học tập */
  getGoals() {
    return learnerAxios.get<GoalsResult>(`${BASE}/goals`);
  },

  /** GET goals/:goalId – chi tiết một goal */
  getGoalById(goalId: string) {
    return learnerAxios.get<GoalResult>(`${BASE}/goals/${goalId}`);
  },

  /** GET goals/:goalId/path-items – xem trước lộ trình theo goal (cấu trúc, không auth) */
  getPathItemsByGoal(goalId: string) {
    return learnerAxios.get<PathItemsPreviewResult>(`${BASE}/goals/${goalId}/path-items`).then((r) => {
      normalizeGameFields(r.data?.data);
      return r;
    });
  },

  /** POST goals/select – chọn mục tiêu. Auth required. */
  selectGoal(request: SelectLearningGoalRequest) {
    return learnerAxios.post<ApiResult<unknown>>(`${BASE}/goals/select`, request);
  },

  /** GET my-path – lộ trình hiện tại (goal đã chọn + items + IsCompleted, IsUnlocked). Auth required. */
  getMyPath() {
    return learnerAxios.get<MyPathResult>(`${BASE}/my-path`).then((r) => {
      normalizeGameFields(r.data?.data);
      return r;
    });
  },

  /** GET my-path/selected-goal – mục tiêu đang chọn. Auth required. */
  getSelectedGoal() {
    return learnerAxios.get<SelectedGoalResult>(`${BASE}/my-path/selected-goal`);
  },

  /** GET my-path/progress – tiến độ lộ trình. Auth required. */
  getMyPathProgress() {
    return learnerAxios.get<ProgressResult>(`${BASE}/my-path/progress`).then((r) => {
      normalizeGameFields(r.data?.data);
      return r;
    });
  },

  /** GET concepts?learningGoalId= – danh sách concept (optional filter theo goal) */
  getConcepts(learningGoalId?: string | null) {
    const params = learningGoalId ? { learningGoalId } : {};
    return learnerAxios.get<ConceptsListResult>(`${BASE}/concepts`, { params });
  },

  /** GET concepts/:conceptId – chi tiết concept (name, description, contentKey) */
  getConceptById(conceptId: string) {
    return learnerAxios.get<ConceptDetailResult>(`${BASE}/concepts/${conceptId}`);
  },

  /** GET concepts/:conceptId/completion – trạng thái hoàn thành concept của user. Auth required. */
  getConceptCompletion(conceptId: string) {
    return learnerAxios.get<ConceptCompletionResult>(`${BASE}/concepts/${conceptId}/completion`);
  },

  /** POST concepts/:conceptId/complete – đánh dấu đã hoàn thành. Auth required. */
  completeConcept(conceptId: string) {
    return learnerAxios.post<ApiResult<unknown>>(`${BASE}/concepts/${conceptId}/complete`);
  },
};
