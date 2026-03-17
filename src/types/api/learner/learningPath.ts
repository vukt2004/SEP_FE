// src/types/api/learner/learningPath.ts
// Learning Path API – align with BE /api/learner/learning-path

import type { ApiResult } from "../common";

export interface LearningGoalDto {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  iconUrl?: string | null;
}

export interface LearningPathItemDto {
  itemId: string;
  itemType: string;
  sortOrder: number;
  conceptId?: string | null;
  conceptName?: string | null;
  conceptDescription?: string | null;
  /** Key để FE load nội dung (vd. content/variables.md). BE trả ConceptContentKey. */
  conceptContentKey?: string | null;
  mapId?: string | null;
  mapTitle?: string | null;
  mapDescription?: string | null;
  mapDifficulty?: number | null;
  mapAvatarUrl?: string | null;
  isCompleted: boolean;
  isUnlocked: boolean;
  bestStars?: number | null;
  completedAt?: string | null;
}

export interface MyLearningPathDto {
  learningGoalId?: string | null;
  learningGoalName?: string | null;
  learningGoalDescription?: string | null;
  items: LearningPathItemDto[];
}

export interface SelectLearningGoalRequest {
  learningGoalId: string;
}

/** Chi tiết một concept – GET concepts/:id */
export interface ConceptDetailDto {
  id: string;
  learningGoalId: string;
  learningGoalName?: string | null;
  name: string;
  description?: string | null;
  contentKey?: string | null;
  sortOrder: number;
}

/** Trạng thái hoàn thành concept – GET concepts/:id/completion */
export interface ConceptCompletionDto {
  isCompleted: boolean;
  completedAt?: string | null;
}

/** Danh sách concept – GET concepts?learningGoalId= */
export interface ConceptDto {
  id: string;
  learningGoalId: string;
  learningGoalName?: string | null;
  name: string;
  description?: string | null;
  contentKey?: string | null;
  sortOrder: number;
}

/** Xem trước path items theo goal – GET goals/:goalId/path-items */
export interface PathItemPreviewDto {
  itemId: string;
  itemType: string;
  sortOrder: number;
  conceptId?: string | null;
  conceptName?: string | null;
  conceptDescription?: string | null;
  conceptContentKey?: string | null;
  mapId?: string | null;
  mapTitle?: string | null;
  mapDescription?: string | null;
  mapDifficulty?: number | null;
  mapAvatarUrl?: string | null;
}

/** Mục tiêu đang chọn – GET my-path/selected-goal */
export interface SelectedGoalDto {
  learningGoalId: string;
  learningGoalName: string;
  learningGoalDescription?: string | null;
}

export interface LearningPathProgressDto {
  learningGoalId?: string | null;
  learningGoalName?: string | null;
  totalItems?: number;
  completedCount?: number;
  percentComplete?: number;
  suggestedReviewMapIds?: string[];
}

export type GoalsResult = ApiResult<LearningGoalDto[]>;
export type GoalResult = ApiResult<LearningGoalDto>;
export type MyPathResult = ApiResult<MyLearningPathDto>;
export type ConceptDetailResult = ApiResult<ConceptDetailDto>;
export type ConceptCompletionResult = ApiResult<ConceptCompletionDto>;
export type ConceptsListResult = ApiResult<ConceptDto[]>;
export type PathItemsPreviewResult = ApiResult<PathItemPreviewDto[]>;
export type SelectedGoalResult = ApiResult<SelectedGoalDto | null>;
export type ProgressResult = ApiResult<LearningPathProgressDto>;
