import type { ApiResult } from "../common";

// Request/DB values
export type PlayMode = 0 | 1 | 2; // Single | Lobby | Competitive
// Response JSON values (JsonStringEnumConverter)
export type PlayModeLabel = "Single" | "Lobby" | "Competitive";

export interface ValidateSolutionRequest {
  mapId: string;
  language?: string;
  astSpec?: string | null;
  bytecodeSpec?: string | null;
  playMode?: PlayMode;
  roomId?: string | null;
  matchId?: string | null;
}

export interface ValidateSolutionResponse {
  submissionId: string;
  status: string; // "Accepted" | "WrongAnswer" (JsonStringEnumConverter)
  score?: number | null;
  stars?: number | null;
  stepsUsed?: number | null;
  blocksUsed?: number | null;
  message?: string | null;
}

export type ValidateSolutionResult = ApiResult<ValidateSolutionResponse>;

export interface PaginationResult<T> {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  items: T[];
  isSuccess: boolean;
  message?: string | null;
  errors?: string[] | null;
  errorCode?: string | null;
}

export interface MapPlayHistoryItem {
  id: string;
  mapId: string;
  mapTitle?: string | null;
  playMode: PlayModeLabel;
  startTime: string;
  endTime?: string | null;
  isCompleted: boolean;
  score?: number | null;
  stars?: number | null;
  submissionId?: string | null;
  executionsResultId?: string | null;
  roomId?: string | null;
  matchId?: string | null;
  language?: string | null;
}

export type MyPlayHistoryResult = ApiResult<PaginationResult<MapPlayHistoryItem>>;

