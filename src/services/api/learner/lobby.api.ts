// src/services/api/learner/lobby.api.ts
// Game Lobby API – multiplayer rooms (align with BaseBE /api/learner/lobby)

import { learnerAxios } from "@/services/http/axios.learner";
import type {
  LobbyRoomsListResult,
  CreateLobbyRoomResult,
  JoinLobbyRoomResult,
  LobbyRoomDetailResult,
  CreateLobbyRoomRequest,
  JoinLobbyRoomRequest,
  SetRoomGameRequest,
  LobbySubmitSolutionRequest,
  SubmitGameResult,
} from "@/types/api/learner/lobby";

const BASE = "/api/learner/lobby";

export const learnerLobbyApi = {
  /** GET /api/learner/lobby/rooms – list all lobby rooms */
  getRooms() {
    return learnerAxios.get<LobbyRoomsListResult>(`${BASE}/rooms`);
  },

  /** POST /api/learner/lobby/rooms – create a new room (caller becomes host). Body: maxPlayers (default 8), selectedGameId (optional Guid). */
  createRoom(request?: CreateLobbyRoomRequest) {
    const maxPlayers = request?.maxPlayers ?? 8;
    const selectedGameId = request?.selectedGameId ?? request?.selectedMapId;
    const body: { maxPlayers: number; selectedGameId?: string | null } = {
      maxPlayers: Math.max(2, maxPlayers),
    };
    if (selectedGameId != null && selectedGameId !== "") {
      body.selectedGameId = selectedGameId;
    } else {
      body.selectedGameId = null;
    }
    return learnerAxios.post<CreateLobbyRoomResult>(`${BASE}/rooms`, body);
  },

  /** POST /api/learner/lobby/rooms/join – join by roomId or roomCode */
  joinRoom(request: JoinLobbyRoomRequest) {
    return learnerAxios.post<JoinLobbyRoomResult>(`${BASE}/rooms/join`, request);
  },

  /** GET /api/learner/lobby/rooms/:roomId – get room detail */
  getRoom(roomId: string) {
    return learnerAxios.get<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}`);
  },

  /** POST /api/learner/lobby/rooms/:roomId/leave – leave room */
  leaveRoom(roomId: string) {
    return learnerAxios.post<{ isSuccess: boolean; message?: string }>(
      `${BASE}/rooms/${roomId}/leave`,
    );
  },

  /** POST /api/learner/lobby/rooms/:roomId/start – start game (host only) */
  startGame(roomId: string) {
    return learnerAxios.post<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}/start`);
  },

  /** POST /api/learner/lobby/rooms/:roomId/end – end game */
  endGame(roomId: string) {
    return learnerAxios.post<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}/end`);
  },

  /** POST /api/learner/lobby/rooms/:roomId/ready – toggle ready */
  toggleReady(roomId: string) {
    return learnerAxios.post<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}/ready`);
  },

  /** POST /api/learner/lobby/rooms/:roomId/game – set room game (host, body: { gameId }) */
  setRoomMap(roomId: string, request: SetRoomGameRequest) {
    const gameId = request.gameId ?? request.mapId;
    return learnerAxios.post<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}/game`, { gameId });
  },

  /** POST /api/learner/lobby/rooms/:roomId/submit – submit solution when room is Playing */
  submitSolution(roomId: string, request: LobbySubmitSolutionRequest) {
    const detailId = request.gameDetailId ?? request.mapDetailId;
    const payload: LobbySubmitSolutionRequest = {
      ...request,
      gameDetailId: detailId,
      mapDetailId: detailId,
    };
    return learnerAxios.post<SubmitGameResult>(`${BASE}/rooms/${roomId}/submit`, payload);
  },
};
