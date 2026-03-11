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
export type MapStatusEnum = 0 | 1 | 2 | 3 | 4;

/**
 * Map item in list view
 */
export interface MapListItem {
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
  createdAt: string;
  tagNames: string[];
  winCondition: number;
  conceptNames?: string[];
  avatarUrl: string | null;
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
  type: "Topdown" | "Platform";
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
  winCondition: number;
  mapDetailJson?: unknown; // Optional field that might be added by backend
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
