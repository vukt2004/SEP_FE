// src/types/api/learner/challenges.ts
import type { ApiResult } from "../common";

export type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: number;
  price: number;
  createdByUserId: string;
  createdAt: string;
  tagNames: string[];
  conceptNames: string[];
};

export type ChallengesListData = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: Challenge[];
  isSuccess: boolean;
  message: string;
  errors: string[];
  errorCode: string;
};

export type ChallengesListResult = ApiResult<ChallengesListData>;
