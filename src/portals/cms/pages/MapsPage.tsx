/**
 * CMS Maps Page
 *
 * Displays paginated list of all maps with:
 * - Status indicators (Draft/Published/Archived)
 * - Difficulty levels
 * - Publishing status
 * - Tags and concepts
 * - Pagination controls
 * - Action buttons (View, Review)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cmsMapsApi } from "@/services/api/cms/maps.api";
import type {
  GetMapsParams,
  MapListItem,
  MapStatusEnum,
  MapDetail,
  MapSortBy as ApiMapSortBy,
  MapStatusFilter,
} from "@/types/api/cms/maps";
import { Modal } from "../components/Modal";
import { Eye, Check, CheckCircle, X, Plus, Search, Play, Lock, LockOpen } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import {
  canCreateMaps,
  getCurrentUserPlan,
  type SubscriptionPlan,
} from "@/lib/auth/subscriptionPlan";

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeMediaUrl = (rawUrl: string): string => {
  const url = rawUrl.trim();
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const apiBase = toNonEmptyString(import.meta.env.VITE_API_BASE_URL);
  if (apiBase) {
    try {
      return new URL(url, apiBase).toString();
    } catch {
      // Ignore and try origin fallback.
    }
  }

  if (typeof window !== "undefined") {
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  }

  return url;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const resolveMapPreviewUrl = (mapLike: unknown): string | null => {
  if (!isRecord(mapLike)) {
    return null;
  }

  const directPreview =
    toNonEmptyString(mapLike.avatarUrl) ??
    toNonEmptyString(mapLike.AvatarUrl) ??
    toNonEmptyString(mapLike.avatarURL) ??
    toNonEmptyString(mapLike.thumbnailUrl) ??
    toNonEmptyString(mapLike.ThumbnailUrl) ??
    toNonEmptyString(mapLike.imageUrl) ??
    toNonEmptyString(mapLike.ImageUrl) ??
    toNonEmptyString(mapLike.avatarPath) ??
    toNonEmptyString(mapLike.AvatarPath);

  if (directPreview) {
    return normalizeMediaUrl(directPreview);
  }

  const gallery = Array.isArray(mapLike.gallery)
    ? mapLike.gallery
    : Array.isArray(mapLike.Gallery)
      ? mapLike.Gallery
      : [];

  for (const item of gallery) {
    if (!isRecord(item)) continue;
    const kind = (toNonEmptyString(item.kind) ?? toNonEmptyString(item.Kind) ?? "").toLowerCase();
    if (kind === "video") continue;
    const mediaUrl = toNonEmptyString(item.url) ?? toNonEmptyString(item.Url);
    if (mediaUrl) return normalizeMediaUrl(mediaUrl);
  }

  for (const item of gallery) {
    if (!isRecord(item)) continue;
    const mediaUrl = toNonEmptyString(item.url) ?? toNonEmptyString(item.Url);
    if (mediaUrl) return normalizeMediaUrl(mediaUrl);
  }

  return null;
};

type MapsPageSortBy = "title" | "createdAt" | "difficulty" | "price";
type MapSortOrder = "asc" | "desc";

const mapStatusToFilterCode: Record<MapStatusEnum, MapStatusFilter> = {
  Draft: 0,
  PendingReview: 1,
  Approved: 2,
  Rejected: 3,
  Published: 4,
};

const mapSortToApiValue: Record<MapsPageSortBy, ApiMapSortBy> = {
  createdAt: "CreatedAt",
  title: "Title",
  difficulty: "Difficulty",
  price: "Price",
};

const buildMapsQueryParams = (
  pageNumber: number,
  pageSize: number,
  searchTerm: string,
  mapStatus: MapStatusEnum | "",
  difficulty: number | "",
  sortBy: MapsPageSortBy,
  sortOrder: MapSortOrder,
): GetMapsParams => {
  const normalizedSearch = searchTerm.trim();
  const resolvedStatus = mapStatus === "" ? undefined : mapStatusToFilterCode[mapStatus];
  const resolvedDifficulty = difficulty === "" ? undefined : difficulty;

  return {
    pageNumber,
    pageSize,
    search: normalizedSearch || undefined,
    // Send both keys during the map->game contract migration.
    gameStatus: resolvedStatus,
    mapStatus: resolvedStatus,
    // Omit publishedOnly so backend can return all statuses unless explicitly requested.
    publishedOnly: undefined,
    difficulty: resolvedDifficulty,
    sortBy: mapSortToApiValue[sortBy],
    sortAscending: sortOrder === "asc",
  };
};

type ReviewDecision = "pass" | "fail" | null;

type ReviewSection = {
  key: string;
  titleKey: string;
  criteria: Array<{
    key: string;
    labelKey: string;
  }>;
};

type ReviewCriterion = {
  key: string;
  sectionTitleKey: string;
  labelKey: string;
};

const MAP_REVIEW_SECTIONS: ReviewSection[] = [
  {
    key: "validity",
    titleKey: "cmsReview.section.validity",
    criteria: [
      {
        key: "validity-start-goal",
        labelKey: "cmsReview.criteria.validity.startGoal",
      },
      {
        key: "validity-solvable",
        labelKey: "cmsReview.criteria.validity.solvable",
      },
      {
        key: "validity-soft-lock",
        labelKey: "cmsReview.criteria.validity.softLock",
      },
      {
        key: "validity-no-wrong-path",
        labelKey: "cmsReview.criteria.validity.noWrongPath",
      },
      {
        key: "validity-objects",
        labelKey: "cmsReview.criteria.validity.objects",
      },
    ],
  },
  {
    key: "difficulty",
    titleKey: "cmsReview.section.difficulty",
    criteria: [
      {
        key: "difficulty-match-level",
        labelKey: "cmsReview.criteria.difficulty.matchLevel",
      },
      {
        key: "difficulty-not-too-easy",
        labelKey: "cmsReview.criteria.difficulty.notTooEasy",
      },
      {
        key: "difficulty-not-too-hard",
        labelKey: "cmsReview.criteria.difficulty.notTooHard",
      },
      {
        key: "difficulty-step-count",
        labelKey: "cmsReview.criteria.difficulty.stepCount",
      },
      {
        key: "difficulty-time",
        labelKey: "cmsReview.criteria.difficulty.time",
      },
    ],
  },
  {
    key: "fairness",
    titleKey: "cmsReview.section.fairness",
    criteria: [
      {
        key: "fairness-no-unfair-traps",
        labelKey: "cmsReview.criteria.fairness.noUnfairTraps",
      },
      {
        key: "fairness-no-unreasonable-loss",
        labelKey: "cmsReview.criteria.fairness.noUnreasonableLoss",
      },
      {
        key: "fairness-clear-mechanics",
        labelKey: "cmsReview.criteria.fairness.clearMechanics",
      },
    ],
  },
  {
    key: "technical-quality",
    titleKey: "cmsReview.section.technicalQuality",
    criteria: [
      {
        key: "technical-no-bug",
        labelKey: "cmsReview.criteria.technicalQuality.noBug",
      },
      {
        key: "technical-object-correct",
        labelKey: "cmsReview.criteria.technicalQuality.objectCorrect",
      },
    ],
  },
  {
    key: "visual-ux",
    titleKey: "cmsReview.section.visualUx",
    criteria: [
      {
        key: "visual-clear-layout",
        labelKey: "cmsReview.criteria.visualUx.clearLayout",
      },
      {
        key: "visual-no-spam",
        labelKey: "cmsReview.criteria.visualUx.noSpam",
      },
      {
        key: "visual-important-elements",
        labelKey: "cmsReview.criteria.visualUx.importantElements",
      },
      {
        key: "visual-asset-usage",
        labelKey: "cmsReview.criteria.visualUx.assetUsage",
      },
    ],
  },
  {
    key: "content-safety",
    titleKey: "cmsReview.section.contentSafety",
    criteria: [
      {
        key: "safety-map-name",
        labelKey: "cmsReview.criteria.contentSafety.mapName",
      },
      {
        key: "safety-description",
        labelKey: "cmsReview.criteria.contentSafety.description",
      },
      {
        key: "safety-sensitive",
        labelKey: "cmsReview.criteria.contentSafety.sensitive",
      },
    ],
  },
  {
    key: "metadata",
    titleKey: "cmsReview.section.metadata",
    criteria: [
      {
        key: "metadata-has-name",
        labelKey: "cmsReview.criteria.metadata.hasName",
      },
      {
        key: "metadata-has-description",
        labelKey: "cmsReview.criteria.metadata.hasDescription",
      },
      {
        key: "metadata-has-tags",
        labelKey: "cmsReview.criteria.metadata.hasTags",
      },
    ],
  },
];

const MAP_REVIEW_CRITERIA: ReviewCriterion[] = MAP_REVIEW_SECTIONS.flatMap((section) =>
  section.criteria.map((criterion) => ({
    key: criterion.key,
    sectionTitleKey: section.titleKey,
    labelKey: criterion.labelKey,
  })),
);

const createInitialReviewDecisions = (): Record<string, ReviewDecision> =>
  MAP_REVIEW_CRITERIA.reduce<Record<string, ReviewDecision>>((acc, criterion) => {
    acc[criterion.key] = null;
    return acc;
  }, {});

export const MapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, locale } = useTranslation();
  const [userPlan, setUserPlan] = useState<SubscriptionPlan>("free");
  const canCreateMap = canCreateMaps(userPlan);
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Modal and action states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapDetail | null>(null);
  const [selectedMapForAction, setSelectedMapForAction] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewDecisions, setReviewDecisions] = useState<Record<string, ReviewDecision>>(() =>
    createInitialReviewDecisions(),
  );
  const [otherReviewReason, setOtherReviewReason] = useState("");
  const [reviewValidationError, setReviewValidationError] = useState<string | null>(null);

  // Search, filter & sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<MapStatusEnum | "">("");
  const [filterDifficulty, setFilterDifficulty] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<MapsPageSortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<MapSortOrder>("desc");
  const [viewMode, setViewMode] = useState<"all" | "locked">("all");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const fetchMaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        viewMode === "locked"
          ? await cmsMapsApi.getLockedMaps({
              pageNumber: currentPage,
              pageSize,
            })
          : await cmsMapsApi.getMaps(
              buildMapsQueryParams(
                currentPage,
                pageSize,
                debouncedSearchTerm,
                filterStatus,
                filterDifficulty,
                sortBy,
                sortOrder,
              ),
            );

      const paginationData = response.data.data;
      if (paginationData) {
        setMaps(paginationData.items);
        setTotalPages(Math.max(1, paginationData.totalPages || 1));
      } else {
        setMaps([]);
        setTotalPages(1);
      }
    } catch (err) {
      setError("Failed to load games");
      console.error("Games fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    debouncedSearchTerm,
    filterStatus,
    filterDifficulty,
    sortBy,
    sortOrder,
    viewMode,
  ]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  useEffect(() => {
    let cancelled = false;

    const loadPlan = async () => {
      const plan = await getCurrentUserPlan(false, "cms");
      if (!cancelled) {
        setUserPlan(plan);
      }
    };

    loadPlan();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewDetails = useCallback(async (mapId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsMapsApi.getMapById(mapId);
      const mapDetail = response.data.data;
      if (mapDetail) {
        const mapItem = maps.find((item) => item.id === mapId);
        const creatorNameFromDetail =
          toNonEmptyString(mapDetail.createdByUserName) ??
          toNonEmptyString(mapDetail.CreatedByUserName);
        const creatorNameFromList = toNonEmptyString(mapItem?.createdByUserName ?? null);

        setSelectedMap({
          ...mapDetail,
          createdByUserName: creatorNameFromDetail ?? creatorNameFromList,
        });
        setDetailModalOpen(true);
      } else {
        alert("Game not found");
      }
    } catch (err) {
      alert("Failed to load game details");
      console.error("Game detail error:", err);
    } finally {
      setActionLoading(false);
    }
  }, [maps]);

  useEffect(() => {
    const gameIdFromQuery =
      searchParams.get("gameId")?.trim() || searchParams.get("mapId")?.trim();
    if (!gameIdFromQuery) return;
    void handleViewDetails(gameIdFromQuery);
  }, [handleViewDetails, searchParams]);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("gameId");
      next.delete("mapId");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleOpenReviewModal = (mapId: string, mapTitle: string) => {
    setSelectedMapForAction({ id: mapId, title: mapTitle });
    setReviewDecisions(createInitialReviewDecisions());
    setOtherReviewReason("");
    setReviewValidationError(null);
    setReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setSelectedMapForAction(null);
    setReviewDecisions(createInitialReviewDecisions());
    setOtherReviewReason("");
    setReviewValidationError(null);
  };

  const getPlayRoute = (mapType: MapListItem["type"]) => {
    if (mapType === "Platform") return ROUTES.PLATFORM;
    if (mapType === "Snake") return ROUTES.SNAKE;
    return ROUTES.GAME;
  };

  const handlePlayMap = (mapId: string, mapType: MapListItem["type"]) => {
    navigate(getPlayRoute(mapType), {
      state: {
        levelId: mapId,
        roleContext: "cms",
        returnTo: ROUTES.CMS_MAPS,
      },
    });
  };

  const handleLockMap = async (mapId: string, mapTitle: string) => {
    const note = window.prompt(
      t("cmsMaps.lockNotePrompt").replace("{title}", mapTitle),
      "",
    );
    if (note === null) return;

    try {
      setActionLoading(true);
      const response = await cmsMapsApi.lockMap(mapId, note || undefined);
      if (!response.data.isSuccess) {
        alert(response.data.message || t("cmsMaps.lockFailed"));
        return;
      }
      alert(response.data.message || t("cmsMaps.lockSuccess"));

      if (selectedMap?.id === mapId) {
        const detail = await cmsMapsApi.getMapById(mapId).catch(() => null);
        if (detail?.data?.data) {
          setSelectedMap(detail.data.data);
        }
      }

      await fetchMaps();
    } catch (err) {
      alert(t("cmsMaps.lockFailed"));
      console.error("Lock game error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockMap = async (mapId: string) => {
    const confirmed = window.confirm(t("cmsMaps.confirmUnlock"));
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const response = await cmsMapsApi.unlockMap(mapId, true);
      if (!response.data.isSuccess) {
        alert(response.data.message || t("cmsMaps.unlockFailed"));
        return;
      }
      alert(response.data.message || t("cmsMaps.unlockSuccess"));

      if (selectedMap?.id === mapId) {
        const detail = await cmsMapsApi.getMapById(mapId).catch(() => null);
        if (detail?.data?.data) {
          setSelectedMap(detail.data.data);
        }
      }

      await fetchMaps();
    } catch (err) {
      alert(t("cmsMaps.unlockFailed"));
      console.error("Unlock game error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async (mode: "approve" | "reject") => {
    if (!selectedMapForAction) return;

    const unevaluatedCriteria = MAP_REVIEW_CRITERIA.filter(
      (criterion) => reviewDecisions[criterion.key] === null,
    );

    if (unevaluatedCriteria.length > 0) {
      setReviewValidationError(t("cmsReview.validationAllCriteria"));
      return;
    }

    const failedCriteria = MAP_REVIEW_CRITERIA.filter(
      (criterion) => reviewDecisions[criterion.key] === "fail",
    );

    const trimmedOtherReason = otherReviewReason.trim();

    try {
      setActionLoading(true);

      if (mode === "approve") {
        if (failedCriteria.length > 0) {
          setReviewValidationError(t("cmsReview.validationAllCriteria"));
          return;
        }
        await cmsMapsApi.approveMap(selectedMapForAction.id, {
          reviewNote: trimmedOtherReason || undefined,
        });
        alert(t("cmsReview.approveSuccess"));
      } else {
        if (failedCriteria.length === 0) {
          setReviewValidationError(t("cmsReview.validationAllCriteria"));
          return;
        }
        const failedCriteriaSummary = failedCriteria
          .map((criterion, index) => {
            const sectionTitle = t(criterion.sectionTitleKey);
            const criterionLabel = t(criterion.labelKey);
            return `${index + 1}. [${sectionTitle}] ${criterionLabel}`;
          })
          .join("\n");

        const rejectReason = [
          t("cmsReview.checklistFailed"),
          t("cmsReview.failedCriteria"),
          failedCriteriaSummary,
          trimmedOtherReason ? `${t("cmsReview.otherReason")}:\n${trimmedOtherReason}` : null,
        ]
          .filter(Boolean)
          .join("\n\n");

        await cmsMapsApi.rejectMap(selectedMapForAction.id, {
          rejectReason,
        });
        alert(t("cmsReview.rejectSuccess"));
      }

      handleCloseReviewModal();
      fetchMaps();
    } catch (err) {
      alert(t("cmsReview.submitFailed"));
      console.error("Submit review error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const setCriterionDecision = (criterionKey: string, decision: Exclude<ReviewDecision, null>) => {
    setReviewValidationError(null);
    setReviewDecisions((prev) => ({
      ...prev,
      [criterionKey]: decision,
    }));
  };

  const reviewedCriteriaCount = MAP_REVIEW_CRITERIA.filter(
    (criterion) => reviewDecisions[criterion.key] !== null,
  ).length;
  const failedCriteriaCount = MAP_REVIEW_CRITERIA.filter(
    (criterion) => reviewDecisions[criterion.key] === "fail",
  ).length;
  const canApproveReview = reviewedCriteriaCount === MAP_REVIEW_CRITERIA.length && failedCriteriaCount === 0;
  const canRejectReview = reviewedCriteriaCount === MAP_REVIEW_CRITERIA.length && failedCriteriaCount > 0;

  const handleFilterChange = (updaters: Array<() => void>) => {
    updaters.forEach((fn) => fn());
    setCurrentPage(1);
  };

  const getMapStatusLabel = (status: MapStatusEnum) => {
    switch (status) {
      case "Draft":
        return "Draft";
      case "PendingReview":
        return "Pending Review";
      case "Approved":
        return "Approved";
      case "Rejected":
        return "Rejected";
      case "Published":
        return "Published";
      default:
        return "Unknown";
    }
  };

  const getMapStatusColor = (status: MapStatusEnum) => {
    switch (status) {
      case "Draft":
        return "var(--muted)";
      case "PendingReview":
        return "var(--warning)";
      case "Approved":
        return "var(--info)";
      case "Rejected":
        return "var(--danger)";
      case "Published":
        return "var(--success)";
      default:
        return "var(--text-2)";
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    const level = Math.min(5, Math.max(1, Math.round(difficulty)));
    return `${level}/5`;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "var(--success)";
    if (difficulty === 3) return "var(--warning)";
    return "var(--danger)";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (milliseconds?: number) => {
    if (typeof milliseconds !== "number" || !Number.isFinite(milliseconds) || milliseconds <= 0) {
      return "—";
    }
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  if (loading && maps.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "48px",
              height: "48px",
              border: "4px solid var(--border)",
              borderTop: "4px solid var(--primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          ></div>
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Loading games...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          marginBottom: "24px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              color: "var(--text)",
              fontSize: "28px",
              fontWeight: "bold",
              marginBottom: "8px",
            }}
          >
            Games
          </h1>
          <p style={{ color: "var(--text-2)" }}>View and manage all games</p>
        </div>
        <button
          onClick={() => {
            if (!canCreateMap) return;
            navigate(ROUTES.MAP_EDITOR, { state: { roleContext: "cms" } });
          }}
          disabled={!canCreateMap}
          title={!canCreateMap ? "Upgrade to Pro to create games" : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            background: canCreateMap ? "var(--primary)" : "var(--surface-2)",
            border: "none",
            borderRadius: "8px",
            color: canCreateMap ? "white" : "var(--muted)",
            fontSize: "14px",
            fontWeight: "500",
            cursor: canCreateMap ? "pointer" : "not-allowed",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} /> Create Game
        </button>
        {!canCreateMap && (
          <p style={{ color: "var(--warning)", fontSize: "13px", margin: 0 }}>
            Upgrade to Pro to create games
          </p>
        )}
      </div>

      {/* Search, Filter & Sort */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: "6px",
            padding: "4px",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            background: "var(--surface)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setViewMode("all");
              setCurrentPage(1);
            }}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              background: viewMode === "all" ? "var(--primary)" : "transparent",
              color: viewMode === "all" ? "white" : "var(--text)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {t("cmsMaps.allGames")}
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("locked");
              setCurrentPage(1);
              setSearchTerm("");
              setDebouncedSearchTerm("");
              setFilterStatus("");
              setFilterDifficulty("");
            }}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              background: viewMode === "locked" ? "var(--primary)" : "transparent",
              color: viewMode === "locked" ? "white" : "var(--text)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {t("cmsMaps.lockedGames")}
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "200px", maxWidth: "320px" }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-2)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleFilterChange([() => setSearchTerm(e.target.value)])}
            placeholder="Search games..."
            disabled={viewMode === "locked"}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "14px",
              boxSizing: "border-box",
              cursor: viewMode === "locked" ? "not-allowed" : "text",
              opacity: viewMode === "locked" ? 0.7 : 1,
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) =>
            handleFilterChange([
              () => setFilterStatus(e.target.value === "" ? "" : (e.target.value as MapStatusEnum)),
            ])
          }
          disabled={viewMode === "locked"}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: viewMode === "locked" ? "not-allowed" : "pointer",
            opacity: viewMode === "locked" ? 0.7 : 1,
          }}
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="PendingReview">Pending Review</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
          <option value="Published">Published</option>
        </select>

        {/* Difficulty Filter */}
        <select
          value={filterDifficulty}
          onChange={(e) =>
            handleFilterChange([
              () => setFilterDifficulty(e.target.value === "" ? "" : Number(e.target.value)),
            ])
          }
          disabled={viewMode === "locked"}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: viewMode === "locked" ? "not-allowed" : "pointer",
            opacity: viewMode === "locked" ? 0.7 : 1,
          }}
        >
          <option value="">All Difficulties</option>
          <option value="1">1/5</option>
          <option value="2">2/5</option>
          <option value="3">3/5</option>
          <option value="4">4/5</option>
          <option value="5">5/5</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "title" | "createdAt" | "difficulty" | "price")
          }
          disabled={viewMode === "locked"}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: viewMode === "locked" ? "not-allowed" : "pointer",
            opacity: viewMode === "locked" ? 0.7 : 1,
          }}
        >
          <option value="createdAt">Sort: Created</option>
          <option value="title">Sort: Title</option>
          <option value="difficulty">Sort: Difficulty</option>
          <option value="price">Sort: Price</option>
        </select>

        {/* Sort Order */}
        <button
          onClick={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
          disabled={viewMode === "locked"}
          style={{
            padding: "8px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: viewMode === "locked" ? "not-allowed" : "pointer",
            fontWeight: "500",
            opacity: viewMode === "locked" ? 0.7 : 1,
          }}
          title={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>

        {/* Clear Filters */}
        {viewMode !== "locked" && (searchTerm || filterStatus !== "" || filterDifficulty !== "") && (
          <button
            onClick={() =>
              handleFilterChange([
                () => setSearchTerm(""),
                () => setFilterStatus(""),
                () => setFilterDifficulty(""),
              ])
            }
            style={{
              padding: "8px 14px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text-2)",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "12px",
            color: "var(--danger)",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      {/* Maps Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              color: "var(--text)",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                    width: "120px",
                  }}
                ></th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  TITLE
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  DIFFICULTY
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  PRICE
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  TAGS
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "left",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  CREATED
                </th>
                <th
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: "var(--text-2)",
                  }}
                >
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {maps.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: "24px",
                      textAlign: "center",
                      color: "var(--text-2)",
                      fontSize: "14px",
                    }}
                  >
                    {viewMode === "locked" ? t("cmsMaps.noLockedGames") : "No games found"}
                  </td>
                </tr>
              ) : maps.map((map) => (
                <tr
                  key={map.id}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {(() => {
                    const previewUrl = resolveMapPreviewUrl(map);

                    return (
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div
                          style={{
                            width: "80px",
                            height: "80px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            backgroundColor: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {previewUrl ? (
                            <img
                              src={previewUrl}
                              alt={map.title}
                              referrerPolicy="no-referrer"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "20px" }}>🗺️</span>
                          )}
                        </div>
                      </td>
                    );
                  })()}
                  <td style={{ padding: "16px" }}>
                    <div>
                      <div style={{ fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>
                        {map.title}
                      </div>
                      {map.description && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-2)",
                            maxWidth: "300px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {map.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: "500",
                        background: `color-mix(in srgb, ${getDifficultyColor(map.difficulty)} 15%, transparent)`,
                        color: getDifficultyColor(map.difficulty),
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: getDifficultyColor(map.difficulty),
                        }}
                      ></span>
                      {getDifficultyLabel(map.difficulty)}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: `color-mix(in srgb, ${getMapStatusColor(map.mapStatus)} 15%, transparent)`,
                          color: getMapStatusColor(map.mapStatus),
                          width: "fit-content",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: getMapStatusColor(map.mapStatus),
                          }}
                        ></span>
                        {getMapStatusLabel(map.mapStatus)}
                      </span>
                      {map.isPublished && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--success)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Check size={14} /> Published
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div
                      style={{
                        color: map.price > 0 ? "var(--primary)" : "var(--text-2)",
                        fontSize: "14px",
                        fontWeight: map.price > 0 ? "500" : "normal",
                      }}
                    >
                      {map.price > 0 ? `$${map.price}` : "Free"}
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {map.tagNames.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            background: "var(--surface-2)",
                            color: "var(--text-2)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                      {map.tagNames.length > 3 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-2)",
                            padding: "2px 4px",
                          }}
                        >
                          +{map.tagNames.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                    {formatDate(map.createdAt)}
                  </td>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {/* Play Map */}
                      {map.mapStatus !== "Draft" && (
                        <button
                          onClick={() => handlePlayMap(map.id, map.type)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--primary)",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            transition: "all 0.2s ease",
                          }}
                          title={t("cmsMaps.playGame")}
                        >
                          <Play size={16} />
                        </button>
                      )}

                      {/* View Details */}
                      <button
                        onClick={() => handleViewDetails(map.id)}
                        disabled={actionLoading}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--border)",
                          borderRadius: "6px",
                          color: "var(--info)",
                          cursor: "pointer",
                          fontSize: "12px",
                          transition: "all 0.2s ease",
                        }}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Review */}
                      {map.mapStatus === "PendingReview" && (
                        <button
                          onClick={() => handleOpenReviewModal(map.id, map.title)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--warning)",
                            cursor: "pointer",
                            fontSize: "12px",
                            transition: "all 0.2s ease",
                          }}
                          title={t("cmsReview.openReview")}
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      {/* Lock / Unlock */}
                      {(viewMode === "locked" || (map.mapStatus === "Published" && !map.isPublished)) ? (
                        <button
                          onClick={() => handleUnlockMap(map.id)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--success)",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            transition: "all 0.2s ease",
                          }}
                          title={t("cmsMaps.unlockGame")}
                        >
                          <LockOpen size={16} />
                        </button>
                      ) : map.mapStatus === "Published" ? (
                        <button
                          onClick={() => handleLockMap(map.id, map.title)}
                          disabled={actionLoading}
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--danger)",
                            cursor: actionLoading ? "not-allowed" : "pointer",
                            fontSize: "12px",
                            transition: "all 0.2s ease",
                          }}
                          title={t("cmsMaps.lockGame")}
                        >
                          <Lock size={16} />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            style={{
              padding: "16px 24px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div style={{ color: "var(--text-2)", fontSize: "14px" }}>
              Showing page {currentPage} of {totalPages}
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: "8px 16px",
                  background: currentPage === 1 ? "var(--surface-2)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: currentPage === 1 ? "var(--muted)" : "var(--text)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                Previous
              </button>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: "8px 16px",
                  background: currentPage === totalPages ? "var(--surface-2)" : "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: currentPage === totalPages ? "var(--muted)" : "var(--text)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={handleCloseDetailModal}
        title="Game details"
        maxWidth="800px"
      >
        {selectedMap && (
          (() => {
            const selectedMapPreviewUrl = resolveMapPreviewUrl(selectedMap);
            return (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Basic Info */}
            <div style={{ paddingBottom: "16px", borderBottom: "1px solid var(--border)" }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                {selectedMap.title}
              </h2>
              <p style={{ color: "var(--text-2)", fontSize: "14px", lineHeight: "1.5" }}>
                {selectedMap.description}
              </p>
            </div>

            {/* Map Image */}
            {selectedMapPreviewUrl && (
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Game Preview
                </div>
                <div
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    height: "300px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    backgroundColor: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={selectedMapPreviewUrl}
                    alt={selectedMap.title}
                    referrerPolicy="no-referrer"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<span style="font-size: 48px">🗺️</span>';
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Metadata Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Difficulty
                </div>
                <div style={{ color: "var(--text)" }}>
                  {getDifficultyLabel(selectedMap.difficulty)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Time Limit
                </div>
                <div style={{ color: "var(--text)" }}>{formatTime(selectedMap.timeLimitMs)}</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Status
                </div>
                <div style={{ color: "var(--text)" }}>
                  {getMapStatusLabel(selectedMap.mapStatus)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Published
                </div>
                <div
                  style={{
                    color: "var(--text)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {selectedMap.isPublished ? (
                    <>
                      <Check size={16} color="var(--success)" /> <span>Yes</span>
                    </>
                  ) : (
                    <>
                      <X size={16} color="var(--danger)" /> <span>No</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Price
                </div>
                <div style={{ color: "var(--text)" }}>
                  {selectedMap.price > 0 ? `$${selectedMap.price}` : "Free"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Unlock Editorial After
                </div>
                <div style={{ color: "var(--text)" }}>
                  {selectedMap.unlockEditorialAfterStars} stars
                </div>
              </div>
            </div>

            {/* Editorial Content */}
            {selectedMap.editorialContent && (
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Editorial Content
                </div>
                <div
                  style={{
                    padding: "12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text-2)",
                    fontSize: "13px",
                    lineHeight: "1.6",
                  }}
                >
                  {selectedMap.editorialContent}
                </div>
              </div>
            )}

            {/* Hints */}
            {selectedMap.hints && selectedMap.hints.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Hints ({selectedMap.hints.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedMap.hints.map((hint, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "13px",
                        color: "var(--text-2)",
                      }}
                    >
                      <span style={{ fontWeight: "500", color: "var(--text)" }}>
                        #{hint.orderNo}:
                      </span>{" "}
                      {hint.content}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Constraints */}
            {selectedMap.constraints && selectedMap.constraints.length > 0 && (
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Constraints ({selectedMap.constraints.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedMap.constraints.map((constraint, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 12px",
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}>
                        Type: {constraint.type}
                      </div>
                      <div
                        style={{
                          color: "var(--text-2)",
                          fontSize: "12px",
                          fontFamily: "monospace",
                        }}
                      >
                        {constraint.payload}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Spec */}
            {selectedMap.activeSpec && (
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Active Specification (v{selectedMap.activeSpec.version})
                </div>
                <div
                  style={{
                    padding: "12px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                    <div>
                      <div
                        style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}
                      >
                        Grid Spec
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--text)",
                          maxHeight: "80px",
                          overflow: "auto",
                          padding: "8px",
                          background: "var(--bg)",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedMap.activeSpec.gridSpec}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}
                      >
                        Initial State
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--text)",
                          maxHeight: "80px",
                          overflow: "auto",
                          padding: "8px",
                          background: "var(--bg)",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedMap.activeSpec.initialStateSpec}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}
                      >
                        Win Condition
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--text)",
                          maxHeight: "80px",
                          overflow: "auto",
                          padding: "8px",
                          background: "var(--bg)",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedMap.activeSpec.winConditionSpec}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}
                      >
                        Fail Condition
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--text)",
                          maxHeight: "80px",
                          overflow: "auto",
                          padding: "8px",
                          background: "var(--bg)",
                          borderRadius: "4px",
                        }}
                      >
                        {selectedMap.activeSpec.failConditionSpec}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tags and Concepts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Tags
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedMap.tagNames.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        background: "var(--surface-2)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text)",
                    marginBottom: "8px",
                  }}
                >
                  Concepts
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {selectedMap.conceptNames && selectedMap.conceptNames.length > 0 ? (
                    selectedMap.conceptNames.map((concept, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          background: "var(--surface-2)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {concept}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: "12px", color: "var(--text-2)" }}>
                      No concepts assigned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Game ID
                </div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text)" }}>
                  {selectedMap.id}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Created At
                </div>
                <div style={{ fontSize: "11px", color: "var(--text)" }}>
                  {formatDate(selectedMap.createdAt)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Created By User ID
                </div>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text)" }}>
                  {selectedMap.createdByUserId}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                  Created By User
                </div>
                <div style={{ fontSize: "11px", color: "var(--text)" }}>
                  {selectedMap.createdByUserName ?? "—"}
                </div>
              </div>
              {selectedMap.activeSpec && (
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
                    Spec Version
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text)" }}>
                    v{selectedMap.activeSpec.version}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
              {(viewMode === "locked" || (selectedMap.mapStatus === "Published" && !selectedMap.isPublished)) && (
                <button
                  type="button"
                  onClick={() => handleUnlockMap(selectedMap.id)}
                  title={t("cmsMaps.unlockGame")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    background: "var(--success)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  <LockOpen size={16} /> {t("cmsMaps.unlockGame")}
                </button>
              )}
              {selectedMap.mapStatus === "Published" && !(viewMode === "locked" || !selectedMap.isPublished) && (
                <button
                  type="button"
                  onClick={() => handleLockMap(selectedMap.id, selectedMap.title)}
                  title={t("cmsMaps.lockGame")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    background: "var(--danger)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  <Lock size={16} /> {t("cmsMaps.lockGame")}
                </button>
              )}
            {selectedMap.mapStatus !== "Draft" && (
                <button
                  type="button"
                  onClick={() => handlePlayMap(selectedMap.id, selectedMap.type ?? "Topdown")}
                  title={t("cmsMaps.playGame")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    background: "var(--primary)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  <Play size={16} /> {t("cmsMaps.playGame")}
                </button>
              )}
            </div>
          </div>
            );
          })()
        )}
      </Modal>

      {/* Review Game Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={handleCloseReviewModal}
        title={t("cmsReview.title")}
        maxWidth="900px"
      >
        {selectedMapForAction && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canApproveReview) {
                void handleSubmitReview("approve");
                return;
              }
              if (canRejectReview) {
                void handleSubmitReview("reject");
                return;
              }
              setReviewValidationError(t("cmsReview.validationAllCriteria"));
            }}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <p style={{ color: "var(--text)", fontSize: "14px", marginBottom: "4px" }}>
                {t("cmsReview.reviewing")} <strong>"{selectedMapForAction.title}"</strong>
              </p>
              <p style={{ color: "var(--text-2)", fontSize: "12px", margin: 0 }}>
                {t("cmsReview.instructions")}
              </p>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: "8px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-2)",
                fontSize: "13px",
              }}
            >
              {t("cmsReview.criteriaReviewed")}: {reviewedCriteriaCount}/{MAP_REVIEW_CRITERIA.length}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {MAP_REVIEW_SECTIONS.map((section) => (
                <div
                  key={section.key}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    background: "var(--surface)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--surface-2)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "13px",
                      fontWeight: "600",
                      color: "var(--text)",
                    }}
                  >
                    {t(section.titleKey)}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {section.criteria.map((criterion) => {
                      const decision = reviewDecisions[criterion.key];

                      return (
                        <div
                          key={criterion.key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: "12px",
                            alignItems: "center",
                            padding: "10px 12px",
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <div style={{ color: "var(--text)", fontSize: "13px", lineHeight: "1.45" }}>
                            {t(criterion.labelKey)}
                          </div>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              type="button"
                              onClick={() => setCriterionDecision(criterion.key, "pass")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border:
                                  decision === "pass"
                                    ? "1px solid var(--success)"
                                    : "1px solid var(--border)",
                                background:
                                  decision === "pass"
                                    ? "color-mix(in srgb, var(--success) 18%, transparent)"
                                    : "transparent",
                                color: decision === "pass" ? "var(--success)" : "var(--text-2)",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              <Check size={14} /> {t("cmsReview.pass")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCriterionDecision(criterion.key, "fail")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 10px",
                                borderRadius: "8px",
                                border:
                                  decision === "fail"
                                    ? "1px solid var(--danger)"
                                    : "1px solid var(--border)",
                                background:
                                  decision === "fail"
                                    ? "color-mix(in srgb, var(--danger) 18%, transparent)"
                                    : "transparent",
                                color: decision === "fail" ? "var(--danger)" : "var(--text-2)",
                                fontSize: "12px",
                                cursor: "pointer",
                              }}
                            >
                              <X size={14} /> {t("cmsReview.fail")}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                {t("cmsReview.otherReasonLabel")}
              </label>
              <textarea
                value={otherReviewReason}
                onChange={(e) => setOtherReviewReason(e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
                placeholder={t("cmsReview.otherReasonPlaceholder")}
              />
            </div>

            {reviewValidationError && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--danger)",
                  background: "color-mix(in srgb, var(--danger) 12%, transparent)",
                  color: "var(--danger)",
                  fontSize: "13px",
                }}
              >
                {reviewValidationError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                paddingTop: "8px",
              }}
            >
              <button
                type="button"
                onClick={handleCloseReviewModal}
                disabled={actionLoading}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  cursor: actionLoading ? "not-allowed" : "pointer",
                }}
              >
                {t("cancel")}
              </button>
              {canApproveReview && (
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: "10px 20px",
                    background: actionLoading ? "var(--surface-2)" : "var(--success)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? t("cmsReview.submitting") : t("approved")}
                </button>
              )}
              {canRejectReview && (
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: "10px 20px",
                    background: actionLoading ? "var(--surface-2)" : "var(--danger)",
                    border: "none",
                    borderRadius: "8px",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? t("cmsReview.submitting") : t("rejected")}
                </button>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* Add keyframes for loading spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MapsPage;
