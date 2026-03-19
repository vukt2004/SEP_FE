import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle2, Users, Map, Plus, LogIn, Loader2, X } from "lucide-react";
import styles from "../components/ModeSelectPage.module.css";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import type { LobbyRoomListItem } from "@/types/api/learner/lobby";
import type { Map as ApiMap } from "@/types/api/learner/maps";

function normalizeRoom(item: Record<string, unknown>): LobbyRoomListItem {
  return {
    roomId: String(item.roomId ?? item.RoomId ?? ""),
    roomCode: String(item.roomCode ?? item.RoomCode ?? ""),
    hostId: String(item.hostId ?? item.HostId ?? ""),
    currentPlayerCount: Number(item.currentPlayerCount ?? item.CurrentPlayerCount ?? 0),
    maxPlayers: Number(item.maxPlayers ?? item.MaxPlayers ?? 8),
    status: (item.status ?? item.Status ?? "Waiting") as LobbyRoomListItem["status"],
    isLocked: Boolean(item.isLocked ?? item.IsLocked),
    selectedMapId:
      item.selectedMapId != null
        ? String(item.selectedMapId)
        : item.SelectedMapId != null
          ? String(item.SelectedMapId)
          : null,
  };
}

const MAX_PLAYER_OPTIONS = [2, 4, 6, 8] as const;

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<LobbyRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMaxPlayers, setCreateMaxPlayers] = useState(4);
  const [createMapId, setCreateMapId] = useState<string | null>(null);
  const [maps, setMaps] = useState<ApiMap[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learnerLobbyApi.getRooms();
      const data = res.data?.data as unknown;
      if (Array.isArray(data)) {
        setRooms((data as unknown[]).map((r) => normalizeRoom(r as Record<string, unknown>)));
      } else {
        setRooms([]);
      }
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // SignalR: connect and listen LobbyRoomList, AlreadyInRoom
  useEffect(() => {
    let unsubList: (() => void) | undefined;
    let unsubAlready: (() => void) | undefined;
    gameLobbyHub
      .connect()
      .then(() => {
        gameLobbyHub.getLobbyRooms();
        unsubList = gameLobbyHub.on("LobbyRoomList", (list: unknown) => {
          const arr = Array.isArray(list) ? list : [];
          setRooms(arr.map((r: Record<string, unknown>) => normalizeRoom(r)));
          setLoading(false);
        });
        unsubAlready = gameLobbyHub.on("AlreadyInRoom", (data: unknown) => {
          const d = data as { roomId?: string };
          if (d?.roomId) navigate(ROUTES.LEARNER_ROOM_DETAIL(d.roomId));
        });
      })
      .catch(() => setLoading(false));
    return () => {
      unsubList?.();
      unsubAlready?.();
    };
  }, [navigate]);

  // Initial fetch (fallback if SignalR not ready)
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Load maps when create modal opens
  useEffect(() => {
    if (!createModalOpen) return;
    setMapsLoading(true);
    learnerMapsApi
      .getMaps({ pageSize: 50, publishedOnly: true })
      .then((res) => {
        if (res.data?.data?.items) setMaps(res.data.data.items);
      })
      .finally(() => setMapsLoading(false));
  }, [createModalOpen]);

  const handleCreateRoom = async () => {
    setCreating(true);
    try {
      const res = await learnerLobbyApi.createRoom({
        maxPlayers: createMaxPlayers,
        selectedMapId: createMapId,
      });
      const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
      const roomId =
        payload &&
        typeof payload === "object" &&
        (payload as Record<string, unknown>).roomId != null
          ? String((payload as Record<string, unknown>).roomId)
          : payload &&
              typeof payload === "object" &&
              (payload as Record<string, unknown>).RoomId != null
            ? String((payload as Record<string, unknown>).RoomId)
            : null;
      if (res.data?.isSuccess && roomId) {
        setCreateModalOpen(false);
        const roomCode =
          (payload as Record<string, unknown>).roomCode ??
          (payload as Record<string, unknown>).RoomCode;
        const maxPlayers =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(roomId), {
          state: {
            roomId,
            roomCode: roomCode != null ? String(roomCode) : "",
            hostId: "", // will be filled by GET
            currentPlayerCount: 1,
            maxPlayers: typeof maxPlayers === "number" ? maxPlayers : 8,
            status: "Waiting",
            isLocked: false,
            selectedMapId: createMapId,
            players: [],
          },
        });
        return;
      }
      window.alert(res.data?.message ?? "Could not create room.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Could not create room.";
      window.alert(msg ?? "Could not create room.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const res = await learnerLobbyApi.joinRoom({ roomId });
      const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
      const joinedRoomId =
        payload &&
        typeof payload === "object" &&
        (payload as Record<string, unknown>).roomId != null
          ? String((payload as Record<string, unknown>).roomId)
          : payload &&
              typeof payload === "object" &&
              (payload as Record<string, unknown>).RoomId != null
            ? String((payload as Record<string, unknown>).RoomId)
            : null;
      if (res.data?.isSuccess && joinedRoomId) {
        const roomCode =
          (payload as Record<string, unknown>).roomCode ??
          (payload as Record<string, unknown>).RoomCode;
        const maxPlayers =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        const currentPlayerCount =
          (payload as Record<string, unknown>).currentPlayerCount ??
          (payload as Record<string, unknown>).CurrentPlayerCount;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(joinedRoomId), {
          state: {
            roomId: joinedRoomId,
            roomCode: roomCode != null ? String(roomCode) : "",
            hostId: "",
            currentPlayerCount: typeof currentPlayerCount === "number" ? currentPlayerCount : 1,
            maxPlayers: typeof maxPlayers === "number" ? maxPlayers : 8,
            status: "Waiting",
            isLocked: false,
            selectedMapId: null,
            players: [],
          },
        });
        return;
      }
      const msg = res.data?.message ?? "Could not join room.";
      window.alert(msg);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Could not join room.";
      window.alert(msg ?? "Could not join room.");
    } finally {
      setJoiningId(null);
    }
  };

  const waitingRooms = rooms.filter(
    (r) => r.status === "Waiting" && !r.isLocked && r.currentPlayerCount < r.maxPlayers,
  );

  return (
    <main className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <section className={styles.container}>
        <header className={styles.header}>
          <span className={styles.badge}>{t("chooseExperience")}</span>
          <h1 className={styles.title}>{t("howToPlay")}</h1>
          <p className={styles.subtitle}>{t("playSubtitle")}</p>
        </header>

        <div className={styles.grid}>
          <article className={`${styles.card} ${styles.cardSingle}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <UserCircle2 className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>{t("singlePlayer")}</h2>
              <p className={styles.cardLabel}>{t("singlePlayerDesc")}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
              >
                <Map size={18} aria-hidden />
                {t("viewMaps")}
              </button>
            </div>
          </article>

          <article className={`${styles.card} ${styles.cardMulti}`}>
            <div className={styles.cardGlow} aria-hidden />
            <div className={styles.cardBody}>
              <div className={styles.iconWrap} aria-hidden>
                <Users className={styles.iconSvg} strokeWidth={1.75} />
              </div>
              <h2 className={styles.cardTitle}>{t("competitive")}</h2>
              <p className={styles.cardLabel}>{t("competitiveDesc")}</p>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnAccent}`}
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus size={18} aria-hidden />
                {t("createRoom")}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => navigate(ROUTES.LEARNER_ROOM_JOIN)}
              >
                <LogIn size={18} aria-hidden />
                {t("joinRoom")}
              </button>
            </div>
          </article>
        </div>

        <section className={styles.roomsSection}>
          <h2 className={styles.roomsTitle}>{t("openRooms")}</h2>
          {loading ? (
            <p className={styles.roomsLoading}>
              <Loader2 size={20} className={styles.spinner} aria-hidden />
              {t("loadingRooms")}
            </p>
          ) : waitingRooms.length === 0 ? (
            <p className={styles.roomsEmpty}>{t("noOpenRooms")}</p>
          ) : (
            <ul className={styles.roomsList}>
              {waitingRooms.map((room) => (
                <li key={room.roomId} className={styles.roomItem}>
                  <span className={styles.roomCode}>{room.roomCode}</span>
                  <span className={styles.roomMeta}>
                    {room.currentPlayerCount}/{room.maxPlayers}
                  </span>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                    onClick={() => handleJoinRoom(room.roomId)}
                    disabled={joiningId !== null}
                  >
                    {joiningId === room.roomId ? (
                      <Loader2 size={16} className={styles.spinner} aria-hidden />
                    ) : (
                      t("joinRoomAction")
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      {/* Create room modal */}
      {createModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !creating && setCreateModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{t("createRoom")}</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => !creating && setCreateModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalLabel}>{t("maxPlayers")}</label>
              <div className={styles.slots}>
                {MAX_PLAYER_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.slot} ${createMaxPlayers === n ? styles.slotActive : ""}`}
                    onClick={() => setCreateMaxPlayers(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <label className={styles.modalLabel}>{t("selectMap")}</label>
              <select
                className={styles.modalSelect}
                value={createMapId ?? ""}
                onChange={(e) => setCreateMapId(e.target.value || null)}
                disabled={mapsLoading}
              >
                <option value="">{t("noMap")}</option>
                {maps.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.type})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnGhost}
                onClick={() => !creating && setCreateModalOpen(false)}
                disabled={creating}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className={styles.btnAccent}
                onClick={handleCreateRoom}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 size={18} className={styles.spinner} aria-hidden />
                ) : (
                  t("createRoom")
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
