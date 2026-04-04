import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, PlayCircle, Target } from "lucide-react";
import { motion } from "framer-motion";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import type { Map, MapLevelItem, MapOwnershipData } from "@/types/api/learner/maps";
import type { MapPlayHistoryItem, PaginationResult } from "@/types/api/learner/gameplay";
import type { ApiResult } from "@/types/api/common";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./MapLevelSelectPage.module.css";

export default function MapLevelSelectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [map, setMap] = useState<Map | null>(null);
  const [ownership, setOwnership] = useState<MapOwnershipData | null>(null);
  const [playHistory, setPlayHistory] = useState<MapPlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!id) {
        setError(t("gameIdNotFound"));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [mapRes, ownershipRes, historyRes] = await Promise.all([
          learnerMapsApi.getMapById(id, true),
          learnerMapsApi.checkMapOwnership(id),
          learnerGameplayApi.getMyPlayHistory({ mapId: id, pageSize: 100 }),
        ]);

        if (!mounted) return;

        if (mapRes.data.isSuccess && mapRes.data.data) {
          setMap(mapRes.data.data as Map);
        } else {
          setError(mapRes.data.message || t("failedLoadMapDetails"));
          return;
        }

        if (ownershipRes.data.isSuccess && ownershipRes.data.data) {
          setOwnership(ownershipRes.data.data);
        }

        // Extract play history from API response
        const historyData = historyRes.data as ApiResult<PaginationResult<MapPlayHistoryItem>>;
        if (historyData?.isSuccess && historyData?.data?.items) {
          setPlayHistory(historyData.data.items);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError(t("errorLoadMapDetails"));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadData();
    return () => {
      mounted = false;
    };
  }, [id, t]);

  const canPlay = ownership?.isOwned || (map?.isPublished && map?.price === 0);

  const campaignLevels = useMemo(() => {
    const levels = map?.levels ?? [];
    return [...levels].sort((a, b) => a.levelOrder - b.levelOrder);
  }, [map?.levels]);

  // Calculate level states from API play history
  const levelStates = useMemo(() => {
    if (!campaignLevels.length) return [];

    // Map of levelId -> completion status from API
    const completedLevels = new Set(
      playHistory.filter((h) => h.isCompleted).map((h) => h.submissionId || h.id),
    );

    // Determine which level IDs have been attempted/completed
    const completedBySubmission = new Map<string, boolean>();
    const attemptedLevelIds = new Set<string>();

    for (const historyItem of playHistory) {
      attemptedLevelIds.add(historyItem.id);
      if (historyItem.isCompleted) {
        completedBySubmission.set(historyItem.id, true);
      }
    }

    // Build states for all levels based on sequential unlock logic
    return campaignLevels.map((level, index) => {
      const isCompleted = completedBySubmission.has(level.id) || completedLevels.has(level.id);
      const isAttempted = attemptedLevelIds.has(level.id);

      // Level is unlocked if:
      // 1. It's the first level, OR
      // 2. Previous level is completed
      const isUnlocked =
        index === 0 || (index > 0 && completedBySubmission.has(campaignLevels[index - 1].id));

      const isLocked = !isUnlocked;

      // Current level logic:
      // - If started but not completed, it's current
      // - If unlocked but never attempted, it's current
      const isCurrent = isUnlocked && (!isCompleted || (isAttempted && !isCompleted));

      return {
        levelId: level.id,
        levelOrder: index,
        isLocked,
        isUnlocked,
        isCompleted,
        isCurrent,
      };
    });
  }, [campaignLevels, playHistory]);

  const progress = useMemo(() => {
    const completed = levelStates.filter((state) => state.isCompleted).length;
    const total = campaignLevels.length;
    return { completed, total };
  }, [levelStates, campaignLevels.length]);

  const currentLevelId = useMemo(() => {
    const current = levelStates.find((state) => state.isCurrent);
    return current?.levelId ?? null;
  }, [levelStates]);

  const stateByLevelId = useMemo(() => {
    return new Map(levelStates.map((item) => [item.levelId, item]));
  }, [levelStates]);

  const currentLevel = useMemo(() => {
    if (!currentLevelId) return campaignLevels[0] ?? null;
    return campaignLevels.find((level) => level.id === currentLevelId) ?? campaignLevels[0] ?? null;
  }, [campaignLevels, currentLevelId]);

  const currentLevelIndex = useMemo(() => {
    if (!currentLevel) return -1;
    return campaignLevels.findIndex((level) => level.id === currentLevel.id);
  }, [campaignLevels, currentLevel]);

  const currentLevelState = currentLevel ? stateByLevelId.get(currentLevel.id) : undefined;
  const unlockedCount = levelStates.filter((state) => state.isUnlocked).length;
  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  const launchLevel = (level: MapLevelItem) => {
    if (!map?.id) return;

    const state = levelStates.find((item) => item.levelId === level.id);
    if (!state || state.isLocked) return;

    const type = (level.type ?? "").trim().toLowerCase();
    const target = type === "platform" ? ROUTES.PLATFORM : ROUTES.GAME;

    navigate(target, {
      state: {
        levelId: map.id,
        mapDetailId: level.id,
      },
    });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>{t("loadingMapDetails")}</div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> {t("back")}
          </button>
          <p className={styles.errorText}>{error || t("mapNotFound")}</p>
        </div>
      </div>
    );
  }

  if (!canPlay) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
          >
            <ArrowLeft size={16} /> {t("back")}
          </button>
          <p className={styles.errorText}>{t("mapLocked")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className={styles.header}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
          >
            <ArrowLeft size={16} /> {t("back")}
          </button>
          <h1 className={styles.title}>{t("levelSelectTitle")}</h1>
          <p className={styles.subtitle}>{map.title}</p>
          {map.description?.trim() ? <p className={styles.description}>{map.description}</p> : null}
        </div>

        <div className={styles.overviewGrid}>
          <section className={styles.progressPanel}>
            <p className={styles.progressLabel}>
              {t("levelProgressLabel")
                .replace("{completed}", String(progress.completed))
                .replace("{total}", String(progress.total))}
            </p>
            <div className={styles.progressTrack}>
              <span className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <div className={styles.progressStats}>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{progress.completed}</span>
                <span className={styles.statLabel}>{t("completed")}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{unlockedCount}</span>
                <span className={styles.statLabel}>{t("mapAvailable")}</span>
              </div>
              <div className={styles.statBox}>
                <span className={styles.statValue}>{progress.total - unlockedCount}</span>
                <span className={styles.statLabel}>{t("locked")}</span>
              </div>
            </div>
          </section>

          <section className={styles.currentPanel}>
            <div className={styles.currentTop}>
              <Target size={16} /> {t("levelCurrent")}
            </div>
            <div className={styles.currentTitle}>
              {currentLevelIndex >= 0
                ? t("gameLevelOption").replace("{n}", String(currentLevelIndex + 1))
                : "-"}
              {currentLevel?.title?.trim() ? ` - ${currentLevel.title.trim()}` : ""}
            </div>
            <button
              type="button"
              className={styles.currentAction}
              disabled={!currentLevel || !currentLevelState || currentLevelState.isLocked}
              onClick={() => {
                if (currentLevel) launchLevel(currentLevel);
              }}
            >
              <PlayCircle size={16} />
              {currentLevelState?.isLocked ? t("levelLockedAction") : t("levelPlayAction")}
            </button>
          </section>
        </div>

        <div className={styles.legendRow}>
          <span className={`${styles.legendItem} ${styles.legendCurrent}`}>
            {t("levelCurrent")}
          </span>
          <span className={`${styles.legendItem} ${styles.legendReady}`}>{t("levelReady")}</span>
          <span className={`${styles.legendItem} ${styles.legendDone}`}>{t("completed")}</span>
          <span className={`${styles.legendItem} ${styles.legendLocked}`}>{t("locked")}</span>
        </div>

        <div className={styles.grid}>
          {campaignLevels.map((level, index) => {
            const state = stateByLevelId.get(level.id);
            const number = index + 1;
            const label = t("gameLevelOption").replace("{n}", String(number));

            return (
              <button
                key={level.id}
                type="button"
                disabled={!state || state.isLocked}
                className={[
                  styles.levelCard,
                  state?.isLocked ? styles.levelCardLocked : "",
                  state?.isCompleted ? styles.levelCardCompleted : "",
                  state?.isCurrent ? styles.levelCardCurrent : "",
                ].join(" ")}
                onClick={() => launchLevel(level)}
              >
                <div className={styles.levelTopRow}>
                  <span className={styles.levelIndex}>{number}</span>
                  {state?.isCompleted ? (
                    <span className={styles.badgeDone}>
                      <CheckCircle2 size={14} /> {t("completed")}
                    </span>
                  ) : state?.isLocked ? (
                    <span className={styles.badgeLocked}>
                      <Lock size={14} /> {t("locked")}
                    </span>
                  ) : state?.isCurrent ? (
                    <span className={styles.badgeCurrent}>{t("levelCurrent")}</span>
                  ) : (
                    <span className={styles.badgeReady}>{t("levelReady")}</span>
                  )}
                </div>

                <div className={styles.levelTitle}>{level.title?.trim() || label}</div>
                <div className={styles.levelSubtitle}>{label}</div>

                <div className={styles.levelAction}>
                  <PlayCircle size={16} />
                  {state?.isLocked ? t("levelLockedAction") : t("levelPlayAction")}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
