// src/portals/learner/pages/RoomResultPage.tsx
// Trang kết quả xếp hạng sau khi tất cả người chơi đã submit (multiplayer).
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Trophy } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { leaveLobbyRoom } from "@/lib/lobby/leaveLobbyRoom";
import type { PlayerRankingDto } from "@/types/api/learner/lobby";
import styles from "./RoomResultPage.module.css";

export default function RoomResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const state = location.state as { ranking?: PlayerRankingDto[]; roomId?: string } | null;
  const ranking = state?.ranking;
  const roomId = state?.roomId?.trim() || "";

  const leftViaAction = useRef(false);
  const mountedAt = useRef(0);
  mountedAt.current = mountedAt.current || Date.now();

  const leaveRoomSilently = useCallback(async () => {
    await leaveLobbyRoom(roomId);
  }, [roomId]);

  const leaveAndNavigate = useCallback(
    async (to: string) => {
      leftViaAction.current = true;
      await leaveRoomSilently();
      navigate(to, { replace: true });
    },
    [leaveRoomSilently, navigate],
  );

  // Khi rời trang (Back, đóng tab, chuyển route) mà chưa gọi leaveAndNavigate — gửi leave.
  useEffect(() => {
    if (!roomId) return;
    return () => {
      if (leftViaAction.current) return;
      const elapsed = Date.now() - mountedAt.current;
      if (elapsed < 1000) return;
      void leaveLobbyRoom(roomId);
    };
  }, [roomId]);

  if (!ranking || !Array.isArray(ranking) || ranking.length === 0) {
    navigate(ROUTES.LEARNER_LEARN, { replace: true });
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => void leaveAndNavigate(ROUTES.LEARNER_LEARN)}
          aria-label={t("back")}
        >
          <ChevronLeft size={20} />
          {t("back")}
        </button>
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Trophy size={28} className={styles.trophyIcon} aria-hidden />
            <h1 className={styles.title}>{t("rankingTitle")}</h1>
          </div>
          <p className={styles.subtitle}>{t("rankingSubtitle")}</p>
        </header>
        <ol className={styles.rankingList}>
          {ranking.map((r) => (
            <li key={r.playerId} className={styles.rankingItem}>
              <span className={styles.rank}>#{r.rank}</span>
              <span className={styles.playerId}>{r.playerId.slice(0, 8)}…</span>
              <span className={styles.score}>{r.score} pts</span>
              <span className={styles.status}>{r.status}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => void leaveAndNavigate(ROUTES.LEARNER_LEARN)}
        >
          {t("backToBrowse")}
        </button>
      </div>
    </div>
  );
}
