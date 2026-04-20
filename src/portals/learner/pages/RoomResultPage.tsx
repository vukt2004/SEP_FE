// src/portals/learner/pages/RoomResultPage.tsx
// Trang kết quả xếp hạng sau khi tất cả người chơi đã submit (multiplayer).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft, Trophy } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { leaveLobbyRoom } from "@/lib/lobby/leaveLobbyRoom";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import type { PlayerRankingDto } from "@/types/api/learner/lobby";
import styles from "./RoomResultPage.module.css";

export default function RoomResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const state = location.state as {
    ranking?: PlayerRankingDto[];
    roomId?: string;
    multiplayerRoomCode?: string;
    levelId?: string;
    nextMapDetailId?: string | null;
    nextRoute?: string;
  } | null;
  const ranking = state?.ranking;
  const roomId = state?.roomId?.trim() || "";
  const levelId = state?.levelId?.trim() || "";
  const multiplayerRoomCode = state?.multiplayerRoomCode?.trim() || "";
  const nextMapDetailId = state?.nextMapDetailId?.trim() || "";
  const nextRoute = state?.nextRoute || ROUTES.GAME;
  const hasNextLevel = Boolean(levelId && nextMapDetailId);
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>({});
  const [liveRanking, setLiveRanking] = useState<PlayerRankingDto[]>(ranking ?? []);

  const leftViaAction = useRef(false);
  const mountedAt = useRef(0);
  mountedAt.current = mountedAt.current || Date.now();

  const leaveRoomSilently = useCallback(async () => {
    await leaveLobbyRoom(roomId);
  }, [roomId]);

  useEffect(() => {
    setLiveRanking(ranking ?? []);
  }, [ranking]);

  const leaveAndNavigate = useCallback(
    async (to: string) => {
      leftViaAction.current = true;
      await leaveRoomSilently();
      navigate(to, { replace: true });
    },
    [leaveRoomSilently, navigate],
  );

  const goNextLevel = useCallback(() => {
    if (!roomId || !levelId || !nextMapDetailId) return;
    leftViaAction.current = true;
    navigate(nextRoute, {
      replace: true,
      state: {
        levelId,
        mapDetailId: nextMapDetailId,
        multiplayerRoomId: roomId,
        multiplayerRoomCode,
      },
    });
  }, [levelId, multiplayerRoomCode, navigate, nextMapDetailId, nextRoute, roomId]);

  const goBackToRoom = useCallback(async () => {
    if (!roomId) return;
    leftViaAction.current = true;
    // Ensure room returns to waiting state so host can configure/start next match.
    await learnerLobbyApi.endGame(roomId).catch(() => {});
    navigate(ROUTES.LEARNER_ROOM_DETAIL(roomId), {
      replace: true,
      state: {
        roomId,
        roomCode: multiplayerRoomCode,
      },
    });
  }, [multiplayerRoomCode, navigate, roomId]);

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

  const rankingNormalized = useMemo(
    () =>
      (liveRanking ?? []).map((row) => ({
        ...row,
        levelDetails: [...(row.levelDetails ?? [])].sort((a, b) => a.levelIndex - b.levelIndex),
      })),
    [liveRanking],
  );

  const formatSeconds = useCallback((value: number | null | undefined) => {
    if (value == null || Number.isNaN(value)) return "-";
    return `${value.toFixed(2)}s`;
  }, []);

  useEffect(() => {
    if (!roomId) return;
    let unsubRanking: (() => void) | undefined;
    let unsubReconnect: (() => void) | undefined;
    const joinRoomGroup = () => {
      void gameLobbyHub.joinRoom(roomId, null).catch(() => {});
    };
    void gameLobbyHub.connect().then(() => {
      joinRoomGroup();
      unsubReconnect = gameLobbyHub.onReconnected(joinRoomGroup);
      unsubRanking = gameLobbyHub.on("RankingUpdated", (payload: unknown) => {
        const data = payload as
          | { roomId?: string; RoomId?: string; ranking?: PlayerRankingDto[]; Ranking?: PlayerRankingDto[] }
          | undefined;
        const updatedRoomId = String(data?.roomId ?? data?.RoomId ?? "").toLowerCase();
        if (!updatedRoomId || updatedRoomId !== roomId.toLowerCase()) return;
        const nextRanking = data?.ranking ?? data?.Ranking;
        if (!Array.isArray(nextRanking)) return;
        setLiveRanking(nextRanking);
      });
    });
    return () => {
      unsubRanking?.();
      unsubReconnect?.();
    };
  }, [roomId]);

  if (!roomId) {
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
        {rankingNormalized.length === 0 ? (
          <div className={styles.subtitle}>Waiting for players to submit... (Realtime)</div>
        ) : (
          <ol className={styles.rankingList}>
            {rankingNormalized.map((r) => {
            const hasLevelDetails = (r.levelDetails?.length ?? 0) > 0;
            const expanded = expandedPlayers[r.playerId] === true;
            return (
              <li key={r.playerId} className={styles.rankingItemWrap}>
                <button
                  type="button"
                  className={styles.rankingItem}
                  onClick={() => {
                    if (!hasLevelDetails) return;
                    setExpandedPlayers((prev) => ({ ...prev, [r.playerId]: !expanded }));
                  }}
                  disabled={!hasLevelDetails}
                >
                  <span className={styles.rank}>#{r.rank}</span>
                  <span className={styles.playerId}>{r.playerId.slice(0, 8)}…</span>
                  <span className={styles.score}>{r.score} pts</span>
                  <span className={styles.status}>{r.status}</span>
                  {hasLevelDetails ? (
                    <ChevronDown
                      size={16}
                      className={`${styles.expandIcon} ${expanded ? styles.expandIconOpen : ""}`}
                      aria-hidden
                    />
                  ) : null}
                </button>
                {expanded && hasLevelDetails ? (
                  <div className={styles.levelDetailsPanel}>
                    {r.levelDetails!.map((detail) => (
                      <div
                        key={`${r.playerId}-${detail.mapDetailId ?? detail.levelIndex}`}
                        className={styles.levelDetailRow}
                      >
                        <div className={styles.levelTitle}>Level {detail.levelIndex}</div>
                        <div className={styles.levelMetrics}>
                          <span>Score: {detail.score}</span>
                          <span>Blocks: {detail.blocksUsed ?? "-"}</span>
                          <span>Steps: {detail.stepsUsed ?? "-"}</span>
                          <span>Time: {formatSeconds(detail.timeSeconds)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </li>
            );
            })}
          </ol>
        )}
        <div className={styles.actionsRow}>
          <button type="button" className={styles.secondaryBtn} onClick={() => void goBackToRoom()}>
            Quay lại phòng
          </button>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              if (hasNextLevel) {
                goNextLevel();
                return;
              }
              void leaveAndNavigate(ROUTES.LEARNER_LEARN);
            }}
          >
            {hasNextLevel ? "Play next level" : t("backToBrowse")}
          </button>
        </div>
      </div>
    </div>
  );
}
