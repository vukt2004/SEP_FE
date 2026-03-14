// src/portals/learner/pages/RoomJoinPage.tsx
// Join a room by code – calls API then redirects to room waiting page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogIn, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import styles from "./RoomJoinPage.module.css";

export default function RoomJoinPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (!code) {
      window.alert(t("enterRoomCode"));
      return;
    }
    setJoining(true);
    try {
      const res = await learnerLobbyApi.joinRoom({ roomCode: code });
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
        const maxPlayersVal =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        const currentPlayerCount =
          (payload as Record<string, unknown>).currentPlayerCount ??
          (payload as Record<string, unknown>).CurrentPlayerCount;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(joinedRoomId), {
          state: {
            roomId: joinedRoomId,
            roomCode: roomCode != null ? String(roomCode) : code,
            hostId: "",
            currentPlayerCount: typeof currentPlayerCount === "number" ? currentPlayerCount : 1,
            maxPlayers: typeof maxPlayersVal === "number" ? maxPlayersVal : 8,
            status: "Waiting",
            isLocked: false,
            selectedMapId: null,
            players: [],
          },
        });
        return;
      }
      window.alert(res.data?.message ?? t("couldNotJoinRoom"));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : t("couldNotJoinRoom");
      window.alert(msg ?? t("couldNotJoinRoom"));
    } finally {
      setJoining(false);
    }
  };

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
          <h1 className={styles.title}>{t("joinRoom")}</h1>
          <p className={styles.subtitle}>{t("joinRoomSubtitle")}</p>
        </header>

        <section className={styles.form}>
          <label className={styles.label} htmlFor="room-code">
            {t("roomCode")}
          </label>
          <input
            id="room-code"
            type="text"
            className={styles.input}
            placeholder="e.g. AB12CD"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            maxLength={12}
            autoCapitalize="characters"
          />
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleJoin}
            disabled={joining || !roomCode.trim()}
          >
            {joining ? (
              <Loader2 size={20} className={styles.spinner} aria-hidden />
            ) : (
              <>
                <LogIn size={18} aria-hidden />
                {t("joinRoom")}
              </>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
