import type { ApiResult } from "../common";

export interface XpLeaderboardItem {
  rank: number;
  userId: string;
  displayName: string;
  currentXp: number;
  currentLevel: number;
}

export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export type XpLeaderboardResult = ApiResult<PaginationResult<XpLeaderboardItem>>;
