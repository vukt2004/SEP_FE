// src/portals/learner/pages/GoalSelectPage.tsx
// Chọn mục tiêu học tập – GET goals, GET goals/:id/path-items (số bước), POST goals/select.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Target, Loader2 } from "lucide-react";
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

export default function GoalSelectPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [goals, setGoals] = useState<LearningGoalDto[]>([]);
  const [pathItemCountByGoalId, setPathItemCountByGoalId] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    learnerLearningPathApi
      .getGoals()
      .then((res) => {
        const data = res.data?.data ?? (res.data as unknown as { data?: unknown })?.Data;
        if (Array.isArray(data)) {
          const list = data
            .map((g: Record<string, unknown>) => normalizeGoal(g))
            .sort((a: LearningGoalDto, b: LearningGoalDto) => a.sortOrder - b.sortOrder);
          setGoals(list);
          list.forEach((goal: LearningGoalDto) => {
            learnerLearningPathApi
              .getPathItemsByGoal(goal.id)
              .then((pathRes) => {
                const items =
                  pathRes.data?.data ?? (pathRes.data as unknown as { data?: unknown })?.Data;
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
        <header className={styles.header}>
          <div className={styles.titleRow}>
            <Target size={28} className={styles.icon} aria-hidden />
            <h1 className={styles.title}>{t("goalSelectTitle")}</h1>
          </div>
          <p className={styles.subtitle}>{t("goalSelectSubtitle")}</p>
        </header>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} aria-hidden />
            <p>{t("loading")}</p>
          </div>
        ) : goals.length === 0 ? (
          <p className={styles.empty}>{t("myPathNoGoal")}</p>
        ) : (
          <ul className={styles.goalList}>
            {goals.map((goal) => (
              <li key={goal.id} className={styles.goalItem}>
                <button
                  type="button"
                  className={styles.goalCard}
                  onClick={() => handleSelectGoal(goal.id)}
                  disabled={!!selectingId}
                >
                  {selectingId === goal.id ? (
                    <Loader2 size={24} className={styles.spinner} aria-hidden />
                  ) : (
                    <>
                      <span className={styles.goalName}>{goal.name}</span>
                      {goal.description && (
                        <span className={styles.goalDesc}>{goal.description}</span>
                      )}
                      {pathItemCountByGoalId[goal.id] != null && (
                        <span className={styles.stepCount}>
                          {pathItemCountByGoalId[goal.id]} {t("pathSteps")}
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
