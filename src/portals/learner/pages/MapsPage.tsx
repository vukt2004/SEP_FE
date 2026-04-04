// src/portals/learner/pages/MapsPage.tsx
// Game library + progression UI for 2D puzzle learning platform
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Clock,
  Gamepad2,
  Play,
  Lock,
  Check,
  Sparkles,
  GraduationCap,
  LayoutGrid,
} from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerRecommendationsApi } from "@/services/api/learner/recommendations.api";
import type { Map as ApiMap } from "@/types/api/learner/maps";
import type { RecommendationResultDto } from "@/types/api/learner/recommendations";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import type { MapPlayHistoryItem } from "@/types/api/learner/gameplay";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import { useTranslation } from "@/lib/i18n/translations";
import type { LocaleId } from "@/lib/i18n/translations";
import styles from "./MapsPage.module.css";
import { getDifficultyTier } from "@/lib/maps/difficultyDisplay";
import { extractLearnedTags } from "@/lib/maps/learnedTags";

/** Tag names that represent difficulty level – exclude from Concept filter and show only in Difficulty filter */
const DIFFICULTY_TAG_NAMES = new Set(
  ["beginner", "easy", "medium", "hard", "expert"].map((s) => s.toLowerCase()),
);

/** Vietnamese labels for concept tags (dropdown + cards when locale is vi). Excluded concepts still translated on cards. */
const CONCEPT_LABELS_VI: Record<string, string> = {
  "Algorithm Basics": "Cơ bản thuật toán",
  "Algorithm Design": "Thiết kế thuật toán",
  Arrays: "Mảng",
  "Computational Thinking": "Tư duy máy tính",
  Conditionals: "Điều kiện",
  Debugging: "Gỡ lỗi",
  Functions: "Hàm",
  "Logic Puzzle": "Câu đố logic",
  "Logical Thinking": "Tư duy logic",
  Loops: "Vòng lặp",
  Objects: "Đối tượng",
  "Obstacle Avoidance": "Tránh chướng ngại vật",
  Operators: "Toán tử",
  Optimization: "Tối ưu hóa",
  Pathfinding: "Tìm đường",
  "Pattern Recognition": "Nhận dạng mẫu",
  Pointers: "Con trỏ",
  "Problem Solving": "Giải quyết vấn đề",
  Recursion: "Đệ quy",
  "Resource Collection": "Thu thập tài nguyên",
  Strategy: "Chiến lược",
  Variables: "Biến",
  "If Else": "If / Else",
  "If/Else": "If / Else",
};

function getConceptLabel(name: string, locale: LocaleId): string {
  if (locale === "vi") {
    const exact = CONCEPT_LABELS_VI[name];
    if (exact) return exact;
    const lower = name.toLowerCase();
    const entry = Object.entries(CONCEPT_LABELS_VI).find(([k]) => k.toLowerCase() === lower);
    if (entry) return entry[1];
  }
  return name;
}

function isDifficultyTag(tagName: string): boolean {
  return DIFFICULTY_TAG_NAMES.has(tagName.trim().toLowerCase());
}

/** Concept tags to hide from the filter dropdown – compare case-insensitively */
const CONCEPT_FILTER_EXCLUDE_LOWER = new Set([
  "optimization",
  "debugging",
  "computational thinking",
  "algorithm basics",
  "algorithm design",
  "logic puzzle",
]);

function isConceptExcluded(tagName: string): boolean {
  return CONCEPT_FILTER_EXCLUDE_LOWER.has(tagName.trim().toLowerCase());
}

/**
 * Split concept tags into two groups for filtering:
 * - Programming knowledge: variables, loops, conditionals, functions, etc.
 * - Skills / mechanics: pathfinding, pattern recognition, problem solving, etc.
 *
 * Note: Backend tag names can be English or Vietnamese -> compare case-insensitively.
 */
