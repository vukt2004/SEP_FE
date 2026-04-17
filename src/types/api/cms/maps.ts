// src/types/api/cms/maps.ts
import type { ApiResult } from "../common";

/**
 * Generic pagination result structure
 */
export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message: string;
  errors: string[];
  errorCode: string;
}

/**
 * Map status enum
 * 0 = Draft
 * 1 = Pending Review
 * 2 = Approved
 * 3 = Rejected
 * 4 = Published
 */
export type GameStatusEnum = "Draft" | "PendingReview" | "Approved" | "Rejected" | "Published";
export type MapStatusEnum = GameStatusEnum;

/**
 * Map item in list view
 */
export interface MapListItem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  type: "Topdown" | "Platform" | "Snake";
  timeLimitMs: number;
  isPublished: boolean;
  gameStatus?: GameStatusEnum;
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  createdByUserName?: string | null;
  isAuthor?: boolean;
  createdAt: string;
  tagNames: string[];
  learnedTags?: string[];
  winCondition: number;
  conceptNames?: string[];
  avatarUrl: string | null;
  contentVersion?: number;
  updatedAt?: string | null;
}

/**
 * Pagination result for maps list
 */
export type MapsPaginationResult = PaginationResult<MapListItem>;
export type GamesPaginationResult = PaginationResult<GameListItem>;

/**
 * Full API response wrapper for maps
 */
export type MapsListResult = ApiResult<MapsPaginationResult>;
export type GamesListResult = ApiResult<GamesPaginationResult>;

export type MapStatusFilter = 0 | 1 | 2 | 3 | 4;
export type GameStatusFilter = MapStatusFilter;

export type MapSortBy = "CreatedAt" | "Title" | "Difficulty" | "TimeLimitMs" | "Price";

/**
 * Query parameters for getting maps list
 */
export interface GetMapsParams {
  pageNumber?: number;
  pageSize?: number;
  gameStatus?: GameStatusFilter;
  mapStatus?: MapStatusFilter;
  publishedOnly?: boolean;
  createdByUserId?: string;
  difficulty?: number;
  tagId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: MapSortBy;
  sortAscending?: boolean;
}

/**
 * Map specification for grid, states, and conditions
 */
export interface MapActiveSpec {
  id: string;
  gridSpec: string;
  initialStateSpec: string;
  winConditionSpec: string;
  failConditionSpec: string;
  version: number;
}

/**
 * Hint for the map
 */
export interface MapHint {
  orderNo: number;
  content: string;
}

/**
 * Constraint for the map
 */
export interface MapConstraint {
  type: string;
  payload: string;
}

/** One level row from GET map detail (MapLevelItemDto). */
export interface MapLevelItem {
  id: string;
  levelOrder: number;
  title?: string | null;
  detailJson?: unknown;
  timeLimitMs?: number;
  winCondition?: number;
  type?: string;
}

/**
 * Detailed map information
 */
export interface MapDetail {
  id: string;
  title: string;
  description: string;
  type?: "Topdown" | "Platform" | "Snake";
  difficulty: number;
  timeLimitMs?: number;
  isPublished: boolean;
  gameStatus?: GameStatusEnum;
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  createdByUserName?: string | null;
  CreatedByUserName?: string | null;
  editorialContent: string;
  unlockEditorialAfterStars: number;
  createdAt: string;
  contentVersion?: number;
  updatedAt?: string | null;
  activeSpec: MapActiveSpec;
  hints: MapHint[];
  constraints: MapConstraint[];
  tagNames: string[];
  conceptNames: string[];
  winCondition?: number;
  gameDetailJson?: unknown;
  avatarUrl?: string | null;
  mapDetailJson?: unknown; // Optional field that might be added by backend
  levels?: MapLevelItem[];
}

/**
 * Map detail API response
 */
export type MapDetailResult = ApiResult<MapDetail>;
export type GameDetailResult = ApiResult<GameDetail>;

/**
 * Approve/Reject action parameters
 */
export interface ApproveMapParams {
  reviewNote?: string;
}

export interface RejectMapParams {
  rejectReason?: string;
}

/**
 * Map tag item
 * GET /api/cms/maps/tags
 */
export interface MapTag {
  id: string;
  name: string;
}

/**
 * API result for map tags list
 */
export type MapTagsResult = ApiResult<MapTag[]>;

export type GameListItem = MapListItem;
export type GamesListItem = MapListItem;
export type GameSortBy = MapSortBy;
export type GamesFilter = GetMapsParams;
export type GamesResponseDto = GamesListResult;
export type GameDetail = MapDetail;
export type GameTag = MapTag;
