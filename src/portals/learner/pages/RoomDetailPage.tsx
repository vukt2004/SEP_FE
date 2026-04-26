// src/portals/learner/pages/RoomDetailPage.tsx
// Waiting room: show room code (copy), players, ready, start (host), leave; SignalR RoomUpdated, GameStarted, Kicked
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  Users,
  Loader2,
  Play,
  LogOut,
  Check,
  Copy,
  Map as MapIcon,
  Lock,
  Unlock,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import type { LobbyRoomDetailResponse, LobbyPlayerDto } from "@/types/api/learner/lobby";
import type { Map as ApiMap } from "@/types/api/learner/maps";
import type { RoomChatMessagePayload } from "@/lib/realtime/gameLobbyHub";
import styles from "./RoomDetailPage.module.css";
import { LobbyMapPickerGrid } from "../components/LobbyMapPickerGrid";
import { getFirstLevelPlayHint } from "@/utils/levelLoader";
import { getCurrentUserCapabilities } from "@/lib/auth/subscriptionPlan";

function lobbyPlayNavigationState(
  mapId: string,
  roomIdForState: string,
  mapPayload: unknown,
  roomCodeForState?: string | null,
) {
  const hint = getFirstLevelPlayHint(mapPayload);
  return {
    levelId: mapId,
    multiplayerRoomId: roomIdForState,
    multiplayerRoomCode: roomCodeForState ?? undefined,
    ...(hint.mapDetailId ? { mapDetailId: hint.mapDetailId } : {}),
  };
}

const ROOM_STATUS_MAP: Record<number | string, LobbyRoomDetailResponse["status"]> = {
  0: "Waiting",
  1: "Playing",
  2: "Finished",
  3: "Cancelled",
  Waiting: "Waiting",
  Playing: "Playing",
  Finished: "Finished",
  Cancelled: "Cancelled",
};

function normalizeDetail(
  raw: Record<string, unknown>,
  previousRoom?: LobbyRoomDetailResponse | null,
): LobbyRoomDetailResponse {
  const previousPlayerNameMap = new Map<string, string>();
  for (const p of previousRoom?.players ?? []) {
    const name = p.playerName?.trim();
    if (name) previousPlayerNameMap.set(String(p.playerId).toLowerCase(), name);
  }

  const players = (raw.players ?? raw.Players) as unknown[];
  const parsedPlayers: LobbyPlayerDto[] = Array.isArray(players)
    ? (players.map((p: unknown) => {
        const r = p as Record<string, unknown>;
        const playerId = String(r.playerId ?? r.PlayerId ?? "");
        const fromPayload =
          r.playerName != null
            ? String(r.playerName)
            : r.PlayerName != null
              ? String(r.PlayerName)
              : null;
        const fallbackName = previousPlayerNameMap.get(playerId.toLowerCase()) ?? null;
        return {
          playerId,
          playerName: fromPayload?.trim() ? fromPayload : fallbackName,
          isReady: Boolean(r.isReady ?? r.IsReady),
          isHost: Boolean(r.isHost ?? r.IsHost),
        };
      }) as LobbyPlayerDto[])
    : [];
  const fromList = parsedPlayers.length;
  const fromApi = Number(raw.currentPlayerCount ?? raw.CurrentPlayerCount ?? 0);
  const statusRaw = raw.status ?? raw.Status ?? 0;
  const status = ROOM_STATUS_MAP[statusRaw as number] ?? "Waiting";
  return {
    roomId: String(raw.roomId ?? raw.RoomId ?? ""),
    roomCode: String(raw.roomCode ?? raw.RoomCode ?? ""),
    hostId: String(raw.hostId ?? raw.HostId ?? ""),
    hostName:
      raw.hostName != null
        ? String(raw.hostName)
        : raw.HostName != null
          ? String(raw.HostName)
          : null,
    currentPlayerCount: fromList > 0 ? fromList : fromApi,
    maxPlayers: Number(raw.maxPlayers ?? raw.MaxPlayers ?? 8),
    status,
    isLocked: Boolean(raw.isLocked ?? raw.IsLocked),
    selectedGameTitle:
      raw.selectedGameTitle != null
        ? String(raw.selectedGameTitle)
        : raw.SelectedGameTitle != null
          ? String(raw.SelectedGameTitle)
          : null,
    selectedMapId:
      raw.selectedGameId != null
        ? String(raw.selectedGameId)
        : raw.SelectedGameId != null
          ? String(raw.SelectedGameId)
          : raw.selectedMapId != null
            ? String(raw.selectedMapId)
            : raw.SelectedMapId != null
              ? String(raw.SelectedMapId)
              : null,
    players: parsedPlayers,
  };
}

function normalizeRoomChatMessage(payload: unknown): RoomChatMessagePayload | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const id = String(p.id ?? p.Id ?? "");
  const roomId = String(p.roomId ?? p.RoomId ?? "");
  if (!id || !roomId) return null;
  return {
    id,
    roomId,
    senderId: String(p.senderId ?? p.SenderId ?? ""),
    senderName: String(p.senderName ?? p.SenderName ?? ""),
    content: String(p.content ?? p.Content ?? ""),
    createdAt: String(p.createdAt ?? p.CreatedAt ?? new Date().toISOString()),
  };
}

