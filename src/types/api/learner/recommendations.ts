import type { ApiResult } from "../common";

export interface RecommendationMapDto {
  mapId: string;
  title: string;
  difficulty: number;
  conceptId?: string | null;
  conceptName?: string | null;
  score?: number | null;
  attempts: number;
  failCount: number;
  successRate: number;
}

export interface RecommendationConceptDto {
  conceptId: string;
  name: string;
  sortOrder: number;
}

export interface RecommendationResultDto {
  recommendedMaps: RecommendationMapDto[];
  reviewMaps: RecommendationMapDto[];
  suggestedPracticeMaps: RecommendationMapDto[];
  nextConcept?: RecommendationConceptDto | null;
}

export type RecommendationResultApi = ApiResult<RecommendationResultDto>;

