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
      window.alert(t("enterRoomCode", "Enter room code"));
      return;
    }
    setJoining(true);
    try {
      const res = await learnerLobbyApi.joinRoom({ roomCode: code });
      if (res.data?.isSuccess && res.data?.data?.roomId) {
        navigate(ROUTES.LEARNER_ROOM_DETAIL(res.data.data.roomId));
        return;
      }
      window.alert(res.data?.message ?? t("couldNotJoinRoom", "Could not join room."));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : t("couldNotJoinRoom", "Could not join room.");
      window.alert(msg ?? t("couldNotJoinRoom", "Could not join room."));
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
            {t("back", "Back")}
          </button>
          <h1 className={styles.title}>{t("joinRoom")}</h1>
          <p className={styles.subtitle}>
            {t("joinRoomSubtitle", "Enter the room code from your host.")}
          </p>
        </header>

        <section className={styles.form}>
          <label className={styles.label} htmlFor="room-code">
            {t("roomCode", "Room code")}
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
