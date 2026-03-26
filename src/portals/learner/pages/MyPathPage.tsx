// src/portals/learner/pages/MyPathPage.tsx
// Lộ trình của tôi – map game style: nodes, progress, card states (completed/current/locked), zig-zag, rewards.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  BookOpen,
  Map as MapIcon,
  Lock,
  Check,
  Loader2,
  Sparkles,
  Lightbulb,
  Trophy,
  Rocket,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLearningPathApi } from "@/services/api/learner/learningPath.api";
import type { LearningPathItemDto, MyLearningPathDto } from "@/types/api/learner/learningPath";
import styles from "./MyPathPage.module.css";

const XP_CONCEPT = 30;
const XP_MAP = 50;

function normalizeItem(raw: Record<string, unknown>): LearningPathItemDto {
  return {
    itemId: String(raw.itemId ?? raw.ItemId ?? ""),
    itemType: String(raw.itemType ?? raw.ItemType ?? ""),
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
    conceptId:
      raw.conceptId != null
        ? String(raw.conceptId)
        : raw.ConceptId != null
          ? String(raw.ConceptId)
          : null,
    conceptName:
      raw.conceptName != null
        ? String(raw.conceptName)
        : raw.ConceptName != null
          ? String(raw.ConceptName)
          : null,
    conceptDescription:
      raw.conceptDescription != null
        ? String(raw.conceptDescription)
        : raw.ConceptDescription != null
          ? String(raw.ConceptDescription)
          : null,
    conceptContentKey:
      raw.conceptContentKey != null
        ? String(raw.conceptContentKey)
        : raw.ConceptContentKey != null
          ? String(raw.ConceptContentKey)
          : null,
    mapId: raw.mapId != null ? String(raw.mapId) : raw.MapId != null ? String(raw.MapId) : null,
    mapTitle:
      raw.mapTitle != null
        ? String(raw.mapTitle)
        : raw.MapTitle != null
          ? String(raw.MapTitle)
          : null,
    mapDescription:
      raw.mapDescription != null
        ? String(raw.mapDescription)
        : raw.MapDescription != null
          ? String(raw.MapDescription)
          : null,
    mapDifficulty:
      raw.mapDifficulty != null
        ? Number(raw.mapDifficulty)
        : raw.MapDifficulty != null
          ? Number(raw.MapDifficulty)
          : null,
    mapAvatarUrl:
      raw.mapAvatarUrl != null
        ? String(raw.mapAvatarUrl)
        : raw.MapAvatarUrl != null
          ? String(raw.MapAvatarUrl)
          : null,
    isCompleted: Boolean(raw.isCompleted ?? raw.IsCompleted),
    isUnlocked: Boolean(raw.isUnlocked ?? raw.IsUnlocked),
    bestStars:
      raw.bestStars != null
        ? Number(raw.bestStars)
        : raw.BestStars != null
          ? Number(raw.BestStars)
          : null,
    completedAt:
      raw.completedAt != null
        ? String(raw.completedAt)
        : raw.CompletedAt != null
          ? String(raw.CompletedAt)
          : null,
  };
}

function normalizePath(data: Record<string, unknown>): MyLearningPathDto {
  const items = (data.items ?? data.Items) as unknown[];
  return {
    learningGoalId:
      data.learningGoalId != null
        ? String(data.learningGoalId)
        : data.LearningGoalId != null
          ? String(data.LearningGoalId)
          : null,
    learningGoalName:
      data.learningGoalName != null
        ? String(data.learningGoalName)
        : data.LearningGoalName != null
          ? String(data.LearningGoalName)
          : null,
    learningGoalDescription:
      data.learningGoalDescription != null
        ? String(data.learningGoalDescription)
        : data.LearningGoalDescription != null
          ? String(data.LearningGoalDescription)
          : null,
    items: Array.isArray(items)
      ? items.map((i) => normalizeItem(i as Record<string, unknown>))
      : [],
  };
}