const SKILL_MECHANISM_CONCEPTS_LOWER = new Set([
  // Vietnamese
  "tư duy logic",
  "tránh chướng ngại vật",
  "tìm đường",
  "nhận dạng mẫu",
  "giải quyết vấn đề",
  "thu thập tài nguyên",
  "chiến lược",
  "điều hướng",
  // English
  "pathfinding",
  "obstacle avoidance",
  "pattern recognition",
  "problem solving",
  "resource collection",
  "strategy",
  "logical thinking",
]);

function isSkillMechanismConcept(tagName: string): boolean {
  return SKILL_MECHANISM_CONCEPTS_LOWER.has(tagName.trim().toLowerCase());
}

type MapStatus = "locked" | "available" | "in_progress" | "completed";
type MainTab = "all" | "recommended" | "progress";
type SortOption = "recommended" | "newest" | "most_played";

function useMapProgressFromHistory(mapIds: string[]) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<MapPlayHistoryItem[] | null>(null);

  const mapIdsKey = useMemo(() => mapIds.join(","), [mapIds]);

  useEffect(() => {
    // If maps haven't loaded yet, don't fetch.
    if (!mapIdsKey) {
      setHistory(null);
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);

    learnerGameplayApi
      .getMyPlayHistory({ pageNumber: 1, pageSize: 50 })
      .then((res) => {
        if (!alive) return;
        if (!res.isSuccess) {
          setHistory([]);
          return;
        }
        setHistory(res.data?.items ?? []);
      })
      .catch(() => {
        if (!alive) return;
        setHistory([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [mapIdsKey]);

  return useMemo(() => {
    const inProgress: Record<string, number> = {};
    const completed = new Set<string>();
    const locked = new Set<string>();

    const mapIdSet = new Set(mapIds);
    for (const item of history ?? []) {
      if (!mapIdSet.has(item.mapId)) continue;
      if (item.isCompleted) completed.add(item.mapId);
      else inProgress[item.mapId] = 45; // constant fallback since we don't have progressPercent in history DTO
    }

    // If a map is completed at least once, don't keep it in "in progress".
    for (const mapId of completed) {
      delete inProgress[mapId];
    }

    return { inProgress, completed, locked, loading };
  }, [mapIds, history, loading]);
}

function getMapStatus(
  mapId: string,
  inProgress: Record<string, number>,
  completed: Set<string>,
  locked: Set<string>,
): { status: MapStatus; progressPercent?: number } {
  if (completed.has(mapId)) return { status: "completed" };
  if (mapId in inProgress) return { status: "in_progress", progressPercent: inProgress[mapId] };
  if (locked.has(mapId)) return { status: "locked" };
  return { status: "available" };
}

function formatTime(timeLimitMs: number, t: (k: string) => string): string {
  if (timeLimitMs === 0) return `—`;
  const minutes = Math.max(1, Math.ceil(timeLimitMs / 60000));
  return `${minutes} ${t("minutes")}`;
}

function getDifficultyLabel(d: number, t: (k: string) => string): string {
  const tier = getDifficultyTier(d);
  const level = Math.min(5, Math.max(1, Math.round(d)));
  if (tier === "easy") return `${t("easy")} (${level}/5)`;
  if (tier === "medium") return `${t("medium")} (${level}/5)`;
  return `${t("hard")} (${level}/5)`;
}

export default function MapsPage() {
  const { t } = useTranslation();
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>
            <Gamepad2 size={32} className={styles.titleIcon} aria-hidden />
            {t("maps")}
          </h1>
          <p className={styles.subtitle}>{t("pickMapSubtitle")}</p>
        </header>
        <MapsContent />
      </div>
    </div>
  );
}

function MapsContent() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [maps, setMaps] = useState<ApiMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [selectedKnowledgeConcepts, setSelectedKnowledgeConcepts] = useState<string[]>([]);
  const [knowledgeConceptPicker, setKnowledgeConceptPicker] = useState<string>("all");
  const [selectedMechanismConcepts, setSelectedMechanismConcepts] = useState<string[]>([]);
  const [mechanismConceptPicker, setMechanismConceptPicker] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [knowledgeConceptOptions, setKnowledgeConceptOptions] = useState<string[]>([]);
  const [mechanismConceptOptions, setMechanismConceptOptions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResultDto | null>(null);

  const mapIds = useMemo(() => maps.map((m) => m.id), [maps]);
  const { inProgress, completed, locked } = useMapProgressFromHistory(mapIds);

  // Map ownership: used to sort playable maps to the top.
  // Endpoint: GET /api/learner/maps/{id}/check-ownership
  const [ownershipByMapId, setOwnershipByMapId] = useState<Record<string, boolean | undefined>>({});

  useEffect(() => {
    let alive = true;

    const idsToFetch = maps
      .filter((m) => m.price > 0)
      .map((m) => m.id)
      .filter((id) => ownershipByMapId[id] === undefined);

    if (idsToFetch.length === 0) return;

    Promise.all(
      idsToFetch.map(async (id) => {
        try {
          const res = await learnerMapsApi.checkMapOwnership(id);
          if (!alive) return { id, isOwned: undefined as boolean | undefined };
          const data: MapOwnershipData | undefined = res.data?.data;
          return { id, isOwned: data?.isOwned ?? false };
        } catch {
          return { id, isOwned: false };
        }
      }),
    )
      .then((results) => {
        if (!alive) return;
        setOwnershipByMapId((prev) => {
          const next = { ...prev };
          for (const r of results) {
            next[r.id] = r.isOwned;
          }
          return next;
        });
      });

    return () => {
      alive = false;
    };
  }, [maps, ownershipByMapId]);

  const lockedFromOwnership = useMemo(() => {
    const s = new Set<string>();
    for (const m of maps) {
      if (m.price <= 0) continue;
      if ((m.freeTrialAttemptLimit ?? 0) > 0) continue;
      if (completed.has(m.id) || m.id in inProgress) continue;
      if (ownershipByMapId[m.id] === false) s.add(m.id);
    }
    return s;
  }, [maps, ownershipByMapId, completed, inProgress]);

  const lockedUnion = useMemo(
    () => new Set([...locked, ...lockedFromOwnership]),
    [locked, lockedFromOwnership],
  );

  const isPlayableMap = useCallback(
    (m: ApiMap): boolean => {
      if (completed.has(m.id) || m.id in inProgress) return true;
      if (m.price === 0) return true;
      if ((m.freeTrialAttemptLimit ?? 0) > 0) return true;

      // While ownership is still loading/unknown, keep map order unchanged (don't push it down too early).
      const owned = ownershipByMapId[m.id];
      if (owned === undefined) return true;
      return owned;
    },
    [completed, inProgress, ownershipByMapId],
  );

  // Stable sort: playable maps first, keep existing order within each group.
  const mapsSortedPlayable = useMemo(() => {
    return maps
      .map((m, i) => ({ m, i }))
      .sort((a, b) => {
        const ap = isPlayableMap(a.m);
        const bp = isPlayableMap(b.m);
        if (ap !== bp) return ap ? -1 : 1;
        return a.i - b.i;
      })
      .map((x) => x.m);
  }, [maps, isPlayableMap]);

  const recommendedIdOrder = useMemo(() => {
    type RecommendationMapItem = { mapId?: string; MapId?: string };
    const r = recommendations as
      | { recommendedMaps?: RecommendationMapItem[]; RecommendedMaps?: RecommendationMapItem[] }
      | null;
    const recommendedMaps = r?.recommendedMaps ?? r?.RecommendedMaps ?? [];
    const ids = (recommendedMaps ?? []).map((x) => x.mapId ?? x.MapId);
    // Normalize for stable matching (Guid comparison is case-insensitive).
    return ids.filter(Boolean).map((id) => String(id).toLowerCase());
  }, [recommendations]);

  const recommendedIdIndex = useMemo(() => {
    const idx = new Map<string, number>();
    recommendedIdOrder.forEach((id, i) => idx.set(id, i));
    return idx;
  }, [recommendedIdOrder]);

  const loadMaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await learnerMapsApi.getMaps({
        pageNumber: 1,
        pageSize: 50,
        publishedOnly: true,
        search: searchTerm.trim() || undefined,
        difficulty: difficultyFilter === "all" ? undefined : Number(difficultyFilter),
        sortBy: "CreatedAt",
        sortAscending: sortBy !== "newest", // false = newest first
      });
      if (res.data.isSuccess && res.data.data) {
        setMaps(res.data.data.items as ApiMap[]);
      } else {
        setError(res.data.message || t("failedLoadMapList"));
      }
    } catch (err) {
      setError(t("errorLoadMapList"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, difficultyFilter, sortBy, t]);

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  useEffect(() => {
    learnerMapsApi.getMapTags().then((r) => {
      if (r.data.isSuccess && r.data.data) {
        const onlyConcepts = r.data.data
          .map((tag) => tag.name)
          .filter((name) => !isDifficultyTag(name) && !isConceptExcluded(name));
        const uniqueConcepts = [...new Set(onlyConcepts)];
        const knowledge = uniqueConcepts
          .filter((name) => !isSkillMechanismConcept(name))
          .sort((a, b) => a.localeCompare(b));
        const mechanism = uniqueConcepts
          .filter((name) => isSkillMechanismConcept(name))
          .sort((a, b) => a.localeCompare(b));
        setKnowledgeConceptOptions(knowledge);
        setMechanismConceptOptions(mechanism);
      }
    });
  }, []);

  // Fetch BE recommendations once for the current user.
  useEffect(() => {
    let alive = true;
    learnerRecommendationsApi
      .getRecommendations()
      .then((res) => {
        if (!alive) return;
        if (res.data.isSuccess) setRecommendations(res.data.data ?? null);
        else setRecommendations(null);
      })
      .catch(() => {
        if (!alive) return;
        setRecommendations(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const filteredMaps = useMemo(() => {
    let list = [...mapsSortedPlayable];
    if (selectedKnowledgeConcepts.length > 0) {
      // Match-all semantics within each group.
      list = list.filter((m) => {
        const tags = (m.tagNames ?? []).map((x) => x.toLowerCase().trim());
        return selectedKnowledgeConcepts.every((c) => tags.includes(c.toLowerCase().trim()));
      });
    }

    if (selectedMechanismConcepts.length > 0) {
      list = list.filter((m) => {
        const tags = (m.tagNames ?? []).map((x) => x.toLowerCase().trim());
        return selectedMechanismConcepts.every((c) => tags.includes(c.toLowerCase().trim()));
      });
    }
    if (mainTab === "recommended") {
      const recommendedSet = new Set(recommendedIdOrder);
      list = list
        .filter((m) => recommendedSet.has(m.id.toLowerCase()))
        .sort((a, b) => {
          // In "recommended" tab: unlocked/available first, then locked at the end.
          const aLocked = lockedUnion.has(a.id);
          const bLocked = lockedUnion.has(b.id);
          if (aLocked !== bLocked) return aLocked ? 1 : -1;

          return (
            (recommendedIdIndex.get(a.id.toLowerCase()) ?? Number.MAX_SAFE_INTEGER) -
            (recommendedIdIndex.get(b.id.toLowerCase()) ?? Number.MAX_SAFE_INTEGER)
          );
        })
        .slice(0, 6);
    }
    if (mainTab === "progress") {
      list = list.filter((m) => completed.has(m.id) || m.id in inProgress);
    }
    return list;
  }, [
    mapsSortedPlayable,
    selectedKnowledgeConcepts,
    selectedMechanismConcepts,
    mainTab,
    completed,
    inProgress,
    recommendedIdOrder,
    recommendedIdIndex,
    lockedUnion,
  ]);

  const inProgressMaps = useMemo(
    () => mapsSortedPlayable.filter((m) => m.id in inProgress),
    [mapsSortedPlayable, inProgress],
  );

  const recommendedMaps = useMemo(() => {
    if (!recommendedIdOrder.length) return mapsSortedPlayable.slice(0, 2);
    const byId = new Map(mapsSortedPlayable.map((m) => [m.id.toLowerCase(), m]));
    return recommendedIdOrder
      .map((id) => byId.get(id))
      .filter((m): m is ApiMap => m != null)
      .slice(0, 2);
  }, [mapsSortedPlayable, recommendedIdOrder]);

  const beginnerMaps = useMemo(
    () => mapsSortedPlayable.filter((m) => getDifficultyTier(m.difficulty) === "easy"),
    [mapsSortedPlayable],
  );
  const allMapsForGrid = filteredMaps;

  const hasActiveFilters =
    difficultyFilter !== "all" ||
    knowledgeConceptPicker !== "all" ||
    mechanismConceptPicker !== "all" ||
    selectedKnowledgeConcepts.length > 0 ||
    selectedMechanismConcepts.length > 0 ||
    searchTerm.trim() !== "";

  if (loading && maps.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.loading}>{t("loadingMaps")}</div>
      </div>
    );
  }

  if (error && maps.length === 0) {
    return (
      <div className={styles.section}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const clearAllFilters = () => {
    setDifficultyFilter("all");
    setSelectedKnowledgeConcepts([]);
    setSelectedMechanismConcepts([]);
    setSearchTerm("");
    setKnowledgeConceptPicker("all");
    setMechanismConceptPicker("all");
  };

  return (
    <div className={styles.section}>
      <div className={styles.steamGrid}>
        {/* Steam-like left filters */}
        <div className={styles.steamLayout}>
          <aside className={styles.filterSidebar}>
            <div className={styles.filterSidebarHeader}>
              <span className={styles.filterSidebarTitle}>{t("filtersPanel")}</span>
              {hasActiveFilters && (
                <button
                  type="button"
                  className={styles.clearAllFiltersBtn}
                  onClick={clearAllFilters}
                >
                  {t("clearAllFilters")}
                </button>
              )}
            </div>

            <div className={styles.filterGroups}>
              <div className={styles.filterField}>
                <span className={styles.filterLabel} id="filter-search-label">
                  {t("mapsSearchLabel")}
                </span>
                <label
                  className={styles.searchBar}
                  htmlFor="maps-search"
                  aria-labelledby="filter-search-label"
                >
                  <Search size={18} aria-hidden />
                  <input
                    id="maps-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t("searchMapPlaceholder")}
                  />
                </label>
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel}>{t("difficulty")}</span>
                <select
                  className={styles.filterSelect}
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  aria-label={t("difficulty")}
                >
                  <option value="all">{t("filterAll")}</option>
                  <option value={1}>1/5</option>
                  <option value={2}>2/5</option>
                  <option value={3}>3/5</option>
                  <option value={4}>4/5</option>
                  <option value={5}>5/5</option>
                </select>
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel}>
                  {t("programmingKnowledge")}{" "}
                  <span className={styles.filterHint}>({t("conceptsMultiSelectHint")})</span>
                </span>
                <div className={styles.conceptFieldWrap}>
                  <select
                    className={styles.filterSelect}
                    value={knowledgeConceptPicker}
                    onChange={(e) => {
                      const value = e.target.value;
                      setKnowledgeConceptPicker(value);
                      if (value === "all") return;
                      setSelectedKnowledgeConcepts((prev) =>
                        prev.includes(value) ? prev : [...prev, value],
                      );
                    }}
                    aria-label={t("addConcept")}
                    title={t("conceptsMultiSelectHint")}
                  >
                    <option value="all">— {t("addConcept")} —</option>
                    {knowledgeConceptOptions.map((name) => (
                      <option key={name} value={name}>
                        {getConceptLabel(name, locale)}
                      </option>
                    ))}
                  </select>

                  <div className={styles.conceptChipsRow}>
                    {selectedKnowledgeConcepts.map((concept) => (
                      <button
                        key={concept}
                        type="button"
                        className={styles.conceptChip}
                        onClick={() => {
                          const next = selectedKnowledgeConcepts.filter((x) => x !== concept);
                          setSelectedKnowledgeConcepts(next);
                          if (knowledgeConceptPicker === concept && next.length === 0) {
                            setKnowledgeConceptPicker("all");
                          }
                        }}
                        title={t("conceptMatchAll")}
                      >
                        {getConceptLabel(concept, locale)} <span aria-hidden>×</span>
                      </button>
                    ))}
                    {selectedKnowledgeConcepts.length > 0 && (
                      <button
                        type="button"
                        className={styles.clearConceptsBtn}
                        onClick={() => {
                          setSelectedKnowledgeConcepts([]);
                          setKnowledgeConceptPicker("all");
                        }}
                      >
                        {t("filterAll")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel}>
                  {t("skillMechanism")}{" "}
                  <span className={styles.filterHint}>({t("conceptsMultiSelectHint")})</span>
                </span>
                <div className={styles.conceptFieldWrap}>
                  <select
                    className={styles.filterSelect}
                    value={mechanismConceptPicker}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMechanismConceptPicker(value);
                      if (value === "all") return;
                      setSelectedMechanismConcepts((prev) =>
                        prev.includes(value) ? prev : [...prev, value],
                      );
                    }}
                    aria-label={t("addConcept")}
                    title={t("conceptsMultiSelectHint")}
                  >
                    <option value="all">— {t("addConcept")} —</option>
                    {mechanismConceptOptions.map((name) => (
                      <option key={name} value={name}>
                        {getConceptLabel(name, locale)}
                      </option>
                    ))}
                  </select>

                  <div className={styles.conceptChipsRow}>
                    {selectedMechanismConcepts.map((concept) => (
                      <button
                        key={concept}
                        type="button"
                        className={styles.conceptChip}
                        onClick={() => {
                          const next = selectedMechanismConcepts.filter((x) => x !== concept);
                          setSelectedMechanismConcepts(next);
                          if (mechanismConceptPicker === concept && next.length === 0) {
                            setMechanismConceptPicker("all");
                          }
                        }}
                        title={t("conceptMatchAll")}
                      >
                        {getConceptLabel(concept, locale)} <span aria-hidden>×</span>
                      </button>
                    ))}
                    {selectedMechanismConcepts.length > 0 && (
                      <button
                        type="button"
                        className={styles.clearConceptsBtn}
                        onClick={() => {
                          setSelectedMechanismConcepts([]);
                          setMechanismConceptPicker("all");
                        }}
                      >
                        {t("filterAll")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.filterField}>
                <span className={styles.filterLabel}>{t("sortByLabel")}</span>
                <select
                  className={styles.filterSelect}
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  aria-label={t("sortByLabel")}
                >
                  <option value="recommended">{t("sortRecommended")}</option>
                  <option value="newest">{t("sortNewest")}</option>
                  <option value="most_played">{t("sortMostPlayed")}</option>
                </select>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.steamMain}>
          <div className={styles.mainTabs}>
            {(["all", "recommended", "progress"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`${styles.mainTab} ${mainTab === tab ? styles.mainTabActive : ""}`}
                onClick={() => setMainTab(tab)}
              >
                {tab === "all"
                  ? t("allMaps")
                  : tab === "recommended"
                    ? t("recommended")
                    : t("myProgress")}
              </button>
            ))}
          </div>

          {/* Continue Playing */}
          {inProgressMaps.length > 0 && mainTab === "all" && !hasActiveFilters && (
            <section className={styles.block}>
              <h2 className={styles.blockTitle}>
                <Play size={20} className={styles.blockTitleIcon} aria-hidden />
                {t("continuePlaying")}
              </h2>
              <div className={styles.continueGrid}>
                {inProgressMaps.map((map) => {
                  const { status, progressPercent } = getMapStatus(
                    map.id,
                    inProgress,
                    completed,
                    lockedUnion,
                  );
                  return (
                    <MapCard
                      key={map.id}
                      map={map}
                      t={t}
                      locale={locale}
                      status={status}
                      progressPercent={progressPercent}
                      size="large"
                      onPlay={() => navigate(`/app/map/${map.id}`)}
                      onLocked={() => navigate(`/app/map/${map.id}`)}
                      showContinue
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Recommended for you */}
          {recommendedMaps.length > 0 && mainTab === "recommended" && !hasActiveFilters && (
            <section className={styles.block}>
              <h2 className={styles.blockTitle}>
                <Sparkles size={20} className={styles.blockTitleIcon} aria-hidden />
                {t("recommendedForYou")}
              </h2>
              <div className={styles.recommendedGrid}>
                {recommendedMaps.map((map) => {
                  const { status, progressPercent } = getMapStatus(
                    map.id,
                    inProgress,
                    completed,
                    lockedUnion,
                  );
                  return (
                    <MapCard
                      key={map.id}
                      map={map}
                      t={t}
                      locale={locale}
                      status={status}
                      progressPercent={progressPercent}
                      size="large"
                      badge="recommended"
                      onPlay={() => navigate(`/app/map/${map.id}`)}
                      onLocked={() => navigate(`/app/map/${map.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Beginner friendly */}
          {beginnerMaps.length > 0 && mainTab === "all" && !hasActiveFilters && (
            <section className={styles.block}>
              <h2 className={styles.blockTitle}>
                <GraduationCap size={20} className={styles.blockTitleIcon} aria-hidden />
                {t("beginnerFriendly")}
              </h2>
              <div className={styles.beginnerGrid}>
                {beginnerMaps.slice(0, 4).map((map) => {
                  const { status, progressPercent } = getMapStatus(
                    map.id,
                    inProgress,
                    completed,
                    lockedUnion,
                  );
                  return (
                    <MapCard
                      key={map.id}
                      map={map}
                      t={t}
                      locale={locale}
                      status={status}
                      progressPercent={progressPercent}
                      size="medium"
                      badge="start_here"
                      onPlay={() => navigate(`/app/map/${map.id}`)}
                      onLocked={() => navigate(`/app/map/${map.id}`)}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* All maps grid */}
          {mainTab === "recommended" && !hasActiveFilters ? null : (
            <section className={styles.block}>
              {mainTab === "all" ? (
                <h2 className={styles.blockTitle}>
                  <LayoutGrid size={20} className={styles.blockTitleIcon} aria-hidden />
                  {t("allMaps")}
                </h2>
              ) : null}
              {allMapsForGrid.length === 0 ? (
                <div className={styles.empty}>
                  <p>{t("noMapsPublished")}</p>
                </div>
              ) : (
                <div className={styles.mapsGrid}>
                  {allMapsForGrid.map((map) => {
                    const { status, progressPercent } = getMapStatus(
                      map.id,
                      inProgress,
                      completed,
                      lockedUnion,
                    );
                    return (
                      <MapCard
                        key={map.id}
                        map={map}
                        t={t}
                        locale={locale}
                        status={status}
                        progressPercent={progressPercent}
                        size="default"
                        onPlay={() => navigate(`/app/map/${map.id}`)}
                        onLocked={() => navigate(`/app/map/${map.id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

type CardSize = "default" | "medium" | "large";

function MapCard({
  map,
  t,
  locale,
  status,
  progressPercent,
  size = "default",
  badge,
  showContinue,
  onPlay,
  onLocked,
}: {
  map: ApiMap;
  t: (key: string) => string;
  locale: LocaleId;
  status: MapStatus;
  progressPercent?: number;
  size?: CardSize;
  badge?: "recommended" | "start_here";
  showContinue?: boolean;
  onPlay: () => void;
  onLocked?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isLocked = status === "locked";
  const diffTier = getDifficultyTier(map.difficulty);
  const difficultyClass =
    diffTier === "easy"
      ? styles.difficultyEasy
      : diffTier === "medium"
        ? styles.difficultyMedium
        : styles.difficultyHard;
  const tagNames = map.tagNames ?? [];
  const learnedTags = extractLearnedTags(map).map((name) => getConceptLabel(name, locale));
  const conceptTags = tagNames.filter((name) => !isDifficultyTag(name));
  const prerequisites =
    conceptTags
      .slice(0, 2)
      .map((name) => getConceptLabel(name, locale))
      .join(", ") || "—";
  const previewUrl =
    map.avatarUrl?.trim() ||
    map.gallery?.find((item) => item.kind !== "Video")?.url?.trim() ||
    map.gallery?.[0]?.url?.trim() ||
    null;

  const cardContent = (
    <>
      <div
        className={`${styles.thumb} ${size === "large" ? styles.thumbLarge : size === "medium" ? styles.thumbMedium : ""} ${isLocked ? styles.thumbLocked : ""}`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className={styles.thumbPlaceholder}>{t("gameCardNoPreview")}</div>
        )}
        {isLocked && (
          <div className={styles.lockOverlay}>
            <Lock size={32} aria-hidden />
          </div>
        )}
        {status === "completed" && (
          <div className={styles.completedOverlay}>
            <Check size={28} aria-hidden />
          </div>
        )}
        {progressPercent != null && status === "in_progress" && (
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
          </div>
        )}
        {badge === "recommended" && (
          <span className={styles.cardBadgeRecommended}>
            <Sparkles size={12} aria-hidden />
            {t("recommended")}
          </span>
        )}
        {badge === "start_here" && (
          <span className={styles.cardBadgeStartHere}>{t("startHere")}</span>
        )}
        {hover && !isLocked && (
          <div className={styles.playOverlay}>
            <span className={styles.playBtn}>
              <Play size={20} aria-hidden />
              {t("playNow")}
            </span>
          </div>
        )}
      </div>

      <div className={styles.cardInfo}>
        <h3 className={styles.cardTitle} title={map.title}>
          {map.title}
        </h3>
        {map.description && <p className={styles.cardDesc}>{map.description}</p>}
        <div className={styles.cardMeta}>
          <span className={styles.metaItem}>
            <Clock size={14} aria-hidden />
            {formatTime(map.timeLimitMs, t)}
          </span>
          <span className={`${styles.difficulty} ${difficultyClass}`}>
            {getDifficultyLabel(map.difficulty, t)}
          </span>
        </div>
        <p className={styles.prerequisiteText}>
          {t("prerequisiteKnowledge")}: {prerequisites}
        </p>
        {learnedTags.length > 0 && (
          <p className={styles.prerequisiteText}>
            {t("youWillLearn")}: {learnedTags.slice(0, 3).join(", ")}
          </p>
        )}
        <div className={styles.statusRow}>
          {status !== "in_progress" &&
            (status === "locked" ? (
              <button
                type="button"
                className={styles.lockedBuyBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onLocked?.();
                }}
              >
                <Lock size={12} aria-hidden />
                {t("mapLocked")}
              </button>
            ) : (
              <span className={styles.statusBadge}>
                {status === "completed" && (
                  <>
                    <Check size={12} aria-hidden /> {t("mapCompleted")}
                  </>
                )}
                {status === "available" && t("mapAvailable")}
              </span>
            ))}
          {showContinue && status === "in_progress" && (
            <button
              type="button"
              className={styles.continueBtn}
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
            >
              {t("continue")}
            </button>
          )}
        </div>
      </div>
    </>
  );

  const handleClick = () => {
    if (isLocked) return;
    onPlay();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${styles[`cardSize_${size}`]} ${isLocked ? styles.cardLocked : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {cardContent}
    </div>
  );
}
