// src/portals/learner/pages/RoomCreatePage.tsx
// Create a multiplayer room – calls API then redirects to room waiting page
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import styles from "./RoomCreatePage.module.css";

const MAX_PLAYER_OPTIONS = [2, 4, 6, 8] as const;

export default function RoomCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await learnerLobbyApi.createRoom({ maxPlayers });
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
        const roomCode =
          (payload as Record<string, unknown>).roomCode ??
          (payload as Record<string, unknown>).RoomCode;
        const maxPlayersVal =
          (payload as Record<string, unknown>).maxPlayers ??
          (payload as Record<string, unknown>).MaxPlayers;
        navigate(ROUTES.LEARNER_ROOM_DETAIL(roomId), {
          state: {
            roomId,
            roomCode: roomCode != null ? String(roomCode) : "",
            hostId: "",
            currentPlayerCount: 1,
            maxPlayers: typeof maxPlayersVal === "number" ? maxPlayersVal : maxPlayers,
            status: "Waiting",
            isLocked: false,
            selectedMapId: null,
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
          <h1 className={styles.title}>{t("createRoom")}</h1>
          <p className={styles.subtitle}>
            {t("createRoomSubtitle")}
          </p>
        </header>

        <section className={styles.form}>
          <label className={styles.label}>{t("maxPlayers")}</label>
          <div className={styles.slots}>
            {MAX_PLAYER_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.slot} ${maxPlayers === n ? styles.slotActive : ""}`}
                onClick={() => setMaxPlayers(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <Loader2 size={20} className={styles.spinner} aria-hidden />
            ) : (
              t("createRoom")
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
