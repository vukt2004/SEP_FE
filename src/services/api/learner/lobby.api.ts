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
  SetRoomMapRequest,
  LobbySubmitSolutionRequest,
  SubmitGameResult,
} from "@/types/api/learner/lobby";

const BASE = "/api/learner/lobby";

export const learnerLobbyApi = {
  /** GET /api/learner/lobby/rooms – list all lobby rooms */
  getRooms() {
    return learnerAxios.get<LobbyRoomsListResult>(`${BASE}/rooms`);
  },

  /** POST /api/learner/lobby/rooms – create a new room (caller becomes host). Body: maxPlayers (default 8), selectedMapId (optional Guid). */
  createRoom(request?: CreateLobbyRoomRequest) {
    const maxPlayers = request?.maxPlayers ?? 8;
    const body: { maxPlayers: number; selectedMapId?: string | null } = {
      maxPlayers: Math.max(2, maxPlayers),
    };
    if (request?.selectedMapId != null && request.selectedMapId !== "") {
      body.selectedMapId = request.selectedMapId;
    } else {
      body.selectedMapId = null;
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

  /** POST /api/learner/lobby/rooms/:roomId/map – set room map (host, body: { mapId }) */
  setRoomMap(roomId: string, request: SetRoomMapRequest) {
    return learnerAxios.post<LobbyRoomDetailResult>(`${BASE}/rooms/${roomId}/map`, request);
  },

  /** POST /api/learner/lobby/rooms/:roomId/submit – submit solution when room is Playing */
  submitSolution(roomId: string, request: LobbySubmitSolutionRequest) {
    return learnerAxios.post<SubmitGameResult>(`${BASE}/rooms/${roomId}/submit`, request);
  },
};
