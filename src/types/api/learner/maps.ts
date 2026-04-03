// src/types/api/learner/maps.ts
import type { ApiResult } from "../common";

export type MapStatusEnum = "Draft" | "PendingReview" | "Approved" | "Rejected" | "Published";

/**
 * Request parameters for uploading a map from JSON (multipart).
 * Per-level type, timeLimitMs, winCondition, hints live inside the JSON file(s), not form fields.
 */
export interface UploadMapFromJsonParams {
  Title: string;
  Description: string;
  Difficulty: number;
  Price: number;
  TagIdsCsv?: string;
  LearnedTagsCsv?: string;
  /** One combined JSON ({ levels: [...] }) or legacy single-level JSON */
  MapDetailFile: File;
  AvatarFile?: File | null;
  /** Optional gallery images/videos (BE: CreateMapFromJsonFileRequest.GalleryFiles). */
  GalleryFiles?: File[];
}

/**
 * PUT /api/learner/maps/{id} — chỉ metadata Map (không gửi Levels / MapDetailJson).
 */
export interface UpdateMapMetadataParams {
  title: string;
  description: string;
  difficulty: number;
  price?: number | null;
  tagIds?: string[];
  learnedTags?: string[];
}

/**
 * Map tag item
 * GET /api/learner/maps/tags
 */
export interface MapTag {
  id: string;
  name: string;
}

/**
 * API result for map tags list
 */
export type MapTagsResult = ApiResult<MapTag[]>;

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
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  /** Display name of the map creator (when returned by API) */
  createdByUserName?: string | null;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
  learnedTag?: string[] | string | null;
  learnedTags?: string[] | string | null;
  /**
   * true if this map is created by current user; false if it's only purchased/owned.
   * (Field is returned by GET /api/learner/maps/my-maps)
   */
  isAuthor?: boolean;
  /** Present on GET map by id when backend returns full detail. */
  levels?: MapLevelItem[];
  /** Map store gallery (images/videos), ordered by sortOrder. */
  gallery?: MapMediaItem[];
}

/**
 * Query parameters for fetching maps
 */
export interface GetMapsParams {
  pageNumber?: number;
  pageSize?: number;
  publishedOnly?: boolean;
  difficulty?: number;
  mapStatus?: MapStatusEnum;
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

/** One gallery item from GET map by id (MapMediaItemDto). */
export interface MapMediaItem {
  id: string;
  url: string;
  /** e.g. Image, Video — backend enum as string */
  kind: string;
  sortOrder: number;
}

/** One playable level row (MapDetails) from GET map detail — aligns with MapLevelItemDto. */
export interface MapLevelItem {
  id: string;
  levelOrder: number;
  title?: string | null;
  detailJson?: unknown;
  timeLimitMs?: number;
  winCondition?: number;
  /** "Topdown" | "Platform" from API */
  type?: string;
}

/**
 * Detailed map information
 */
export interface MapDetail {
  id: string;
  title: string;
  description: string;
  /** Map-level; có thể thiếu khi BE chỉ gắn type theo từng phần tử `levels`. */
  type?: "Topdown" | "Platform";
  difficulty: number;
  timeLimitMs?: number;
  isPublished: boolean;
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  editorialContent?: string | null;
  unlockEditorialAfterStars?: number;
  createdAt: string;
  activeSpec?: MapActiveSpec;
  hints?: MapHint[];
  constraints?: MapConstraint[];
  tagNames: string[];
  conceptNames?: string[];
  winCondition?: number;
  mapDetailJson?: unknown;
  /** Ordered levels (Map 1–n MapDetails). Omitted on list endpoints. */
  levels?: MapLevelItem[];
  learnedTag?: string[] | string | null;
  learnedTags?: string[] | string | null;
  avatarUrl?: string | null;
  gallery?: MapMediaItem[];
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
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
  learnedTag?: string[] | string | null;
  learnedTags?: string[] | string | null;
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
