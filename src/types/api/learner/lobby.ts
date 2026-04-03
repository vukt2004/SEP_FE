// src/types/api/learner/lobby.ts
// Types for Game Lobby API (multiplayer rooms) – align with BaseBE API /api/learner/lobby

import type { ApiResult } from "../common";

/** Room status from backend */
export type RoomStatus = "Waiting" | "Playing" | "Finished" | "Cancelled";

/** Room item in list (GET /api/learner/lobby/rooms) */
export interface LobbyRoomListItem {
  roomId: string;
  roomCode: string;
  hostId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  isLocked: boolean;
  selectedMapId: string | null;
}

/** Request body for creating a room */
export interface CreateLobbyRoomRequest {
  maxPlayers?: number;
  selectedMapId?: string | null;
}

/** Response after creating a room */
export interface CreateLobbyRoomResponse {
  roomId: string;
  roomCode: string;
  hostId: string;
  maxPlayers: number;
  selectedMapId: string | null;
}

/** Request body for joining a room (roomId OR roomCode) */
export interface JoinLobbyRoomRequest {
  roomId?: string | null;
  roomCode?: string | null;
}

/** Response after joining a room */
export interface JoinLobbyRoomResponse {
  roomId: string;
  roomCode: string;
  currentPlayerCount: number;
  maxPlayers: number;
}

/** Player in room detail */
export interface LobbyPlayerDto {
  playerId: string;
  isReady: boolean;
  isHost: boolean;
}

/** Full room detail (GET /api/learner/lobby/rooms/:roomId) */
export interface LobbyRoomDetailResponse {
  roomId: string;
  roomCode: string;
  hostId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  status: RoomStatus;
  isLocked: boolean;
  selectedMapId: string | null;
  players: LobbyPlayerDto[];
}

/** Request to set room map */
export interface SetRoomMapRequest {
  mapId: string;
}

/** Request body for submitting solution in lobby game */
export interface LobbySubmitSolutionRequest {
  language?: string;
  astSpec?: string | null;
  bytecodeSpec?: string | null;
  /** Thắng/thua theo engine — server chấm điểm theo isWin + metrics (không còn chỉ đo độ dài AST). */
  isWin?: boolean;
  stepsUsed?: number;
  blocksUsed?: number;
  /** Thời gian chơi (giây), khớp timer màn chơi */
  time?: number;
  /** MapDetails.Id của level đang nộp — bắt buộc khi map có nhiều level. */
  mapDetailId?: string;
}

/** One row in ranking after all submitted */
export interface PlayerRankingDto {
  playerId: string;
  score: number;
  rank: number;
  status: string;
}

/** Response after submitting solution */
export interface SubmitGameResponse {
  score: number;
  status: string;
  submissionId: string;
  rankingIfAllSubmitted?: PlayerRankingDto[] | null;
}

/** API result types */
export type LobbyRoomsListResult = ApiResult<LobbyRoomListItem[]>;
export type CreateLobbyRoomResult = ApiResult<CreateLobbyRoomResponse>;
export type JoinLobbyRoomResult = ApiResult<JoinLobbyRoomResponse>;
export type LobbyRoomDetailResult = ApiResult<LobbyRoomDetailResponse>;
export type SubmitGameResult = ApiResult<SubmitGameResponse>;
