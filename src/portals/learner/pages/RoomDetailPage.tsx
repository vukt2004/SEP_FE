// src/portals/learner/pages/RoomDetailPage.tsx
// Waiting room: show room code, players, ready, start (host), leave
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Users, Loader2, Play, LogOut, Check } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import type { LobbyRoomDetailResponse, LobbyPlayerDto } from "@/types/api/learner/lobby";
import styles from "./RoomDetailPage.module.css";

function normalizeDetail(raw: Record<string, unknown>): LobbyRoomDetailResponse {
  const players = (raw.players ?? raw.Players) as unknown[];
  return {
    roomId: String(raw.roomId ?? raw.RoomId ?? ""),
    roomCode: String(raw.roomCode ?? raw.RoomCode ?? ""),
    hostId: String(raw.hostId ?? raw.HostId ?? ""),
    currentPlayerCount: Number(raw.currentPlayerCount ?? raw.CurrentPlayerCount ?? 0),
    maxPlayers: Number(raw.maxPlayers ?? raw.MaxPlayers ?? 8),
    status: (raw.status ?? raw.Status ?? "Waiting") as LobbyRoomDetailResponse["status"],
    isLocked: Boolean(raw.isLocked ?? raw.IsLocked),
    selectedMapId:
      raw.selectedMapId != null
        ? String(raw.selectedMapId)
        : raw.SelectedMapId != null
          ? String(raw.SelectedMapId)
          : null,
    players: Array.isArray(players)
      ? (players.map((p: Record<string, unknown>) => ({
          playerId: String(p.playerId ?? p.PlayerId ?? ""),
          isReady: Boolean(p.isReady ?? p.IsReady),
          isHost: Boolean(p.isHost ?? p.IsHost),
        })) as LobbyPlayerDto[])
      : [],
  };
}

export default function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [room, setRoom] = useState<LobbyRoomDetailResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const leftViaButton = useRef(false);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await learnerLobbyApi.getRoom(roomId);
      if (res.data?.isSuccess && res.data?.data) {
        setRoom(normalizeDetail(res.data.data as Record<string, unknown>));
      } else {
        setRoom(null);
      }
    } catch {
      setRoom(null);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, 4000);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  // Khi thoát khỏi trang phòng (Back, sidebar, v.v.) thì gọi API leave
  useEffect(() => {
    if (!roomId) return;
    return () => {
      if (leftViaButton.current) return;
      learnerLobbyApi.leaveRoom(roomId).catch(() => {});
    };
  }, [roomId]);

  useEffect(() => {
    learnerProfileApi
      .getProfile()
      .then((r) => {
        const id = r?.data?.userId ?? r?.data?.UserId;
        if (id) setCurrentUserId(String(id));
      })
      .catch(() => {});
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
      window.alert(t("couldNotLeaveRoom", "Could not leave room."));
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
        setRoom(normalizeDetail(res.data.data as Record<string, unknown>));
      }
    } catch {
      window.alert(t("couldNotUpdateReady", "Could not update ready."));
    } finally {
      setActioning(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId || actioning) return;
    setActioning(true);
    try {
      const res = await learnerLobbyApi.startGame(roomId);
      if (res.data?.isSuccess && res.data?.data) {
        setRoom(normalizeDetail(res.data.data as Record<string, unknown>));
        // TODO: when game starts, navigate to game view or show in-game UI
        window.alert(t("gameStarted", "Game started! Game view coming soon."));
      } else {
        window.alert(res.data?.message ?? t("couldNotStartGame", "Could not start game."));
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : t("couldNotStartGame", "Could not start game.");
      window.alert(msg ?? t("couldNotStartGame", "Could not start game."));
    } finally {
      setActioning(false);
    }
  };

  const isHost = room && currentUserId && room.hostId === currentUserId;
  const canStart =
    room?.status === "Waiting" && room.currentPlayerCount >= 2 && room.selectedMapId && isHost;

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
          <p>{t("loadingRoom", "Loading room…")}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.container}>
          <p className={styles.error}>{t("roomNotFound", "Room not found.")}</p>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_LEARN)}
          >
            <ChevronLeft size={20} />
            {t("back", "Back")}
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
            {t("back", "Back")}
          </button>
          <div className={styles.roomCodeWrap}>
            <span className={styles.roomCodeLabel}>{t("roomCode", "Room code")}</span>
            <span className={styles.roomCode}>{room.roomCode}</span>
          </div>
          <div className={styles.meta}>
            <Users size={18} aria-hidden />
            {room.currentPlayerCount}/{room.maxPlayers} · {room.status}
          </div>
        </header>

        <section className={styles.players}>
          <h2 className={styles.playersTitle}>{t("players", "Players")}</h2>
          <ul className={styles.playersList}>
            {room.players.map((p) => (
              <li key={p.playerId} className={styles.playerItem}>
                <span className={styles.playerId}>
                  {p.playerId === currentUserId
                    ? `${t("you", "You")} (${p.playerId.slice(0, 8)}…)`
                    : p.playerId.slice(0, 8) + "…"}
                </span>
                {p.isHost && <span className={styles.hostBadge}>{t("host", "Host")}</span>}
                {p.isReady && <Check size={16} className={styles.readyIcon} aria-hidden />}
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.actions}>
          <button
            type="button"
            className={styles.readyBtn}
            onClick={handleToggleReady}
            disabled={actioning || room.status !== "Waiting"}
          >
            {actioning ? (
              <Loader2 size={18} className={styles.spinner} aria-hidden />
            ) : (
              t("toggleReady", "Ready")
            )}
          </button>
          {canStart && (
            <button
              type="button"
              className={styles.startBtn}
              onClick={handleStartGame}
              disabled={actioning}
            >
              <Play size={18} aria-hidden />
              {t("startGame", "Start game")}
            </button>
          )}
          <button
            type="button"
            className={styles.leaveBtn}
            onClick={handleLeave}
            disabled={actioning}
          >
            <LogOut size={18} aria-hidden />
            {t("leaveRoom", "Leave room")}
          </button>
        </section>
      </div>
    </div>
  );
}