export default function MyPathPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [path, setPath] = useState<MyLearningPathDto | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPath = useCallback(() => {
    learnerLearningPathApi
      .getMyPath()
      .then((res) => {
        const payload = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
        if (payload && typeof payload === "object") {
          setPath(normalizePath(payload as Record<string, unknown>));
        } else {
          setPath(null);
        }
      })
      .catch(() => setPath(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  const hasGoal = path?.learningGoalId && path.learningGoalName;
  const isConcept = (item: LearningPathItemDto) => item.itemType === "Concept" || !!item.conceptId;
  const getXp = (item: LearningPathItemDto) => (isConcept(item) ? XP_CONCEPT : XP_MAP);
  const items = path?.items ?? [];
  const totalSteps = items.length;
  const completedCount = items.filter((i) => i.isCompleted).length;
  const percent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const currentIndex = items.findIndex((i) => i.isUnlocked && !i.isCompleted);
  const nextItem = currentIndex >= 0 ? items[currentIndex] : null;
  const nextTitle = nextItem ? (isConcept(nextItem) ? nextItem.conceptName : nextItem.mapTitle) : null;
  const xpTotal = items.reduce((sum, i) => (i.isCompleted ? sum + getXp(i) : sum), 0);
  const canContinue = !!nextItem && nextItem.isUnlocked;
  const completedItems = items.filter((i) => i.isCompleted);
  const unlockedItems = items.filter((i) => i.isUnlocked && !i.isCompleted);
  const lockedItems = items.filter((i) => !i.isUnlocked && !i.isCompleted);
  const tt = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const getItemState = (item: LearningPathItemDto) => {
    if (item.isCompleted) return "completed";
    if (item.isUnlocked) return "current";
    return "locked";
  };

  const getStepLabel = (item: LearningPathItemDto) => {
    if (isConcept(item)) return t("myPathLabelConcept");
    return t("myPathLabelChallenge");
  };

  const getCtaLabel = (item: LearningPathItemDto, state: string) => {
    if (state === "locked") return t("locked");
    if (isConcept(item)) {
      return item.isCompleted ? t("reviewConcept") : t("continueLearning");
    }
    return item.isCompleted ? t("playMap") : t("startChallenge");
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.shell}>
        <aside className={`${styles.side} ${styles.sideLeft}`} aria-label={t("myPathSideTipsTitle")}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>
              <Lightbulb size={16} aria-hidden />
              {t("myPathSideTipsTitle")}
            </div>
            <ul className={styles.sideList}>
              <li>{t("myPathTip1")}</li>
              <li>{t("myPathTip2")}</li>
            </ul>
          </div>
        </aside>

        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>
              <Loader2 size={32} className={styles.spinner} aria-hidden />
              <p>{t("loading")}</p>
            </div>
          ) : !hasGoal ? (
            <div className={styles.noGoal}>
              <p className={styles.noGoalText}>{t("myPathNoGoal")}</p>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => navigate(ROUTES.LEARNER_GOAL_SELECT)}
              >
                {t("goSelectGoal")}
              </button>
            </div>
          ) : (
            <>
              {/* Header: game-like hero */}
              <header className={styles.header}>
                <div className={styles.headerTop}>
                  <button
                    type="button"
                    className={styles.backBtn}
                    onClick={() => navigate(ROUTES.LEARNER_HOME)}
                    aria-label={t("back")}
                    title={t("back")}
                  >
                    <ChevronLeft size={18} aria-hidden />
                  </button>
                  <div className={styles.titleWrap}>
                    <h1 className={styles.title}>{t("myPathTitle")}</h1>
                    <p className={styles.subTitle}>{t("myPathSubtitle")}</p>
                  </div>
                  {path?.learningGoalName && (
                    <span className={styles.goalPill}>{path.learningGoalName}</span>
                  )}
                </div>
                {totalSteps > 0 && (
                  <div className={styles.headerProgress}>
                    <div className={styles.motivationRow}>
                      <Sparkles size={18} className={styles.motivationIcon} aria-hidden />
                      <span className={styles.motivationText}>{t("myPathYouAreGreat")}</span>
                    </div>
                    <div className={styles.progressRow}>
                      <div className={styles.progressBarWrap}>
                        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
                      </div>
                      <div className={styles.progressMeta}>
                        <span className={styles.progressLabel}>Level progress</span>
                        <span className={styles.progressCount}>
                          {completedCount}/{totalSteps}
                        </span>
                        <span className={styles.progressPct}>{percent}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className={styles.headerActions}>
                  <button
                    type="button"
                    className={styles.continueBtn}
                    disabled={!canContinue}
                    onClick={() => {
                      if (!nextItem) return;
                      if (isConcept(nextItem) && nextItem.conceptId) {
                        navigate(ROUTES.LEARNER_CONCEPT(nextItem.conceptId));
                        return;
                      }
                      if (!isConcept(nextItem) && nextItem.mapId) {
                        navigate(ROUTES.PLATFORM, { state: { levelId: nextItem.mapId } });
                      }
                    }}
                  >
                    <Rocket size={16} aria-hidden />
                    {t("myPathContinue")}
                    {nextTitle ? <span className={styles.continueHint}>· {nextTitle}</span> : null}
                  </button>
                </div>
              </header>

              {items.length === 0 ? (
                <p className={styles.empty}>{t("myPathNoGoal")}</p>
              ) : (
                <div className={styles.journey}>
                  <div className={styles.journeyLine} aria-hidden />
                  <ul className={styles.journeyList}>
                    {items.map((item, idx) => {
                      const concept = isConcept(item);
                      const state = getItemState(item);
                      const canAct = item.isUnlocked;
                      const xp = getXp(item);
                      const itemPercent =
                        state === "completed" ? 100 : state === "locked" ? 0 : percent;
                      const nodeClass =
                        state === "completed"
                          ? `${styles.journeyNode} ${styles.journeyNodeCompleted}`
                          : state === "current"
                            ? `${styles.journeyNode} ${styles.journeyNodeCurrent}`
                            : `${styles.journeyNode} ${styles.journeyNodeLocked}`;

                      const rowClass =
                        state === "completed"
                          ? `${styles.journeyItem} ${styles.journeyItemCompleted}`
                          : state === "current"
                            ? `${styles.journeyItem} ${styles.journeyItemCurrent}`
                            : `${styles.journeyItem} ${styles.journeyItemLocked}`;

                      return (
                        <li key={item.itemId} className={rowClass}>
                          <div className={styles.journeyLeft}>
                            <div className={nodeClass}>
                              {state === "completed" ? (
                                <Check size={14} aria-hidden />
                              ) : state === "locked" ? (
                                <Lock size={14} aria-hidden />
                              ) : (
                                <Sparkles size={16} aria-hidden />
                              )}
                            </div>
                            <div className={styles.journeyIndex}>{idx + 1}</div>
                          </div>

                          <div className={styles.journeyContent}>
                            <div className={styles.itemTopRow}>
                              <span className={styles.stepLabel}>{getStepLabel(item)}</span>
                              <span
                                className={
                                  state === "completed"
                                    ? styles.statePillDone
                                    : state === "locked"
                                      ? styles.statePillLocked
                                      : styles.statePillCurrent
                                }
                              >
                                {state === "completed" ? (
                                  <>
                                    <Check size={14} aria-hidden /> {t("completed")}
                                  </>
                                ) : state === "locked" ? (
                                  <>
                                    <Lock size={14} aria-hidden /> {t("locked")}
                                  </>
                                ) : (
                                  <>
                                    <Sparkles size={14} aria-hidden /> {t("myPathStateAvailable")}
                                  </>
                                )}
                              </span>
                            </div>

                            <div className={styles.itemHeader}>
                              {concept ? (
                                <BookOpen size={20} className={styles.itemIcon} aria-hidden />
                              ) : (
                                <MapIcon size={20} className={styles.itemIcon} aria-hidden />
                              )}
                              <span className={styles.itemTitle}>
                                {concept ? item.conceptName : item.mapTitle}
                              </span>
                            </div>

                            {(concept ? item.conceptDescription : item.mapDescription) && (
                              <p className={styles.itemDesc}>
                                {concept ? item.conceptDescription : item.mapDescription}
                              </p>
                            )}

                            <div className={styles.miniProgress} aria-label={`${itemPercent}%`}>
                              <div className={styles.miniProgressBar} aria-hidden>
                                <div
                                  className={styles.miniProgressFill}
                                  style={{ width: `${itemPercent}%` }}
                                />
                              </div>
                              <span className={styles.miniProgressPct}>{itemPercent}%</span>
                            </div>

                            <div className={styles.itemBottomRow}>
                              <span className={styles.xpBadge}>+{xp} XP</span>
                              <button
                                type="button"
                                className={styles.actionBtn}
                                disabled={!canAct}
                                title={!canAct && !item.isUnlocked ? t("locked") : undefined}
                                onClick={() => {
                                  if (!canAct) return;
                                  if (concept && item.conceptId) {
                                    navigate(ROUTES.LEARNER_CONCEPT(item.conceptId));
                                    return;
                                  }
                                  if (!concept && item.mapId) {
                                    navigate(ROUTES.PLATFORM, { state: { levelId: item.mapId } });
                                  }
                                }}
                              >
                                {getCtaLabel(item, state)}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <aside className={`${styles.side} ${styles.sideRight}`} aria-label={t("myPathSideStatsTitle")}>
          <div className={styles.sideCard}>
            <div className={styles.sideCardTitle}>
              <Trophy size={16} aria-hidden />
              {t("myPathSideStatsTitle")}
            </div>
            <div className={styles.sideStats}>
              <div className={styles.sideStat}>
                <div className={styles.sideStatLabel}>{t("myPathStatXp")}</div>
                <div className={styles.sideStatValue}>{xpTotal}</div>
              </div>
              <div className={styles.sideStat}>
                <div className={styles.sideStatLabel}>{t("myPathStatDone")}</div>
                <div className={styles.sideStatValue}>
                  {completedCount}/{totalSteps}
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.sideLinkBtn}
              onClick={() => navigate(ROUTES.LEARNER_GOAL_SELECT)}
            >
              {t("exploreOtherConcepts")}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  tone,
  items,
  stateOverride,
  overallPercent,
  getItemState,
  getStepLabel,
  getXp,
  getCtaLabel,
  isConcept,
  navigate,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "unlocked" | "locked" | "completed";
  items: LearningPathItemDto[];
  stateOverride: "completed" | "current" | "locked";
  overallPercent: number;
  getItemState: (i: LearningPathItemDto) => "completed" | "current" | "locked";
  getStepLabel: (i: LearningPathItemDto) => string;
  getXp: (i: LearningPathItemDto) => number;
  getCtaLabel: (i: LearningPathItemDto, state: string) => string;
  isConcept: (i: LearningPathItemDto) => boolean;
  navigate: ReturnType<typeof useNavigate>;
  t: (k: string) => string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      className={`${styles.boardSection} ${tone === "unlocked" ? styles.boardSectionUnlocked : tone === "locked" ? styles.boardSectionLocked : styles.boardSectionCompleted
        }`}
      aria-label={title}
    >
      <div className={styles.boardHeader}>
        <div className={styles.boardHeaderLeft}>
          <span className={styles.boardIcon}>{icon}</span>
          <h2 className={styles.boardTitle}>{title}</h2>
        </div>
        <span className={styles.boardCount}>{items.length}</span>
      </div>
      <ul className={styles.boardGrid}>
        {items.map((item) => {
          const concept = isConcept(item);
          const state = stateOverride ?? getItemState(item);
          const canAct = item.isUnlocked;
          const xp = getXp(item);
          const itemPercent = state === "completed" ? 100 : state === "locked" ? 0 : overallPercent;
          const cardClass =
            state === "completed"
              ? `${styles.itemCard} ${styles.itemCardCompleted}`
              : state === "current"
                ? `${styles.itemCard} ${styles.itemCardCurrent}`
                : `${styles.itemCard} ${styles.itemCardLocked}`;

          const statePillClass =
            state === "completed"
              ? styles.statePillDone
              : state === "locked"
                ? styles.statePillLocked
                : styles.statePillCurrent;

          return (
            <li key={item.itemId} className={styles.boardItem}>
              <div className={cardClass}>
                <div className={styles.itemTopRow}>
                  <span className={styles.stepLabel}>{getStepLabel(item)}</span>
                  <span className={statePillClass}>
                    {state === "completed" ? (
                      <>
                        <Check size={14} aria-hidden /> {t("completed")}
                      </>
                    ) : state === "locked" ? (
                      <>
                        <Lock size={14} aria-hidden /> {t("locked")}
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} aria-hidden /> {t("myPathStateAvailable")}
                      </>
                    )}
                  </span>
                </div>

                <div className={styles.itemHeader}>
                  {concept ? (
                    <BookOpen size={20} className={styles.itemIcon} aria-hidden />
                  ) : (
                    <MapIcon size={20} className={styles.itemIcon} aria-hidden />
                  )}
                  <span className={styles.itemTitle}>{concept ? item.conceptName : item.mapTitle}</span>
                </div>

                {(concept ? item.conceptDescription : item.mapDescription) && (
                  <p className={styles.itemDesc}>{concept ? item.conceptDescription : item.mapDescription}</p>
                )}

                <div className={styles.miniProgress} aria-label={`${itemPercent}%`}>
                  <div className={styles.miniProgressBar} aria-hidden>
                    <div className={styles.miniProgressFill} style={{ width: `${itemPercent}%` }} />
                  </div>
                  <span className={styles.miniProgressPct}>{itemPercent}%</span>
                </div>

                {!concept && item.mapAvatarUrl && (
                  <div className={styles.previewThumb}>
                    <img src={item.mapAvatarUrl} alt="" />
                  </div>
                )}

                <div className={styles.itemBottomRow}>
                  <span className={styles.xpBadge}>+{xp} XP</span>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    disabled={!canAct}
                    onClick={() => {
                      if (!canAct) return;
                      if (concept && item.conceptId) {
                        navigate(ROUTES.LEARNER_CONCEPT(item.conceptId));
                        return;
                      }
                      if (!concept && item.mapId) {
                        navigate(ROUTES.PLATFORM, { state: { levelId: item.mapId } });
                      }
                    }}
                  >
                    {getCtaLabel(item, state)}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
