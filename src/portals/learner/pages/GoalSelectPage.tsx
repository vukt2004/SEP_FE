// src/portals/learner/pages/GoalSelectPage.tsx
// Chọn mục tiêu học tập – GET goals, GET goals/:id/path-items (số bước), POST goals/select.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Target, Loader2, Brain, GitBranch, Repeat, Puzzle } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLearningPathApi } from "@/services/api/learner/learningPath.api";
import type { LearningGoalDto } from "@/types/api/learner/learningPath";
import styles from "./GoalSelectPage.module.css";

function normalizeGoal(raw: Record<string, unknown>): LearningGoalDto {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    name: String(raw.name ?? raw.Name ?? ""),
    description:
      raw.description != null
        ? String(raw.description)
        : raw.Description != null
          ? String(raw.Description)
          : null,
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
    iconUrl:
      raw.iconUrl != null ? String(raw.iconUrl) : raw.IconUrl != null ? String(raw.IconUrl) : null,
  };
}

type GoalMeta = {
  Icon: typeof Brain;
  difficultyKey: string;
  duration: { min: number; max: number };
  outcomeKeys: string[];
};

const GOAL_META_BY_ORDER: Record<number, GoalMeta> = {
  1: {
    Icon: Brain,
    difficultyKey: "goalDifficultyBeginner",
    duration: { min: 20, max: 30 },
    outcomeKeys: ["goalOutcomeLogic1", "goalOutcomeLogic2", "goalOutcomeLogic3"],
  },
  2: {
    Icon: GitBranch,
    difficultyKey: "goalDifficultyBeginner",
    duration: { min: 20, max: 30 },
    outcomeKeys: ["goalOutcomeCondition1", "goalOutcomeCondition2", "goalOutcomeCondition3"],
  },
  3: {
    Icon: Repeat,
    difficultyKey: "goalDifficultyIntermediate",
    duration: { min: 25, max: 35 },
    outcomeKeys: ["goalOutcomeLoop1", "goalOutcomeLoop2", "goalOutcomeLoop3"],
  },
  4: {
    Icon: Puzzle,
    difficultyKey: "goalDifficultyIntermediate",
    duration: { min: 40, max: 60 },
    outcomeKeys: ["goalOutcomeProblem1", "goalOutcomeProblem2", "goalOutcomeProblem3"],
  },
};


export default function GoalSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [goals, setGoals] = useState<LearningGoalDto[]>([]);
  const [pathItemCountByGoalId, setPathItemCountByGoalId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  useEffect(() => {
    learnerLearningPathApi
      .getGoals()
      .then((res) => {
        const data = res.data?.data ?? (res.data as unknown as { Data?: unknown })?.Data;
        if (Array.isArray(data)) {
          const list = data
            .map((g: Record<string, unknown>) => normalizeGoal(g))
            .sort((a: LearningGoalDto, b: LearningGoalDto) => a.sortOrder - b.sortOrder);
          setGoals(list);
          setSelectedGoalId((prev) => prev ?? (list[0]?.id ?? null));
          list.forEach((goal: LearningGoalDto) => {
            learnerLearningPathApi
              .getPathItemsByGoal(goal.id)
              .then((pathRes) => {
                const items =
                  pathRes.data?.data ?? (pathRes.data as unknown as { Data?: unknown })?.Data;
                const arr = Array.isArray(items) ? items : [];
                setPathItemCountByGoalId((prev) => ({ ...prev, [goal.id]: arr.length }));
              })
              .catch(() => {});
          });
        }
      })
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectGoal = async (goalId: string) => {
    setSelectingId(goalId);
    try {
      const res = await learnerLearningPathApi.selectGoal({ learningGoalId: goalId });
      if (res.data?.isSuccess) {
        navigate(ROUTES.LEARNER_MY_PATH);
        return;
      }
      window.alert(res.data?.message ?? "Could not select goal.");
    } catch {
      window.alert("Could not select goal.");
    } finally {
      setSelectingId(null);
    }
  };

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
        <div className={styles.simpleHeader}>
          <div className={styles.titleRow}>
            <Target size={28} className={styles.icon} aria-hidden />
            <div>
              <h1 className={styles.title}>{t("goalSelectTitle")}</h1>
              <p className={styles.subtitle}>{t("goalSelectSubtitle")}</p>
            </div>
          </div>
        </div>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} aria-hidden />
            <p>{t("loading")}</p>
          </div>
        ) : goals.length === 0 ? (
          <p className={styles.empty}>{t("myPathNoGoal")}</p>
        ) : (
          <ul className={styles.grid}>
            {goals.map((goal) => {
              const meta = GOAL_META_BY_ORDER[goal.sortOrder];
              const Icon = meta?.Icon ?? Target;
              const isSelected = selectedGoalId === goal.id;
              const stepCount = pathItemCountByGoalId[goal.id];
              const durationText = meta
                ? `${meta.duration.min}–${meta.duration.max} ${t("goalDurationUnit")}`
                : null;
              const difficultyText = meta ? t(meta.difficultyKey) : null;

              return (
                <li key={goal.id} className={styles.gridItem}>
                  <button
                    type="button"
                    className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
                    onClick={() => setSelectedGoalId(goal.id)}
                    disabled={!!selectingId}
                  >
                    <div className={styles.cardTop}>
                      <div className={styles.cardTitleRow}>
                        <span className={styles.iconBadge} aria-hidden>
                          <Icon size={18} />
                        </span>
                        <span className={styles.goalName}>{goal.name}</span>
                      </div>

                      <div className={styles.metaRow}>
                        {difficultyText && <span className={styles.metaPill}>{difficultyText}</span>}
                        {durationText && <span className={styles.metaPill}>{durationText}</span>}
                        {stepCount != null && (
                          <span className={styles.metaMuted}>
                            {stepCount} {t("pathSteps")}
                          </span>
                        )}
                      </div>
                    </div>

                    {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}

                    {meta?.outcomeKeys?.length ? (
                      <div className={styles.outcomes}>
                        <div className={styles.outcomesTitle}>{t("goalOutcomesTitle")}</div>
                        <ul className={styles.outcomesList}>
                          {meta.outcomeKeys.map((k) => (
                            <li key={k}>{t(k)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className={styles.cardFooter}>
                      <button
                        type="button"
                        className={styles.cta}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleSelectGoal(goal.id);
                        }}
                        disabled={!!selectingId}
                      >
                        {selectingId === goal.id ? (
                          <Loader2 size={18} className={styles.spinner} aria-hidden />
                        ) : null}
                        {t("startLearning")}
                      </button>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
