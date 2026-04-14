import type { ApiResult } from "../common";

export type LeaderboardPeriodType = "Week" | "Month";

export interface XpLeaderboardItem {
  rank: number;
  userId: string;
  displayName: string;
  currentXp: number;
  currentLevel: number;
}

export interface XpGainLeaderboardItem {
  rank: number;
  userId: string;
  displayName: string;
  xpGained: number;
  currentLevel: number;
  lastGainAt?: string | null;
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
export type XpGainLeaderboardResult = ApiResult<PaginationResult<XpGainLeaderboardItem>>;