/** Initial room from location.state (sau khi create/join) */
function getInitialRoomFromState(state: unknown): LobbyRoomDetailResponse | null {
  if (!state || typeof state !== "object") return null;
  const s = state as Record<string, unknown>;
  const roomId = s.roomId != null ? String(s.roomId) : null;
  const roomCode = s.roomCode != null ? String(s.roomCode) : "";
  if (!roomId) return null;
  return {
    roomId,
    roomCode,
    hostId: s.hostId != null ? String(s.hostId) : "",
    hostName: s.hostName != null ? String(s.hostName) : null,
    currentPlayerCount: typeof s.currentPlayerCount === "number" ? s.currentPlayerCount : 1,
    maxPlayers: typeof s.maxPlayers === "number" ? s.maxPlayers : 8,
    status: (s.status as LobbyRoomDetailResponse["status"]) ?? "Waiting",
    isLocked: Boolean(s.isLocked),
    selectedGameTitle:
      s.selectedGameTitle != null
        ? String(s.selectedGameTitle)
        : s.SelectedGameTitle != null
          ? String(s.SelectedGameTitle)
          : null,
    selectedMapId:
      s.selectedGameId != null
        ? String(s.selectedGameId)
        : s.selectedMapId != null
          ? String(s.selectedMapId)
          : null,
    players: Array.isArray(s.players) ? (s.players as LobbyPlayerDto[]) : [],
  };
}

