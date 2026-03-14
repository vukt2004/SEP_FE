// src/types/api/learner/maps.ts
import type { ApiResult } from "../common";

/**
 * Request parameters for uploading a map from JSON
 */
export interface UploadMapFromJsonParams {
  /** Map title */
  Title: string;
  /** Map description */
  Description: string;
  /** Map type: Topdown or Platform */
  Type: "Topdown" | "Platform";
  /** Difficulty level (1-10) */
  Difficulty: number;
  /** Time limit in milliseconds */
  TimeLimitMs: number;
  /** Win condition type */
  WinCondition: number;
  /** Map price */
  Price: number;
  /** JSON string of hints array */
  HintsJson?: string;
  /** Comma-separated tag IDs */
  TagIdsCsv?: string;
  /** Map detail JSON file */
  MapDetailFile: File;
  /** Avatar image file (optional) */
  AvatarFile?: File | null;
}

/**
 * Response data after uploading a map
 */
export interface UploadMapResult {
  /** Created map ID */
  id: string;
  /** Map title */
  title: string;
  /** Success message */
  message?: string;
}

/**
 * API result type for map upload
 */
export type UploadMapApiResult = ApiResult<UploadMapResult>;

/**
 * Map item in list response
 */
export interface Map {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  type: "Topdown" | "Platform";
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: number;
  price: number;
  createdByUserId: string;
  /** Display name of the map creator (when returned by API) */
  createdByUserName?: string | null;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
  /**
   * true if this map is created by current user; false if it's only purchased/owned.
   * (Field is returned by GET /api/learner/maps/my-maps)
   */
  isAuthor?: boolean;
}

/**
 * Query parameters for fetching maps
 */
export interface GetMapsParams {
  pageNumber?: number;
  pageSize?: number;
  publishedOnly?: boolean;
  difficulty?: number;
  mapStatus?: number;
  type?: number;
  tagId?: string;
  createdByUserId?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  /**
   * Backend supports: CreatedAt, Title, Difficulty, TimeLimitMs
   */
  sortBy?: "CreatedAt" | "Title" | "Difficulty" | "TimeLimitMs";
  sortAscending?: boolean;
  /**
   * true = only maps created by current user
   * false/undefined = include created + purchased
   */
  isAuthorOnly?: boolean;
  /** Backend query param (PascalCase) */
  IsAuthorOnly?: boolean;
}

/**
 * Paginated list of maps
 */
export interface MapsListData {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: Map[];
  isSuccess: boolean;
  message: string;
}

/**
 * API result type for maps list
 */
export type MapsListResult = ApiResult<MapsListData>;

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

/**
 * Detailed map information
 */
export interface MapDetail {
  id: string;
  title: string;
  description: string;
  type: "Topdown" | "Platform";
  difficulty: number;
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: number;
  price: number;
  createdByUserId: string;
  editorialContent: string;
  unlockEditorialAfterStars: number;
  createdAt: string;
  activeSpec: MapActiveSpec;
  hints: MapHint[];
  constraints: MapConstraint[];
  tagNames: string[];
  conceptNames: string[];
  winCondition: number;
  mapDetailJson?: unknown;
}

/**
 * Lightweight map info for marketplace modal
 * GET /api/learner/maps/{id}/info
 */
export interface MapInfo {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  type: "Topdown" | "Platform";
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: string;
  price: number;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
}

export type MapInfoResult = ApiResult<MapInfo>;

/**
 * Map detail API response
 */
export type MapDetailResult = ApiResult<MapDetail>;

/**
 * Map ownership check data
 */
export interface MapOwnershipData {
  mapExists: boolean;
  isOwned: boolean;
  isAuthor: boolean;
}

/**
 * Map ownership check API response
 */
export type MapOwnershipResult = ApiResult<MapOwnershipData>;
