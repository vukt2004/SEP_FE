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
 * 1 = Published
 * 2 = Archived
 */
export type MapStatusEnum = 0 | 1 | 2;

/**
 * Map item in list view
 */
export interface MapListItem {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: MapStatusEnum;
  price: number;
  createdByUserId: string;
  createdAt: string;
  tagNames: string[];
  conceptNames: string[];
}

/**
 * Pagination result for maps list
 */
export type MapsPaginationResult = PaginationResult<MapListItem>;

/**
 * Full API response wrapper for maps
 */
export type MapsListResult = ApiResult<MapsPaginationResult>;

/**
 * Query parameters for getting maps list
 */
export interface GetMapsParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  difficulty?: number;
  mapStatus?: MapStatusEnum;
  isPublished?: boolean;
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

/**
 * Detailed map information
 */
export interface MapDetail {
  id: string;
  title: string;
  description: string;
  difficulty: number;
  timeLimitMs: number;
  isPublished: boolean;
  mapStatus: MapStatusEnum;
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
}

/**
 * Map detail API response
 */
export type MapDetailResult = ApiResult<MapDetail>;

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
 * Parameters for uploading a new map
 */
export interface UploadMapParams {
  levelFile: File;
  name: string;
  type: string;
  difficulty: string;
}

/**
 * Response from map upload
 */
export interface UploadMapResult {
  mapId?: string;
  success?: boolean;
  message?: string;
}

/**
 * Level map item in list view
 */
export interface LevelMapItem {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  description?: string;
}

/**
 * Query parameters for getting level maps list
 */
export interface GetLevelMapsParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  type?: string;
  difficulty?: string;
}

/**
 * Pagination result for level maps list
 */
export type LevelMapsPaginationResult = PaginationResult<LevelMapItem>;

/**
 * Full API response wrapper for level maps list
 */
export type LevelMapsListResult = ApiResult<LevelMapsPaginationResult>;

/**
 * Detailed level map information
 */
export interface LevelMapDetail {
  id: string;
  name: string;
  type: string;
  difficulty: string;
  description?: string;
  gridSpec: string;
  initialStateSpec: string;
  winConditionSpec: string;
  failConditionSpec: string;
}

/**
 * Level map detail API response
 */
export type LevelMapDetailResult = ApiResult<LevelMapDetail>;