export default function RoomDetailPage() {
  const { roomId: roomIdParam } = useParams<{ roomId: string }>();
  const location = useLocation();
  const locationState = (location.state ?? null) as
    | {
        roomId?: string;
        roomCode?: string;
        selectedMapIdFromBrowse?: string;
        selectedMapTitleFromBrowse?: string;
        applyMapSelectionFromBrowse?: boolean;
      }
    | null;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const initialFromState = getInitialRoomFromState(location.state);
  const [room, setRoom] = useState<LobbyRoomDetailResponse | null>(initialFromState);
  const hadInitialState = useRef(!!initialFromState);
  hadInitialState.current = hadInitialState.current || !!initialFromState;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialFromState);
  const [actioning, setActioning] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [maps, setMaps] = useState<ApiMap[]>([]);
  const [lockedMapIds, setLockedMapIds] = useState<Set<string>>(new Set());
  const [mapsLoading, setMapsLoading] = useState(false);
  const [selectedMapDetail, setSelectedMapDetail] = useState<ApiMap | null>(null);
  const [selectedMapDetailLoading, setSelectedMapDetailLoading] = useState(false);
  const [mapDetailOpen, setMapDetailOpen] = useState(false);
  const [roomChatOpen, setRoomChatOpen] = useState(false);
  const [roomChatLoading, setRoomChatLoading] = useState(false);
  const [roomChatMessages, setRoomChatMessages] = useState<RoomChatMessagePayload[]>([]);
  const [roomChatInput, setRoomChatInput] = useState("");
  const [roomChatSending, setRoomChatSending] = useState(false);
  const [roomChatUnread, setRoomChatUnread] = useState(0);
  const [roomChatNotice, setRoomChatNotice] = useState<string | null>(null);
  const [canUsePrivateRoomFeature, setCanUsePrivateRoomFeature] = useState(false);
  const roomChatNoticeTimeoutRef = useRef<number | null>(null);
  const [showMaxPlayersEditor, setShowMaxPlayersEditor] = useState(false);
  const leftViaButton = useRef(false);
  const mountedAt = useRef<number>(0);
  mountedAt.current = mountedAt.current || Date.now();
  const roomCodeRef = useRef<string | undefined>(room?.roomCode);
  const selectedMapDetailRef = useRef<ApiMap | null>(null);
  const appliedBrowseMapRef = useRef<string | null>(null);
  roomCodeRef.current = room?.roomCode;
  selectedMapDetailRef.current = selectedMapDetail;

  /** ID dùng cho API/SignalR: ưu tiên room.roomId (từ state hoặc GET) để tránh URL param bị sai (nhiều segment). */
  const roomId = room?.roomId ?? roomIdParam ?? "";
  const normalizedCurrentUserId = String(currentUserId ?? "").toLowerCase();
  const isHost = Boolean(
    room &&
      normalizedCurrentUserId &&
      (String(room.hostId ?? "").toLowerCase() === normalizedCurrentUserId ||
        room.players.some(
          (p) => String(p.playerId).toLowerCase() === normalizedCurrentUserId && p.isHost,
        )),
  );

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await learnerLobbyApi.getRoom(roomId);
      const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
      if (res.data?.isSuccess && payload && typeof payload === "object") {
        setRoom((prev) => normalizeDetail(payload as Record<string, unknown>, prev));
      } else if (!hadInitialState.current) {
        setRoom(null);
      }
    } catch {
      if (!hadInitialState.current) setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    // Room detail now relies on SignalR RoomUpdated events for realtime sync.
    // Keep a single initial fetch to hydrate state.
  }, [fetchRoom]);

  // SignalR: join room group ngay khi có roomId (không chờ roomCode — realtime số người)
  useEffect(() => {
    if (!roomId) return;
    let unsubUpdated: (() => void) | undefined;
    let unsubStarted: (() => void) | undefined;
    let unsubKicked: (() => void) | undefined;
    let unsubReconnect: (() => void) | undefined;

    const joinHubRoom = () => {
      const code = roomCodeRef.current?.trim();
      void gameLobbyHub.joinRoom(roomId, code || null);
    };

    gameLobbyHub
      .connect()
      .then(() => {
        joinHubRoom();
        unsubReconnect = gameLobbyHub.onReconnected(joinHubRoom);
        unsubUpdated = gameLobbyHub.on("RoomUpdated", (data: unknown) => {
          if (data && typeof data === "object")
            setRoom((prev) => normalizeDetail(data as unknown as Record<string, unknown>, prev));
        });
        unsubStarted = gameLobbyHub.on("GameStarted", (data: unknown) => {
          const d = data as {
            roomId?: string;
            gameId?: string;
            mapId?: string;
            RoomId?: string;
            GameId?: string;
            MapId?: string;
          };
          const rid = d?.roomId ?? d?.RoomId;
          const mid = d?.gameId ?? d?.GameId ?? d?.mapId ?? d?.MapId;
          if (rid && mid) {
            leftViaButton.current = true;
            const mapId = String(mid);
            const roomIdForState = String(rid);
            learnerMapsApi
              .getMapById(mapId)
              .then((res) => {
                const map = res.data?.data;
                const hint = getFirstLevelPlayHint(map);
                const targetRoute =
                  hint.mapType === "platform"
                    ? ROUTES.PLATFORM
                    : hint.mapType === "snake"
                      ? ROUTES.SNAKE
                      : ROUTES.GAME;
                navigate(targetRoute, {
                  state: lobbyPlayNavigationState(mapId, roomIdForState, map, roomCodeRef.current),
                });
              })
              .catch(() => {
                navigate(ROUTES.GAME, {
                  state: lobbyPlayNavigationState(mapId, roomIdForState, null, roomCodeRef.current),
                });
              });
          }
        });
        unsubKicked = gameLobbyHub.on("KickedFromRoom", () => {
          leftViaButton.current = true;
          navigate(ROUTES.LEARNER_LEARN);
        });
      })
      .catch(() => {});
    return () => {
      unsubUpdated?.();
      unsubStarted?.();
      unsubKicked?.();
      unsubReconnect?.();
    };
  }, [roomId, room?.roomCode, navigate]);

  // Khi thoát khỏi trang phòng (Back, sidebar, v.v.) thì gọi API leave.
  // Chỉ leave nếu đã mount > 1s để tránh Strict Mode unmount/remount gọi leave ngay sau khi tạo phòng.
  useEffect(() => {
    if (!roomId) return;
    return () => {
      if (leftViaButton.current) return;
      const elapsed = Date.now() - mountedAt.current;
      if (elapsed < 1000) return;
      learnerLobbyApi.leaveRoom(roomId).catch(() => {});
    };
  }, [roomId]);

  useEffect(() => {
    learnerProfileApi
      .getProfile()
      .then((r) => {
        const id = r?.data?.userId;
        if (id) setCurrentUserId(String(id));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getCurrentUserCapabilities(false, "learner")
      .then((capabilities) => {
        setCanUsePrivateRoomFeature(capabilities.canPrivateRoom);
      })
      .catch(() => setCanUsePrivateRoomFeature(false));
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let unsubRoomChat: (() => void) | undefined;
    let pollTimer: number | undefined;
    let latestMessageId = "";
    const loadMessages = async () => {
      try {
        if (roomChatOpen) setRoomChatLoading(true);
        await gameLobbyHub.connect();
        const rawMessages = await gameLobbyHub.getRoomChatMessages(roomId, 100);
        const normalized = rawMessages
          .map((msg) => normalizeRoomChatMessage(msg))
          .filter((msg): msg is RoomChatMessagePayload => Boolean(msg));
        if (normalized.length > 0) latestMessageId = normalized[normalized.length - 1].id;
        setRoomChatMessages(normalized);
      } catch {
        if (roomChatOpen) setRoomChatMessages([]);
      } finally {
        if (roomChatOpen) setRoomChatLoading(false);
      }
    };
    void loadMessages();
    pollTimer = window.setInterval(() => {
      void gameLobbyHub
        .getRoomChatMessages(roomId, 100)
        .then((rawMessages) => {
          const normalized = rawMessages
            .map((msg) => normalizeRoomChatMessage(msg))
            .filter((msg): msg is RoomChatMessagePayload => Boolean(msg));
          if (normalized.length === 0) return;
          const newest = normalized[normalized.length - 1];
          if (!newest?.id || newest.id === latestMessageId) return;
          const prevLatest = latestMessageId;
          latestMessageId = newest.id;
          setRoomChatMessages(normalized);
          if (!roomChatOpen) {
            const newIncoming = normalized.filter((m) => {
              if (!prevLatest) return false;
              if (m.id === prevLatest) return false;
              const isSelf =
                String(m.senderId ?? "").toLowerCase() === String(currentUserId ?? "").toLowerCase();
              return !isSelf;
            });
            if (newIncoming.length > 0) {
              setRoomChatUnread((prev) => prev + newIncoming.length);
              const lastSender = newIncoming[newIncoming.length - 1]?.senderName || "Một người chơi";
              setRoomChatNotice(`${lastSender} vừa gửi tin nhắn`);
              if (roomChatNoticeTimeoutRef.current != null) {
                window.clearTimeout(roomChatNoticeTimeoutRef.current);
              }
              roomChatNoticeTimeoutRef.current = window.setTimeout(() => {
                setRoomChatNotice(null);
                roomChatNoticeTimeoutRef.current = null;
              }, 2500);
            }
          }
        })
        .catch(() => {});
    }, 5000);
    unsubRoomChat = gameLobbyHub.on("RoomChatMessage", (payload: unknown) => {
      const message = normalizeRoomChatMessage(payload);
      const msgRoomId = String(message?.roomId ?? "").toLowerCase();
      if (!msgRoomId || msgRoomId !== roomId.toLowerCase()) return;
      latestMessageId = message!.id;
      setRoomChatMessages((prev) => [...prev, message!].slice(-200));
      const isSelf =
        String(message?.senderId ?? "").toLowerCase() === String(currentUserId ?? "").toLowerCase();
      if (!roomChatOpen && !isSelf) {
        setRoomChatUnread((prev) => prev + 1);
        setRoomChatNotice(`${message?.senderName || "Một người chơi"} vừa gửi tin nhắn`);
        if (roomChatNoticeTimeoutRef.current != null) {
          window.clearTimeout(roomChatNoticeTimeoutRef.current);
        }
        roomChatNoticeTimeoutRef.current = window.setTimeout(() => {
          setRoomChatNotice(null);
          roomChatNoticeTimeoutRef.current = null;
        }, 2500);
      }
    });
    return () => {
      unsubRoomChat?.();
      if (pollTimer != null) window.clearInterval(pollTimer);
    };
  }, [currentUserId, roomChatOpen, roomId]);

  useEffect(() => {
    if (!roomChatOpen) return;
    setRoomChatUnread(0);
    setRoomChatNotice(null);
  }, [roomChatOpen]);

  useEffect(() => {
    return () => {
      if (roomChatNoticeTimeoutRef.current != null) {
        window.clearTimeout(roomChatNoticeTimeoutRef.current);
      }
    };
  }, []);

  const handleLeave = async () => {
    if (!roomId || actioning) return;
    setActioning(true);
    leftViaButton.current = true;
    try {
      await learnerLobbyApi.leaveRoom(roomId);
      navigate(ROUTES.LEARNER_LEARN);
    } catch {
      leftViaButton.current = false;
      window.alert(t("couldNotLeaveRoom"));
    } finally {
      setActioning(false);
    }
  };

  const handleToggleReady = async () => {
    if (!roomId || actioning) return;
    setActioning(true);
    try {
      const res = await learnerLobbyApi.toggleReady(roomId);
      if (res.data?.isSuccess && res.data?.data) {
        setRoom((prev) => normalizeDetail(res.data.data as unknown as Record<string, unknown>, prev));
      }
    } catch {
      window.alert(t("couldNotUpdateReady"));
    } finally {
      setActioning(false);
    }
  };

  const handleKickPlayer = async (playerId: string) => {
    if (!roomId || actioning || !isHost || !currentUserId) return;
    if (playerId.toLowerCase() === currentUserId.toLowerCase()) return;
    const ok = window.confirm("Bạn có chắc muốn mời người chơi này ra khỏi phòng?");
    if (!ok) return;
    setActioning(true);
    try {
      await gameLobbyHub.kickPlayer(roomId, playerId);
    } catch {
      window.alert("Không thể kick người chơi lúc này.");
    } finally {
      setActioning(false);
    }
  };

  const handleOpenRoomChat = () => {
    if (roomChatOpen) {
      setRoomChatOpen(false);
      return;
    }
    setRoomChatOpen(true);
  };

  const handleSendRoomChat = async () => {
    const content = roomChatInput.trim();
    if (!roomId || !content || roomChatSending) return;
    setRoomChatSending(true);
    try {
      await gameLobbyHub.sendRoomChatMessage(roomId, content);
      setRoomChatInput("");
    } catch {
      window.alert("Không thể gửi tin nhắn lúc này.");
    } finally {
      setRoomChatSending(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || actioning || !room) return;
    const selectedMapId = room.selectedMapId;
    const roomCode = room.roomCode;
    if (!selectedMapId) {
      window.alert("Bạn cần chọn trò chơi trước khi bắt đầu.");
      return;
    }
    const blockedReasons = getStartBlockedReasons();
    if (blockedReasons.length > 0) {
      window.alert(blockedReasons.join("\n"));
      return;
    }
    setActioning(true);
    try {
      const res = await learnerLobbyApi.startGame(roomId);
      if (res.data?.isSuccess) {
        leftViaButton.current = true;
        learnerMapsApi
          .getMapById(selectedMapId)
          .then((resMap) => {
            const map = resMap.data?.data;
            const hint = getFirstLevelPlayHint(map);
            const targetRoute =
              hint.mapType === "platform"
                ? ROUTES.PLATFORM
                : hint.mapType === "snake"
                  ? ROUTES.SNAKE
                  : ROUTES.GAME;
            navigate(targetRoute, {
              state: lobbyPlayNavigationState(selectedMapId, roomId, map, roomCode),
            });
          })
          .catch(() => {
            navigate(ROUTES.GAME, {
              state: lobbyPlayNavigationState(selectedMapId, roomId, null, roomCode),
            });
          });
      } else {
        window.alert(res.data?.message ?? t("couldNotStartGame"));
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : t("couldNotStartGame");
      window.alert(msg ?? t("couldNotStartGame"));
    } finally {
      setActioning(false);
    }
  };

  const handleCopyCode = () => {
    if (room?.roomCode) {
      navigator.clipboard.writeText(room.roomCode);
      window.alert(t("roomCodeCopied"));
    }
  };

  const handleSetMap = async (mapId: string) => {
    if (!roomId || actioning) return;
    setActioning(true);
    try {
      const res = await learnerLobbyApi.setRoomMap(roomId, { mapId });
      if (res.data?.isSuccess && res.data?.data)
        setRoom((prev) => normalizeDetail(res.data.data as unknown as Record<string, unknown>, prev));
      else window.alert(res.data?.message ?? "Could not set map.");
    } catch {
      window.alert("Could not set map.");
    } finally {
      setActioning(false);
      setMapModalOpen(false);
    }
  };

  const handleUpdateMaxPlayers = async (nextMaxPlayers: number) => {
    if (!roomId || actioning || !room || !isHost) return;
    if (nextMaxPlayers === room.maxPlayers) return;
    setActioning(true);
    try {
      const res = await learnerLobbyApi.setRoomMap(roomId, {
        maxPlayers: nextMaxPlayers,
        mapId: room.selectedMapId ?? undefined,
      });
      if (res.data?.isSuccess && res.data?.data) {
        setRoom((prev) => normalizeDetail(res.data.data as unknown as Record<string, unknown>, prev));
        setShowMaxPlayersEditor(false);
      } else {
        window.alert(res.data?.message ?? "Could not update max players.");
      }
    } catch {
      window.alert("Could not update max players.");
    } finally {
      setActioning(false);
    }
  };

  const openMapBrowseToPick = useCallback(() => {
    if (!roomId) return;
    // Intentional temporary navigation to map browsing: keep membership/host role.
    leftViaButton.current = true;
    navigate(ROUTES.LEARNER_MAPS_BROWSE, {
      state: {
        lobbyPickMode: true,
        lobbyPickForRoom: true,
        lobbyPickReturnTo: ROUTES.LEARNER_ROOM_DETAIL(roomId),
        roomId,
        roomCode: room?.roomCode ?? "",
      },
    });
  }, [navigate, room?.roomCode, roomId]);

  useEffect(() => {
    if (!isHost || !roomId) return;
    if (locationState?.applyMapSelectionFromBrowse !== true) return;
    const selectedMapIdFromBrowse = locationState?.selectedMapIdFromBrowse?.trim();
    const selectedRoomId = locationState?.roomId?.trim();
    if (!selectedMapIdFromBrowse || !selectedRoomId) return;
    if (selectedRoomId.toLowerCase() !== roomId.toLowerCase()) return;
    const marker = `${roomId}:${selectedMapIdFromBrowse}`;
    if (appliedBrowseMapRef.current === marker) return;
    appliedBrowseMapRef.current = marker;
    void handleSetMap(selectedMapIdFromBrowse);
    navigate(ROUTES.LEARNER_ROOM_DETAIL(roomId), {
      replace: true,
      state: {
        roomId,
        roomCode: room?.roomCode ?? locationState?.roomCode ?? "",
      },
    });
  }, [
    handleSetMap,
    isHost,
    locationState?.applyMapSelectionFromBrowse,
    locationState?.roomCode,
    locationState?.roomId,
    locationState?.selectedMapIdFromBrowse,
    navigate,
    room?.roomCode,
    roomId,
  ]);

  const handleToggleLock = async () => {
    if (!roomId || actioning || !room) return;
    if (!canUsePrivateRoomFeature) {
      window.alert("Gói hiện tại chưa hỗ trợ phòng private.");
      return;
    }
    setActioning(true);
    try {
      const res = await learnerLobbyApi.setRoomLock(roomId, { isLocked: !room.isLocked });
      if (res.data?.isSuccess && res.data?.data) {
        setRoom((prev) => normalizeDetail(res.data.data as unknown as Record<string, unknown>, prev));
      } else {
        window.alert(res.data?.message ?? t("couldNotUpdateReady"));
      }
    } catch {
      window.alert(t("couldNotUpdateReady"));
    } finally {
      setActioning(false);
    }
  };

  useEffect(() => {
    if (!mapModalOpen) return;
    setMapsLoading(true);
    learnerMapsApi
      .getMaps({ pageSize: 50, publishedOnly: true })
      .then((res) => {
        if (res.data?.data?.items) {
          const items = res.data.data.items;
          setMaps(items);
          void Promise.all(
            items.map(async (m) => {
              if ((m.price ?? 0) <= 0) return { id: m.id, locked: false };
              const own = await learnerMapsApi.checkMapOwnership(m.id);
              return { id: m.id, locked: own.data?.data?.isOwned !== true };
            }),
          ).then((checks) => {
            const next = new Set(checks.filter((c) => c.locked).map((c) => c.id));
            setLockedMapIds(next);
          });
        }
      })
      .finally(() => setMapsLoading(false));
  }, [mapModalOpen]);

  const loadSelectedMapDetail = useCallback(async (mapId: string) => {
    if (!mapId) return null;
    if (selectedMapDetailRef.current?.id === mapId) return selectedMapDetailRef.current;
    setSelectedMapDetailLoading(true);
    try {
      const res = await learnerMapsApi.getMapById(mapId);
      if (res.data?.isSuccess && res.data?.data) {
        setSelectedMapDetail(res.data.data as ApiMap);
        return res.data.data;
      }
    } catch {
      // no-op: fallback below
    } finally {
      setSelectedMapDetailLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    const mapId = room?.selectedMapId?.trim();
    if (!mapId) {
      setSelectedMapDetail(null);
      return;
    }
    void loadSelectedMapDetail(mapId);
  }, [loadSelectedMapDetail, room?.selectedMapId]);

  const currentUserReady =
    room &&
    currentUserId &&
    room.players.some(
      (p) => String(p.playerId).toLowerCase() === String(currentUserId).toLowerCase() && p.isReady,
    );
  const allReady = room && room.players.length > 0 && room.players.every((p) => p.isReady);
  const canStart = Boolean(
    room &&
      room.status === "Waiting" &&
      room.currentPlayerCount >= 2 &&
      room.selectedMapId &&
      allReady &&
      isHost &&
      !lockedMapIds.has(room.selectedMapId),
  );
  const getStartBlockedReasons = useCallback((): string[] => {
    if (!room) return [t("couldNotStartGame")];
    const reasons: string[] = [];
    if (room.status !== "Waiting") reasons.push("Phòng hiện không ở trạng thái chờ để bắt đầu.");
    if (!isHost) reasons.push("Chỉ host mới có thể bắt đầu game.");
    if (!room.selectedMapId) reasons.push("Bạn cần chọn trò chơi trước khi bắt đầu.");
    if (room.currentPlayerCount < 2) reasons.push("Cần ít nhất 2 người chơi để bắt đầu.");
    if (!allReady) reasons.push("Cần tất cả người chơi sẵn sàng mới bắt đầu được.");
    if (room.selectedMapId && lockedMapIds.has(room.selectedMapId)) {
      reasons.push("Có người chơi chưa sở hữu trò chơi đã chọn.");
    }
    return reasons;
  }, [allReady, isHost, lockedMapIds, room, t]);
  const selectedGameLabel =
    room?.selectedGameTitle?.trim() ||
    selectedMapDetail?.title?.trim() ||
    (room?.selectedMapId ? `${room.selectedMapId.slice(0, 8)}…` : null);
  const selectedMapPreviewUrl =
    selectedMapDetail?.avatarUrl?.trim() ||
    selectedMapDetail?.gallery?.find((item) => item.kind !== "Video")?.url?.trim() ||
    selectedMapDetail?.gallery?.[0]?.url?.trim() ||
    "";

  useEffect(() => {
    if (!(isHost && room?.status === "Waiting")) {
      setShowMaxPlayersEditor(false);
    }
  }, [isHost, room?.status]);
  if (!roomId) {
    navigate(ROUTES.LEARNER_LEARN);
    return null;
  }

  if (loading && !room) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.loadingWrap}>
          <Loader2 size={32} className={styles.spinner} aria-hidden />
          <p>{t("loadingRoom")}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.container}>
          <p className={styles.error}>{t("roomNotFound")}</p>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_LEARN)}
          >
            <ChevronLeft size={20} />
            {t("back")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_LEARN)}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
            {t("back")}
          </button>
          <div className={styles.roomCodeWrap}>
            <span className={styles.roomCodeLabel}>{t("roomCode")}</span>
            <div className={styles.roomCodeRow}>
              <span className={styles.roomCode}>{room.roomCode}</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={handleCopyCode}
                title={t("copyCode")}
                aria-label={t("copyCode")}
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
          <div className={styles.meta} aria-live="polite" title={t("playersInRoomLive")}>
            <Users size={18} aria-hidden />
            {isHost && room.status === "Waiting" ? (
              <button
                type="button"
                className={`${styles.playerCountLive} ${styles.playerCountBtn}`}
                onClick={() => setShowMaxPlayersEditor((v) => !v)}
                title={t("maxPlayers")}
              >
                {room.players.length > 0 ? room.players.length : room.currentPlayerCount}/{room.maxPlayers}
              </button>
            ) : (
              <span className={styles.playerCountLive}>
                {room.players.length > 0 ? room.players.length : room.currentPlayerCount}/{room.maxPlayers}
              </span>
            )}
            <span aria-hidden> · </span>
            {room.status}
            {isHost && room.status === "Waiting" && showMaxPlayersEditor ? (
              <div className={styles.maxPlayersInlineEditor}>
                <label className={`${styles.maxPlayersField} ${styles.maxPlayersMetaField}`}>
                  <span>{t("maxPlayers")}</span>
                  <select
                    value={room.maxPlayers}
                    onChange={(e) => void handleUpdateMaxPlayers(Number(e.target.value))}
                    disabled={actioning}
                  >
                    {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </header>

        {room.selectedMapId && (
          <div className={styles.mapHintWrap}>
            <div className={styles.mapHintTopRow}>
              <p className={styles.mapHint}>
                {t("mapSelected")}:{" "}
                <button
                  type="button"
                  className={styles.mapLinkBtn}
                  onMouseEnter={() => {
                    void loadSelectedMapDetail(room.selectedMapId!);
                  }}
                  onFocus={() => {
                    void loadSelectedMapDetail(room.selectedMapId!);
                  }}
                  onClick={() => {
                    void loadSelectedMapDetail(room.selectedMapId!).then(() => setMapDetailOpen(true));
                  }}
                  title="Xem chi tiết game"
                >
                  {selectedGameLabel}
                </button>
              </p>
            </div>
            <button
              type="button"
              className={styles.mapHintPreviewBtn}
              onMouseEnter={() => {
                void loadSelectedMapDetail(room.selectedMapId!);
              }}
              onFocus={() => {
                void loadSelectedMapDetail(room.selectedMapId!);
              }}
              onClick={() => {
                void loadSelectedMapDetail(room.selectedMapId!).then(() => setMapDetailOpen(true));
              }}
              title="Xem chi tiết game"
            >
              {selectedMapPreviewUrl ? (
                <img
                  src={selectedMapPreviewUrl}
                  alt={selectedMapDetail?.title || selectedGameLabel || "Game preview"}
                  className={styles.mapHintPreviewImg}
                />
              ) : (
                <div className={styles.mapHintPreviewFallback}>
                  <MapIcon size={16} />
                </div>
              )}
            </button>
            {selectedMapDetailLoading ? (
              <span className={styles.mapHintLoading}>Loading detail…</span>
            ) : null}
          </div>
        )}
        {isHost && room.status === "Waiting" && (
          <div className={styles.hostActions}>
            <button
              type="button"
              className={styles.hostBtn}
              onClick={openMapBrowseToPick}
              disabled={actioning}
            >
              <MapIcon size={16} />
              {room.selectedMapId ? t("changeMap") : t("selectMap")}
            </button>
            <button
              type="button"
              className={styles.hostBtnSecondary}
              onClick={handleToggleLock}
              disabled={actioning || !canUsePrivateRoomFeature}
              style={!canUsePrivateRoomFeature ? { opacity: 0.55, cursor: "not-allowed" } : undefined}
              title={room.isLocked ? t("unlockRoom") : t("lockRoom")}
            >
              {room.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              {room.isLocked ? t("unlockRoom") : t("lockRoom")}
            </button>
          </div>
        )}

        <section className={styles.players}>
          <h2 className={styles.playersTitle}>{t("players")}</h2>
          <ul className={styles.playersList}>
            {room.players.map((p) => (
              <li key={p.playerId} className={styles.playerItem}>
                <span className={styles.playerId}>
                  {String(p.playerId).toLowerCase() === normalizedCurrentUserId
                    ? `${t("you")} (${(p.playerName?.trim() || p.playerId.slice(0, 8)).trim()})`
                    : (p.playerName?.trim() || p.playerId.slice(0, 8) + "…")}
                </span>
                {p.isHost && <span className={styles.hostBadge}>{t("host")}</span>}
                {p.isReady && <Check size={16} className={styles.readyIcon} aria-hidden />}
                {isHost &&
                normalizedCurrentUserId &&
                p.playerId.toLowerCase() !== normalizedCurrentUserId &&
                !p.isHost ? (
                  <button
                    type="button"
                    className={styles.kickBtn}
                    disabled={actioning}
                    onClick={() => void handleKickPlayer(p.playerId)}
                  >
                    Kick
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.actions}>
          {isHost && room.status === "Waiting" && (
            <button
              type="button"
              className={styles.startBtn}
              onClick={handleStartGame}
              disabled={actioning}
              title={!canStart ? t("startGameDisabled") : t("startGame")}
            >
              <Play size={18} aria-hidden />
              {t("startGame")}
            </button>
          )}
          {!isHost && (
            <button
              type="button"
              className={styles.startBtn}
              onClick={handleToggleReady}
              disabled={actioning || room.status !== "Waiting"}
              title={
                room.status === "Waiting"
                  ? currentUserReady
                    ? t("cancelReady")
                    : t("toggleReady")
                  : undefined
              }
            >
              {actioning ? (
                <Loader2 size={18} className={styles.spinner} aria-hidden />
              ) : currentUserReady ? (
                t("cancelReady")
              ) : (
                t("toggleReady")
              )}
            </button>
          )}
          <div className={`${styles.secondaryActions} ${!isHost ? styles.secondaryActionsSingle : ""}`}>
            {isHost && (
              <button
                type="button"
                className={styles.readyBtn}
                onClick={handleToggleReady}
                disabled={actioning || room.status !== "Waiting"}
                title={
                  room.status === "Waiting"
                    ? currentUserReady
                      ? t("cancelReady")
                      : t("toggleReady")
                    : undefined
                }
              >
                {actioning ? (
                  <Loader2 size={18} className={styles.spinner} aria-hidden />
                ) : currentUserReady ? (
                  t("cancelReady")
                ) : (
                  t("toggleReady")
                )}
              </button>
            )}
            <button
              type="button"
              className={styles.leaveBtn}
              onClick={handleLeave}
              disabled={actioning}
            >
              <LogOut size={18} aria-hidden />
              {t("leaveRoom")}
            </button>
          </div>
        </section>
      </div>

      {mapModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !actioning && setMapModalOpen(false)}>
          <div className={`${styles.modal} ${styles.modalMapPick}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("selectMap")}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setMapModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBodyMapPick}>
              <div className={styles.mapPickerScroll}>
                <LobbyMapPickerGrid
                  maps={maps}
                  loading={mapsLoading}
                  selectedMapId={room?.selectedMapId ?? null}
                  onSelectMap={(id) => {
                    if (id) void handleSetMap(id);
                  }}
                  disabled={actioning}
                  disabledMapIds={lockedMapIds}
                  disabledReason="Bạn cần sở hữu game này trước khi chọn trong lobby."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {mapDetailOpen && room.selectedMapId && (
        <div className={styles.modalOverlay} onClick={() => setMapDetailOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Game detail</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setMapDetailOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailHero}>
                {selectedMapPreviewUrl ? (
                  <img
                    src={selectedMapPreviewUrl}
                    alt={selectedMapDetail?.title || "Game preview"}
                    className={styles.detailHeroImg}
                  />
                ) : (
                  <div className={styles.detailHeroFallback}>No preview</div>
                )}
              </div>

              <p className={styles.detailTitle}>{selectedMapDetail?.title?.trim() || selectedGameLabel}</p>
              {selectedMapDetail?.description?.trim() ? (
                <p className={styles.detailDesc}>{selectedMapDetail.description}</p>
              ) : (
                <p className={styles.detailDescMuted}>No description.</p>
              )}

              {selectedMapDetail?.tagNames?.length ? (
                <div className={styles.detailTags}>
                  {selectedMapDetail.tagNames.slice(0, 8).map((tag) => (
                    <span key={tag} className={styles.detailTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className={styles.detailGrid}>
                <span>Difficulty</span>
                <strong>{selectedMapDetail?.difficulty ?? "—"}</strong>
                <span>Price</span>
                <strong>
                  {selectedMapDetail?.price != null
                    ? selectedMapDetail.price > 0
                      ? `${selectedMapDetail.price.toLocaleString()} OC`
                      : "Free"
                    : "—"}
                </strong>
                <span>Creator</span>
                <strong>{selectedMapDetail?.createdByUserName?.trim() || "—"}</strong>
              </div>

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className={styles.detailOpenBtn}
                  onClick={() => {
                    setMapDetailOpen(false);
                    navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", room.selectedMapId!));
                  }}
                >
                  <ExternalLink size={14} />
                  Open full detail page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.chatDock}>
        {roomChatNotice && !roomChatOpen ? (
          <div className={styles.chatNoticeToast}>{roomChatNotice}</div>
        ) : null}
        {roomChatOpen ? (
          <div className={styles.chatPanel}>
            <div className={styles.chatPanelHeader}>
              <div className={styles.chatPanelTitle}>Chat phòng</div>
              <button
                type="button"
                className={styles.chatPanelClose}
                onClick={() => setRoomChatOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className={styles.chatPanelBody}>
              {roomChatLoading ? <div className={styles.chatStateText}>Đang tải chat phòng...</div> : null}
              {!roomChatLoading && roomChatMessages.length === 0 ? (
                <div className={styles.chatStateText}>Chưa có tin nhắn nào.</div>
              ) : null}
              {!roomChatLoading && roomChatMessages.length > 0 ? (
                <div className={styles.chatMessages}>
                  {roomChatMessages.map((m) => (
                    <div
                      key={m.id}
                      className={`${styles.chatMsgRow} ${
                        String(m.senderId).toLowerCase() === normalizedCurrentUserId
                          ? styles.chatMsgRowSelf
                          : ""
                      }`}
                    >
                      <div
                        className={`${styles.chatMsgBubble} ${
                          String(m.senderId).toLowerCase() === normalizedCurrentUserId
                            ? styles.chatMsgBubbleSelf
                            : ""
                        }`}
                      >
                        <div className={styles.chatMessageMeta}>
                          <span className={styles.chatSender}>{m.senderName}</span>
                          <span className={styles.chatTime}>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className={styles.chatContent}>{m.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className={styles.chatComposer}>
                <input
                  value={roomChatInput}
                  onChange={(e) => setRoomChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSendRoomChat();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  className={styles.chatInput}
                />
                <button
                  type="button"
                  className={styles.chatSendBtn}
                  disabled={roomChatSending || roomChatInput.trim().length === 0}
                  onClick={() => void handleSendRoomChat()}
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <button type="button" className={styles.chatBubbleBtn} onClick={() => void handleOpenRoomChat()}>
          <MessageCircle size={18} />
          Chat phòng
          {roomChatUnread > 0 ? (
            <span className={styles.chatUnreadBadge}>
              {roomChatUnread > 99 ? "99+" : String(roomChatUnread)}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}
