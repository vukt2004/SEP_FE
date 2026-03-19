/**
 * SignalR client for Game Lobby hub (/hubs/gamelobby).
 * Connect with Bearer token; receive LobbyRoomList, RoomUpdated, GameStarted, etc.
 */
import * as signalR from "@microsoft/signalr";
import { tokenStorage } from "@/lib/storage/tokenStorage";

const HUB_PATH = "/hubs/gamelobby";

export type LobbyRoomListPayload = Array<{
  roomId: string;
  roomCode: string;
  hostId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  status: string;
  isLocked: boolean;
  selectedMapId: string | null;
}>;

export type RoomDtoPayload = {
  roomId: string;
  roomCode: string;
  hostId: string;
  currentPlayerCount: number;
  maxPlayers: number;
  status: string;
  isLocked: boolean;
  selectedMapId: string | null;
  players: Array<{ playerId: string; isReady: boolean; isHost: boolean }>;
};

export type GameStartedPayload = {
  roomId: string;
  roomCode: string;
  mapId: string;
  players: Array<{ playerId: string; isReady: boolean; isHost: boolean }>;
  turnOrder?: string[];
  gameState?: unknown;
  startedAt?: string;
};

export type PlayerRankingPayload = Array<{
  playerId: string;
  score: number;
  rank: number;
  status: string;
}>;

export type SubmissionResultPayload = {
  success: boolean;
  score?: number;
  status?: string;
  submissionId?: string;
  message?: string;
};

type Handler = (...args: unknown[]) => void;

class GameLobbyHubClient {
  private connection: signalR.HubConnection | null = null;
  private handlers: Map<string, Set<Handler>> = new Map();

  private getBaseUrl(): string {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (base && typeof base === "string") return base.replace(/\/$/, "");
    return "";
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      return new Promise((resolve) => {
        const check = () => {
          if (this.connection?.state === signalR.HubConnectionState.Connected) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }

    const token = tokenStorage.getLearnerToken();
    const baseUrl = this.getBaseUrl();
    const url = baseUrl ? `${baseUrl}${HUB_PATH}` : HUB_PATH;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => token ?? "" })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.onclose((err) => {
      console.warn("[GameLobbyHub] connection closed", err);
    });

    // Register server event names we expect from backend
    const events = [
      "LobbyRoomList",
      "RoomCreated",
      "JoinedRoom",
      "RoomUpdated",
      "LeftRoom",
      "GameStarted",
      "GameEnded",
      "RankingUpdated",
      "KickedFromRoom",
      "Error",
      "AlreadyInRoom",
      "SubmissionResult",
    ] as const;

    for (const event of events) {
      this.connection.on(event, (...args: unknown[]) => {
        const set = this.handlers.get(event);
        if (set) set.forEach((h) => h(...args));
      });
    }

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
    this.handlers.clear();
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  get state(): signalR.HubConnectionState {
    return this.connection?.state ?? signalR.HubConnectionState.Disconnected;
  }

  /** Request current lobby room list (server sends LobbyRoomList to this connection) */
  async getLobbyRooms(): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("GetLobbyRooms");
  }

  /** Create room via hub (optional alternative to REST) */
  async createRoom(maxPlayers?: number, selectedMapId?: string | null): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    const mapGuid = selectedMapId && selectedMapId !== "" ? selectedMapId : null;
    await this.connection.invoke("CreateRoom", maxPlayers ?? 8, mapGuid);
  }

  /** Join room by roomId (call after REST join to get into SignalR group and receive room events) */
  async joinRoom(roomId: string, roomCode?: string | null): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("JoinRoom", roomId, roomCode ?? null);
  }

  /** Join room by code only */
  async joinRoomByCode(roomCode: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("JoinRoomByCode", roomCode.trim());
  }

  /** Leave room */
  async leaveRoom(roomId: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("LeaveRoom", roomId);
  }

  /** Toggle ready */
  async toggleReady(roomId: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("ToggleReady", roomId);
  }

  /** Start game (host only) */
  async startGame(roomId: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("StartGame", roomId);
  }

  /** End game */
  async endGame(roomId: string): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("EndGame", roomId);
  }

  /** Set selected map (host only) */
  async setSelectedMap(roomId: string, mapId: string | null): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("SetSelectedMap", roomId, mapId);
  }

  /** Lock/unlock room (host only) */
  async setRoomLocked(roomId: string, isLocked: boolean): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke("SetRoomLocked", roomId, isLocked);
  }

  /** Submit solution (when room is Playing) */
  async submitSolution(
    roomId: string,
    astSpec: string | null,
    bytecodeSpec?: string | null,
    language?: string | null,
  ): Promise<void> {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    await this.connection.invoke(
      "SubmitSolution",
      roomId,
      astSpec,
      bytecodeSpec ?? null,
      language ?? null,
    );
  }
}

export const gameLobbyHub = new GameLobbyHubClient();
