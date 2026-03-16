// src/portals/learner/pages/MyPathPage.tsx
// Lộ trình của tôi – danh sách concept + map theo goal đã chọn (IsUnlocked, IsCompleted).
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookOpen, Map as MapIcon, Lock, Check, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLearningPathApi } from "@/services/api/learner/learningPath.api";
import type { LearningPathItemDto, MyLearningPathDto } from "@/types/api/learner/learningPath";
import styles from "./MyPathPage.module.css";

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
    items: Array.isArray(items) ? items.map((i: Record<string, unknown>) => normalizeItem(i)) : [],
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
        const payload = res.data?.data ?? (res.data as unknown as { data?: unknown })?.Data;
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

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(ROUTES.LEARNER_HOME)}
          aria-label={t("back")}
        >
          <ChevronLeft size={20} />
          {t("back")}
        </button>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("myPathTitle")}</h1>
        </header>

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
            {path.learningGoalName && <p className={styles.goalName}>{path.learningGoalName}</p>}
            <button
              type="button"
              className={styles.exploreConceptsBtn}
              onClick={() => navigate(ROUTES.LEARNER_GOAL_SELECT)}
            >
              {t("exploreOtherConcepts")}
            </button>
            {path.items.length === 0 ? (
              <p className={styles.empty}>{t("myPathNoGoal")}</p>
            ) : (
              <ul className={styles.itemList}>
                {path.items.map((item) => {
                  const concept = isConcept(item);
                  const canAct = item.isUnlocked;
                  return (
                    <li key={item.itemId} className={styles.itemRow}>
                      <div className={styles.itemCard}>
                        <div className={styles.itemHeader}>
                          {concept ? (
                            <BookOpen size={20} className={styles.itemIcon} aria-hidden />
                          ) : (
                            <MapIcon size={20} className={styles.itemIcon} aria-hidden />
                          )}
                          <span className={styles.itemTitle}>
                            {concept ? item.conceptName : item.mapTitle}
                            {item.isCompleted && (
                              <Check size={18} className={styles.completedIcon} aria-hidden />
                            )}
                            {!item.isUnlocked && (
                              <Lock size={14} className={styles.lockIcon} aria-hidden />
                            )}
                          </span>
                        </div>
                        {(concept ? item.conceptDescription : item.mapDescription) && (
                          <p className={styles.itemDesc}>
                            {concept ? item.conceptDescription : item.mapDescription}
                          </p>
                        )}
                        {concept && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            disabled={!canAct}
                            onClick={() =>
                              item.conceptId &&
                              navigate(ROUTES.LEARNER_CONCEPT(item.conceptId), {
                                state: { conceptId: item.conceptId, conceptName: item.conceptName },
                              })
                            }
                          >
                            {item.isCompleted ? t("completed") : t("readConcept")}
                          </button>
                        )}
                        {!concept && item.mapId && (
                          <button
                            type="button"
                            className={styles.actionBtn}
                            disabled={!canAct}
                            onClick={() =>
                              navigate(ROUTES.PLATFORM, { state: { levelId: item.mapId } })
                            }
                          >
                            {t("playMap")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
