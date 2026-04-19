// src/types/api/learner/maps.ts
import type { ApiResult } from "../common";

export type GameStatusEnum = "Draft" | "PendingReview" | "Approved" | "Rejected" | "Published";
export type MapStatusEnum = GameStatusEnum;

/**
 * Request parameters for uploading a map from JSON (multipart).
 * Per-level type, timeLimitMs, winCondition, hints live inside the JSON file(s), not form fields.
 */
export interface UploadGameFromJsonParams {
  Title: string;
  Description: string;
  Difficulty: number;
  Price: number;
  /** Optional free trial attempt limit per user. 0/undefined = no trial. */
  FreeTrialAttemptLimit?: number;
  TagIdsCsv?: string;
  LearnedTagsCsv?: string;
  /** One combined JSON ({ levels: [...] }) or legacy single-level JSON */
  GameDetailFile?: File;
  /** Backward-compatible alias of GameDetailFile. */
  MapDetailFile?: File;
  AvatarFile?: File | null;
  /** Optional gallery images/videos (BE: CreateMapFromJsonFileRequest.GalleryFiles). */
  GalleryFiles?: File[];
}

export type UploadMapFromJsonParams = UploadGameFromJsonParams;

/**
 * PUT /api/learner/maps/{id} — chỉ metadata Map (không gửi Levels / MapDetailJson).
 */
export interface UpdateGameMetadataParams {
  title: string;
  description: string;
  difficulty: number;
  price?: number | null;
  freeTrialAttemptLimit?: number | null;
  tagIds?: string[];
  learnedTags?: string[];
}

export type UpdateMapMetadataParams = UpdateGameMetadataParams;

/**
 * POST /api/learner/maps/{id}/duplicate-as-new — tạo map mới (MapId mới), map nguồn không đổi.
 * BE: DuplicateMapAsNewRequest (camelCase JSON).
 */
export interface DuplicateGameAsNewRequest {
  title?: string | null;
  description?: string | null;
  difficulty?: number | null;
  price?: number | null;
  freeTrialAttemptLimit?: number | null;
  tagIds?: string[];
  learnedTags?: string[];
  editorialContent?: string | null;
  unlockEditorialAfterStars?: number | null;
  /** true = map mới published ngay; mặc định false = Draft */
  autoPublish?: boolean;
}

export type DuplicateMapAsNewRequest = DuplicateGameAsNewRequest;

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

export interface MostPlayedCreatedMapLeaderboardItem {
  rank: number;
  gameId?: string;
  mapId: string;
  gameTitle?: string;
  mapTitle: string;
  creatorUserId: string;
  creatorDisplayName: string;
  playCount: number;
  uniquePlayerCount: number;
  lastPlayedAt?: string | null;
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

export type UploadMapResponseData = string | UploadMapResult | { id: string };

/**
 * API result type for map upload
 */
export type UploadMapApiResult = ApiResult<UploadMapResponseData>;
export type UploadGameApiResult = UploadMapApiResult;

/**
 * Map item in list response
 */
export interface Map {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  type: "Topdown" | "Platform" | "Snake";
  timeLimitMs: number;
  isPublished: boolean;
  gameStatus?: GameStatusEnum;
  mapStatus: MapStatusEnum;
  reviewNote?: string | null;
  price: number;
  freeTrialAttemptLimit?: number;
  createdByUserId: string;
  /** Display name of the map creator (when returned by API) */
  createdByUserName?: string | null;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
  learnedTag?: string[] | string | null;
  learnedTags?: string[] | string | null;
  /** Bắt đầu từ 1; tăng khi author update nội dung (PUT/upload-json). Dùng đồng bộ cache. */
  contentVersion?: number;
  /** ISO 8601 hoặc null */
  updatedAt?: string | null;
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
  /** Backend query param alias (PascalCase). */
  PageNumber?: number;
  /** Backend query param alias (PascalCase). */
  PageSize?: number;
  publishedOnly?: boolean;
  difficulty?: number;
  gameStatus?: GameStatusEnum;
  mapStatus?: MapStatusEnum;
  type?: number;
  tagId?: string;
  createdByUserId?: string;
  /** Backend query param alias (PascalCase). */
  CreatedByUserId?: string;
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

export type GamesListData = MapsListData;

/**
 * API result type for maps list
 */
export type MapsListResult = ApiResult<MapsListData>;
export type GamesListResult = ApiResult<GamesListData>;

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
  type?: "Topdown" | "Platform" | "Snake";
  difficulty: number;
  timeLimitMs?: number;
  isPublished: boolean;
  gameStatus?: GameStatusEnum;
  mapStatus: MapStatusEnum;
  reviewNote?: string | null;
  price: number;
  freeTrialAttemptLimit?: number;
  createdByUserId: string;
  createdByUserName?: string | null;
  editorialContent?: string | null;
  unlockEditorialAfterStars?: number;
  createdAt: string;
  contentVersion?: number;
  updatedAt?: string | null;
  activeSpec?: MapActiveSpec;
  hints?: MapHint[];
  constraints?: MapConstraint[];
  tagNames: string[];
  conceptNames?: string[];
  winCondition?: number;
  gameDetailJson?: unknown;
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
  type: "Topdown" | "Platform" | "Snake";
  timeLimitMs: number;
  isPublished: boolean;
  gameStatus?: GameStatusEnum;
  mapStatus: MapStatusEnum;
  price: number;
  freeTrialAttemptLimit?: number;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  avatarUrl: string | null;
  learnedTag?: string[] | string | null;
  learnedTags?: string[] | string | null;
  contentVersion?: number;
  updatedAt?: string | null;
}

export type MapInfoResult = ApiResult<MapInfo>;
export type GameInfoResult = ApiResult<GameInfo>;

/**
 * Map detail API response
 */
export type MapDetailResult = ApiResult<MapDetail>;
export type GameDetailResult = ApiResult<GameDetail>;

/**
 * Map ownership check data
 */
export interface MapOwnershipData {
  gameExists?: boolean;
  mapExists: boolean;
  isOwned: boolean;
  isAuthor: boolean;
  isPurchased?: boolean;
  purchasedAt?: string | null;
}

/**
 * Map ownership check API response
 */
export type MapOwnershipResult = ApiResult<MapOwnershipData>;
export type GameOwnershipResult = ApiResult<GameOwnershipData>;

export type Game = Map;
export type GameTag = MapTag;
export type GameActiveSpec = MapActiveSpec;
export type GameHint = MapHint;
export type GameConstraint = MapConstraint;
export type GameMediaItem = MapMediaItem;
export type GameLevelItem = MapLevelItem;
export type GameDetail = MapDetail;
export type GameInfo = MapInfo;
export type GameOwnershipData = MapOwnershipData;

export interface SimplePaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
}

export type MostPlayedCreatedMapsLeaderboardResult = ApiResult<
  SimplePaginationResult<MostPlayedCreatedMapLeaderboardItem>
>;
