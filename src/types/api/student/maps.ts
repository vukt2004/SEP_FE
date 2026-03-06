// src/types/api/student/maps.ts
import type { ApiResult } from "../common";

/**
 * Request parameters for uploading a map from JSON
 */
export interface UploadMapFromJsonParams {
  /** Map title */
  Title: string;
  /** Map description */
  Description: string;
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
