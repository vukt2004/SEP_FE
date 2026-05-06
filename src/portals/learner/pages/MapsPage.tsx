// src/portals/learner/pages/MapsPage.tsx
// Game library + progression UI for 2D puzzle learning platform
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
import { ROUTES } from "@/lib/constants/routes";
import styles from "./MapsPage.module.css";
import { getDifficultyTier } from "@/lib/maps/difficultyDisplay";
import { extractLearnedTags } from "@/lib/maps/learnedTags";
import { getConceptLabel } from "@/lib/maps/conceptLabels";
import {
  isDifficultyTag,
  isConceptExcluded,
  isSkillMechanismConcept,
} from "@/lib/maps/mapConceptFilters";

/** Số game hiển thị ban đầu trong các khối (Tiếp tục chơi, Đề xuất, Dành cho người mới); bấm tiêu đề để mở rộng. */
const MAPS_SECTION_PREVIEW = 3;
const PAGE_SIZE = 12;

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
  const location = useLocation();
  const lobbyPickState = (location.state ?? null) as
    | {
      lobbyPickMode?: boolean;
      lobbyPickReturnTo?: string;
      lobbyCreateMaxPlayers?: number;
      lobbyPickForRoom?: boolean;
      roomId?: string;
      roomCode?: string;
    }
    | null;
  const lobbyPickMode = lobbyPickState?.lobbyPickMode === true;
  const lobbyPickReturnTo = lobbyPickState?.lobbyPickReturnTo || ROUTES.LEARNER_LEARN;
  const [searchParams, setSearchParams] = useSearchParams();

  // Restore filters from URL search params on mount
  const initializedRef = useRef(false);
  const [maps, setMaps] = useState<ApiMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") ?? "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get("q") ?? "");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState<string>(() => searchParams.get("diff") ?? "all");
  const [selectedKnowledgeConcepts, setSelectedKnowledgeConcepts] = useState<string[]>(() => {
    const v = searchParams.get("kc");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [knowledgeConceptPicker, setKnowledgeConceptPicker] = useState<string>("all");
  const [selectedMechanismConcepts, setSelectedMechanismConcepts] = useState<string[]>(() => {
    const v = searchParams.get("mc");
    return v ? v.split(",").filter(Boolean) : [];
  });
  const [mechanismConceptPicker, setMechanismConceptPicker] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const v = searchParams.get("sort");
    if (v === "recommended" || v === "most_played") return v;
    return "newest";
  });
  const [mostPlayedRankById, setMostPlayedRankById] = useState<Map<string, number>>(() => new Map());
  const [priceMin, setPriceMin] = useState<string>(() => searchParams.get("pmin") ?? "");
  const [priceMax, setPriceMax] = useState<string>(() => searchParams.get("pmax") ?? "");
  const [mainTab, setMainTab] = useState<MainTab>(() => {
    const v = searchParams.get("tab");
    return v === "recommended" || v === "progress" ? v : "all";
  });
  const [expandContinueSection, setExpandContinueSection] = useState(false);
  const [expandBeginnerSection, setExpandBeginnerSection] = useState(false);
  const [expandRecommendedSection, setExpandRecommendedSection] = useState(false);
  const [knowledgeConceptOptions, setKnowledgeConceptOptions] = useState<string[]>([]);
  const [mechanismConceptOptions, setMechanismConceptOptions] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResultDto | null>(null);

  // Sync filter state → URL search params (replace to avoid polluting history)
  useEffect(() => {
    // Skip the first render to avoid overwriting URL params on mount
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }
    const p = new URLSearchParams();
    if (searchTerm.trim()) p.set("q", searchTerm.trim());
    if (difficultyFilter !== "all") p.set("diff", difficultyFilter);
    if (selectedKnowledgeConcepts.length > 0) p.set("kc", selectedKnowledgeConcepts.join(","));
    if (selectedMechanismConcepts.length > 0) p.set("mc", selectedMechanismConcepts.join(","));
    if (sortBy !== "newest") p.set("sort", sortBy);
    if (priceMin.trim()) p.set("pmin", priceMin.trim());
    if (priceMax.trim()) p.set("pmax", priceMax.trim());
    if (mainTab !== "all") p.set("tab", mainTab);
    // Preserve route location.state (e.g. lobbyPickMode from /app/browse) — replace-only search updates otherwise drop it.
    setSearchParams(p, {
      replace: true,
      ...(location.state != null ? { state: location.state } : {}),
    });
  }, [
    searchTerm,
    difficultyFilter,
    selectedKnowledgeConcepts,
    selectedMechanismConcepts,
    sortBy,
    priceMin,
    priceMax,
    mainTab,
    setSearchParams,
    location.state,
  ]);

  // Debounce search term: only update after user stops typing for 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (mainTab !== "all") {
      setExpandContinueSection(false);
      setExpandBeginnerSection(false);
    }
    if (mainTab !== "recommended") {
      setExpandRecommendedSection(false);
    }
  }, [mainTab]);

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
    ).then((results) => {
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

  const recommendedIdOrder = useMemo(() => {
    type RecommendationMapItem = { mapId?: string; MapId?: string };
    const r = recommendations as {
      recommendedMaps?: RecommendationMapItem[];
      RecommendedMaps?: RecommendationMapItem[];
    } | null;
    const recommendedMaps = r?.recommendedMaps ?? r?.RecommendedMaps ?? [];
    const ids = (recommendedMaps ?? []).map((x) => x.mapId ?? x.MapId);
    return ids.filter(Boolean).map((id) => String(id).toLowerCase());
  }, [recommendations]);

  const recommendedIdIndex = useMemo(() => {
    const idx = new Map<string, number>();
    recommendedIdOrder.forEach((id, i) => idx.set(id, i));
    return idx;
  }, [recommendedIdOrder]);

  const byCreatedDesc = (a: ApiMap, b: ApiMap) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  /** playable trước; trong từng nhóm áp dụng sort theo tab Sắp xếp (mới nhất / đề xuất / chơi nhiều). */
  const catalogMapsOrdered = useMemo(() => {
    const list = [...maps];
    const playableFirst = (a: ApiMap, b: ApiMap) => {
      const ap = isPlayableMap(a);
      const bp = isPlayableMap(b);
      if (ap !== bp) return ap ? -1 : 1;
      return 0;
    };

    if (sortBy === "newest") {
      list.sort((a, b) => {
        const pf = playableFirst(a, b);
        if (pf !== 0) return pf;
        return byCreatedDesc(a, b);
      });
      return list;
    }

    if (sortBy === "recommended") {
      list.sort((a, b) => {
        const pf = playableFirst(a, b);
        if (pf !== 0) return pf;
        const ia = recommendedIdIndex.get(a.id.toLowerCase()) ?? 999999;
        const ib = recommendedIdIndex.get(b.id.toLowerCase()) ?? 999999;
        if (ia !== ib) return ia - ib;
        return byCreatedDesc(a, b);
      });
      return list;
    }

    if (sortBy === "most_played") {
      list.sort((a, b) => {
        const pf = playableFirst(a, b);
        if (pf !== 0) return pf;
        const ra = mostPlayedRankById.get(a.id.toLowerCase()) ?? 999999;
        const rb = mostPlayedRankById.get(b.id.toLowerCase()) ?? 999999;
        if (ra !== rb) return ra - rb;
        return byCreatedDesc(a, b);
      });
      return list;
    }

    return list;
  }, [maps, sortBy, isPlayableMap, recommendedIdIndex, mostPlayedRankById]);

  const parsedPriceMin = priceMin.trim() !== "" ? Number(priceMin) : undefined;
  const parsedPriceMax = priceMax.trim() !== "" ? Number(priceMax) : undefined;

  const loadMaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await learnerMapsApi.getMaps({
        pageNumber: currentPage,
        pageSize: PAGE_SIZE,
        publishedOnly: true,
        search: debouncedSearchTerm.trim() || undefined,
        difficulty: difficultyFilter === "all" ? undefined : Number(difficultyFilter),
        minPrice: parsedPriceMin != null && !isNaN(parsedPriceMin) ? parsedPriceMin : undefined,
        maxPrice: parsedPriceMax != null && !isNaN(parsedPriceMax) ? parsedPriceMax : undefined,
        sortBy: "CreatedAt",
        sortAscending: false,
      });
      if (res.data.isSuccess && res.data.data) {
        setMaps(res.data.data.items as ApiMap[]);
        setTotalPages(res.data.data.totalPages);
      } else {
        setError(res.data.message || t("failedLoadMapList"));
        setMostPlayedRankById(new Map());
      }

      if (res.data.isSuccess && sortBy === "most_played") {
        const lb = await learnerMapsApi.getMostPlayedCreatedLeaderboard("Month", 1, 200);
        const next = new Map<string, number>();
        if (lb.data.isSuccess && lb.data.data?.items?.length) {
          lb.data.data.items.forEach((row, idx) => {
            const raw = row.mapId ?? row.gameId;
            const id = raw != null ? String(raw).toLowerCase() : "";
            if (id) next.set(id, idx);
          });
        }
        setMostPlayedRankById(next);
      } else {
        setMostPlayedRankById(new Map());
      }
    } catch (err) {
      setError(t("errorLoadMapList"));
      setMostPlayedRankById(new Map());
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, difficultyFilter, sortBy, parsedPriceMin, parsedPriceMax, t]);

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
    let list = [...catalogMapsOrdered];
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
    catalogMapsOrdered,
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
    () => catalogMapsOrdered.filter((m) => m.id in inProgress),
    [catalogMapsOrdered, inProgress],
  );

  const recommendedMaps = useMemo(() => {
    if (!recommendedIdOrder.length) return catalogMapsOrdered.slice(0, 24);
    const byId = new Map(catalogMapsOrdered.map((m) => [m.id.toLowerCase(), m]));
    return recommendedIdOrder
      .map((id) => byId.get(id))
      .filter((m): m is ApiMap => m != null);
  }, [catalogMapsOrdered, recommendedIdOrder]);

  const beginnerMaps = useMemo(
    () => catalogMapsOrdered.filter((m) => getDifficultyTier(m.difficulty) === "easy"),
    [catalogMapsOrdered],
  );
  const allMapsForGrid = filteredMaps;

  const hasActiveFilters =
    difficultyFilter !== "all" ||
    knowledgeConceptPicker !== "all" ||
    mechanismConceptPicker !== "all" ||
    selectedKnowledgeConcepts.length > 0 ||
    selectedMechanismConcepts.length > 0 ||
    searchTerm.trim() !== "" ||
    priceMin.trim() !== "" ||
    priceMax.trim() !== "";

  useEffect(() => {
    if (!hasActiveFilters) return;
    setExpandContinueSection(false);
    setExpandBeginnerSection(false);
    setExpandRecommendedSection(false);
  }, [hasActiveFilters]);

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
    setPriceMin("");
    setPriceMax("");
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build visible page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const handleMapPrimaryAction = (mapId: string, mapTitle?: string) => {
    if (lobbyPickMode) {
      if (lobbyPickState?.lobbyPickForRoom) {
        navigate(lobbyPickReturnTo, {
          replace: true,
          state: {
            roomId: lobbyPickState.roomId ?? "",
            roomCode: lobbyPickState.roomCode ?? "",
            selectedMapIdFromBrowse: mapId,
            selectedMapTitleFromBrowse: mapTitle ?? "",
            applyMapSelectionFromBrowse: true,
          },
        });
        return;
      }
      navigate(lobbyPickReturnTo, {
        replace: true,
        state: {
          openCreateModal: true,
          selectedMapId: mapId,
          selectedMapTitle: mapTitle ?? "",
          maxPlayers: lobbyPickState?.lobbyCreateMaxPlayers ?? 4,
        },
      });
      return;
    }
    navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", mapId));
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
                  onChange={(e) => { setDifficultyFilter(e.target.value); setCurrentPage(1); }}
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
                <span className={styles.filterLabel}>{t("priceRange")}</span>
                <div className={styles.priceRangeRow}>
                  <input
                    id="price-min"
                    className={styles.priceInput}
                    type="number"
                    min={0}
                    step={1}
                    placeholder={t("priceMin")}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    aria-label={t("priceMin")}
                  />
                  <span className={styles.priceSeparator}>—</span>
                  <input
                    id="price-max"
                    className={styles.priceInput}
                    type="number"
                    min={0}
                    step={1}
                    placeholder={t("priceMax")}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    aria-label={t("priceMax")}
                  />
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
                  <option value="newest">{t("sortNewest")}</option>
                  <option value="recommended">{t("sortRecommended")}</option>
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
                onClick={() => {
                  setMainTab(tab);
                  if (tab === "recommended") {
                    setExpandRecommendedSection(true);
                  }
                }}
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
              {inProgressMaps.length > MAPS_SECTION_PREVIEW ? (
                <button
                  type="button"
                  className={`${styles.curatedHead} ${styles.curatedHeadButton}`}
                  onClick={() => setExpandContinueSection((v) => !v)}
                  aria-expanded={expandContinueSection}
                >
                  <Play size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("continuePlaying")}</span>
                  <span className={styles.curatedExpandHint}>
                    {expandContinueSection ? t("mapsSectionShowLess") : t("mapsSectionShowMore")}
                  </span>
                  <ChevronDown
                    size={22}
                    className={styles.curatedChevron}
                    aria-hidden
                    data-expanded={expandContinueSection ? "true" : "false"}
                  />
                </button>
              ) : (
                <h2 className={styles.curatedHead}>
                  <Play size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("continuePlaying")}</span>
                </h2>
              )}
              <div className={styles.continueGrid}>
                {(expandContinueSection
                  ? inProgressMaps
                  : inProgressMaps.slice(0, MAPS_SECTION_PREVIEW)
                ).map((map) => {
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
                      onPlay={() => handleMapPrimaryAction(map.id, map.title)}
                      onLocked={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
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
              {recommendedMaps.length > MAPS_SECTION_PREVIEW ? (
                <button
                  type="button"
                  className={`${styles.curatedHead} ${styles.curatedHeadButton}`}
                  onClick={() => setExpandRecommendedSection((v) => !v)}
                  aria-expanded={expandRecommendedSection}
                >
                  <Sparkles size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("recommendedForYou")}</span>
                  <span className={styles.curatedExpandHint}>
                    {expandRecommendedSection ? t("mapsSectionShowLess") : t("mapsSectionShowMore")}
                  </span>
                  <ChevronDown
                    size={22}
                    className={styles.curatedChevron}
                    aria-hidden
                    data-expanded={expandRecommendedSection ? "true" : "false"}
                  />
                </button>
              ) : (
                <h2 className={styles.curatedHead}>
                  <Sparkles size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("recommendedForYou")}</span>
                </h2>
              )}
              <div className={styles.recommendedGrid}>
                {(expandRecommendedSection
                  ? recommendedMaps
                  : recommendedMaps.slice(0, MAPS_SECTION_PREVIEW)
                ).map((map) => {
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
                      onPlay={() => handleMapPrimaryAction(map.id, map.title)}
                      onLocked={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Beginner friendly */}
          {beginnerMaps.length > 0 && mainTab === "all" && !hasActiveFilters && (
            <section className={styles.block}>
              {beginnerMaps.length > MAPS_SECTION_PREVIEW ? (
                <button
                  type="button"
                  className={`${styles.curatedHead} ${styles.curatedHeadButton}`}
                  onClick={() => setExpandBeginnerSection((v) => !v)}
                  aria-expanded={expandBeginnerSection}
                >
                  <GraduationCap size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("beginnerFriendly")}</span>
                  <span className={styles.curatedExpandHint}>
                    {expandBeginnerSection ? t("mapsSectionShowLess") : t("mapsSectionShowMore")}
                  </span>
                  <ChevronDown
                    size={22}
                    className={styles.curatedChevron}
                    aria-hidden
                    data-expanded={expandBeginnerSection ? "true" : "false"}
                  />
                </button>
              ) : (
                <h2 className={styles.curatedHead}>
                  <GraduationCap size={22} className={styles.curatedHeadIcon} aria-hidden />
                  <span className={styles.curatedHeadLabel}>{t("beginnerFriendly")}</span>
                </h2>
              )}
              <div className={styles.beginnerGrid}>
                {(expandBeginnerSection
                  ? beginnerMaps
                  : beginnerMaps.slice(0, MAPS_SECTION_PREVIEW)
                ).map((map) => {
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
                      badge="start_here"
                      onPlay={() => handleMapPrimaryAction(map.id, map.title)}
                      onLocked={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
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
                        onPlay={() => handleMapPrimaryAction(map.id, map.title)}
                        onLocked={() => navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", map.id))}
                      />
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && allMapsForGrid.length > 0 && (
                <div className={styles.paginationWrap}>
                  <button
                    type="button"
                    className={styles.paginationBtn}
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {getPageNumbers().map((page, idx) =>
                    page === "..." ? (
                      <span key={`ellipsis-${idx}`} className={styles.paginationEllipsis}>
                        ···
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={`${styles.paginationBtn} ${page === currentPage ? styles.paginationBtnActive : ""}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    className={styles.paginationBtn}
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight size={18} />
                  </button>
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
    // Locked = chưa mua (paid game): vẫn mở trang chi tiết để xem và mua / dùng thử.
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
