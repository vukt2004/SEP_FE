import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle2, Users, Map, Plus, LogIn, Loader2 } from "lucide-react";
import styles from "../components/ModeSelectPage.module.css";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import type { LobbyRoomListItem } from "@/types/api/learner/lobby";

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

export default function ModeSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<LobbyRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await learnerLobbyApi.getRooms();
      const data = res.data?.data;
      if (Array.isArray(data)) {
        setRooms(data.map((r: Record<string, unknown>) => normalizeRoom(r)));
      } else {
        setRooms([]);
      }
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleJoinRoom = async (roomId: string) => {
    setJoiningId(roomId);
    try {
      const res = await learnerLobbyApi.joinRoom({ roomId });
      if (res.data?.isSuccess && res.data?.data?.roomId) {
        navigate(ROUTES.LEARNER_ROOM_DETAIL(res.data.data.roomId));
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
                onClick={() => navigate(ROUTES.LEARNER_ROOM_CREATE)}
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
    </main>
  );
}
