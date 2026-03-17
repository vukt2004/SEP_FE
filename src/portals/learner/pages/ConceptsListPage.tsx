// src/portals/learner/pages/ConceptsListPage.tsx
// Danh sách concept – học thêm concept khác (có thể lọc theo goal). Mở bất kỳ concept nào cùng lúc.
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerLearningPathApi } from "@/services/api/learner/learningPath.api";
import type { ConceptDto, LearningGoalDto } from "@/types/api/learner/learningPath";
import styles from "./ConceptsListPage.module.css";

function normalizeConcept(raw: Record<string, unknown>): ConceptDto {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    learningGoalId: String(raw.learningGoalId ?? raw.LearningGoalId ?? ""),
    learningGoalName:
      raw.learningGoalName != null
        ? String(raw.learningGoalName)
        : raw.LearningGoalName != null
          ? String(raw.LearningGoalName)
          : null,
    name: String(raw.name ?? raw.Name ?? ""),
    description:
      raw.description != null
        ? String(raw.description)
        : raw.Description != null
          ? String(raw.Description)
          : null,
    contentKey:
      raw.contentKey != null
        ? String(raw.contentKey)
        : raw.ContentKey != null
          ? String(raw.ContentKey)
          : null,
    sortOrder: Number(raw.sortOrder ?? raw.SortOrder ?? 0),
  };
}

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

export default function ConceptsListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const goalIdParam = searchParams.get("goalId") ?? undefined;
  const { t } = useTranslation();

  const [concepts, setConcepts] = useState<ConceptDto[]>([]);
  const [goals, setGoals] = useState<LearningGoalDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConcepts = useCallback((learningGoalId?: string | null) => {
    setLoading(true);
    learnerLearningPathApi
      .getConcepts(learningGoalId ?? undefined)
      .then((res) => {
        const raw = res.data as Record<string, unknown> | undefined;
        const payload = raw?.data ?? raw?.Data;
        const arr = Array.isArray(payload) ? payload : [];
        setConcepts(
          arr
            .map((c: Record<string, unknown>) => normalizeConcept(c))
            .sort((a, b) => a.sortOrder - b.sortOrder),
        );
      })
      .catch(() => setConcepts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    learnerLearningPathApi
      .getGoals()
      .then((res) => {
        const data = res.data?.data ?? (res.data as unknown as { data?: unknown })?.Data;
        if (Array.isArray(data)) {
          setGoals(
            data
              .map((g: Record<string, unknown>) => normalizeGoal(g))
              .sort((a: LearningGoalDto, b: LearningGoalDto) => a.sortOrder - b.sortOrder),
          );
        }
      })
      .catch(() => setGoals([]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchConcepts(goalIdParam), 0);
    return () => clearTimeout(timer);
  }, [goalIdParam, fetchConcepts]);

  const handleGoalFilter = (goalId: string) => {
    if (!goalId) {
      setSearchParams({});
      return;
    }
    setSearchParams({ goalId });
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigate(ROUTES.LEARNER_MY_PATH)}
          aria-label={t("back")}
        >
          <ChevronLeft size={20} />
          {t("backToPath")}
        </button>
        <header className={styles.header}>
          <h1 className={styles.title}>{t("allConceptsTitle")}</h1>
          <button
            type="button"
            className={styles.subtitleLink}
            onClick={() => navigate(ROUTES.LEARNER_GOAL_SELECT)}
          >
            {t("exploreOtherConcepts")}
          </button>
          {goals.length > 0 && (
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>{t("conceptsFilterByGoal")}:</span>
              <select
                className={styles.select}
                value={goalIdParam ?? ""}
                onChange={(e) => handleGoalFilter(e.target.value)}
                aria-label={t("conceptsFilterByGoal")}
              >
                <option value="">—</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </header>

        {loading ? (
          <div className={styles.loading}>
            <Loader2 size={32} className={styles.spinner} aria-hidden />
            <p>{t("loading")}</p>
          </div>
        ) : concepts.length === 0 ? (
          <p className={styles.empty}>{t("conceptContent")}</p>
        ) : (
          <ul className={styles.conceptList}>
            {concepts.map((c) => (
              <li key={c.id} className={styles.conceptItem}>
                <button
                  type="button"
                  className={styles.conceptCard}
                  onClick={() => navigate(ROUTES.LEARNER_CONCEPT(c.id))}
                >
                  <BookOpen size={20} className={styles.icon} aria-hidden />
                  <div className={styles.conceptInfo}>
                    <span className={styles.conceptName}>{c.name}</span>
                    {c.description && <span className={styles.conceptDesc}>{c.description}</span>}
                    {c.learningGoalName && (
                      <span className={styles.goalTag}>{c.learningGoalName}</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
