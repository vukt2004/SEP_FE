import type { ApiResult } from "../common";

export interface RecommendationMapDto {
  gameId?: string;
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
  recommendedGames?: RecommendationMapDto[];
  recommendedMaps: RecommendationMapDto[];
  reviewGames?: RecommendationMapDto[];
  reviewMaps: RecommendationMapDto[];
  suggestedPracticeGames?: RecommendationMapDto[];
  suggestedPracticeMaps: RecommendationMapDto[];
  nextConcept?: RecommendationConceptDto | null;
}

export type RecommendationResultApi = ApiResult<RecommendationResultDto>;

