// src/types/api/learner/community.ts

/**
 * Request parameters for rating a map
 */
export interface RateMapParams {
  /** Rating value (1-5) */
  rating: number;
  /** Optional comment for the rating */
  comment?: string;
}

/**
 * Request parameters for reporting a map
 */
export interface ReportMapParams {
  /** Reason for the report */
  reason: string;
  /** Additional details about the report */
  details?: string;
}
