/**
 * Learner My Maps Page
 *
 * Displays a paginated list of maps created by the learner with:
 * - Status indicators (Draft/Pending Review/Approved/Published)
 * - Difficulty levels
 * - Publishing status
 * - Tags
 * - Pagination controls
 * - Action buttons (View, Edit)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerCommunityApi } from "@/services/api/learner/community.api";
import type { Map } from "@/types/api/learner/maps";
import {
  Eye,
  Plus,
  Search,
  Edit,
  Star,
  Flag,
  Send,
  Map as MapIcon,
  Clock3,
  CalendarDays,
  ListFilter,
  ArrowUpDown,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

type OwnershipMap = Record<string, { isAuthor: boolean }>;

type StatCard = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
};

type StatsCardsProps = {
  cards: StatCard[];
};

type MapFiltersProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterDifficulty: number | "";
  onFilterDifficultyChange: (value: number | "") => void;
  sortBy: "title" | "createdAt" | "difficulty" | "timeLimitMs";
  onSortByChange: (value: "title" | "createdAt" | "difficulty" | "timeLimitMs") => void;
  sortOrder: "asc" | "desc";
  onSortOrderToggle: () => void;
  onClearFilters: () => void;
};

type MapCardProps = {
  map: Map;
  isAuthor: boolean;
  formatDate: (dateString: string | null) => string;
  formatTime: (milliseconds: number) => string;
  getMapStatusLabel: (status: number) => string;
  getDifficultyLabel: (difficulty: number) => string;
  onPreview: (mapId: string) => void;
  onEdit: (mapId: string) => void;
  onPublish: (mapId: string) => void;
  onRate: (mapId: string) => void;
  onReport: (mapId: string) => void;
};

type MapListProps = {
  maps: Map[];
  ownershipMap: OwnershipMap;
  formatDate: (dateString: string | null) => string;
  formatTime: (milliseconds: number) => string;
  getMapStatusLabel: (status: number) => string;
  getDifficultyLabel: (difficulty: number) => string;
  onPreview: (mapId: string) => void;
  onEdit: (mapId: string) => void;
  onPublish: (mapId: string) => void;
  onRate: (mapId: string) => void;
  onReport: (mapId: string) => void;
};

const getDifficultyBadgeStyle = (difficulty: number): React.CSSProperties => {
  if (difficulty === 1) {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.35)",
    };
  }

  if (difficulty === 2) {
    return {
      background: "rgba(245, 158, 11, 0.16)",
      color: "#9a6700",
      border: "1px solid rgba(245, 158, 11, 0.4)",
    };
  }

  if (difficulty === 3) {
    return {
      background: "rgba(239, 68, 68, 0.14)",
      color: "#991b1b",
      border: "1px solid rgba(239, 68, 68, 0.38)",
    };
  }

  return {
    background: "var(--surface-2)",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
  };
};

const getStatusBadgeStyle = (status: number): React.CSSProperties => {
  if (status === 0) {
    return {
      background: "rgba(107, 114, 128, 0.18)",
      color: "#374151",
      border: "1px solid rgba(107, 114, 128, 0.35)",
    };
  }

  if (status === 1) {
    return {
      background: "rgba(249, 115, 22, 0.16)",
      color: "#9a3412",
      border: "1px solid rgba(249, 115, 22, 0.36)",
    };
  }

  if (status === 4) {
    return {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.35)",
    };
  }

  return {
    background: "var(--surface-2)",
    color: "var(--text-2)",
    border: "1px solid var(--border)",
  };
};

const actionBtnStyle = (tone: "neutral" | "primary" | "success" | "warning" | "danger") => {
  const styles: Record<string, React.CSSProperties> = {
    neutral: {
      background: "var(--surface)",
      color: "var(--text)",
      border: "1px solid var(--border)",
    },
    primary: {
      background: "rgba(59, 130, 246, 0.12)",
      color: "#1d4ed8",
      border: "1px solid rgba(59, 130, 246, 0.35)",
    },
    success: {
      background: "rgba(34, 197, 94, 0.14)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.35)",
    },
    warning: {
      background: "rgba(245, 158, 11, 0.16)",
      color: "#9a6700",
      border: "1px solid rgba(245, 158, 11, 0.4)",
    },
    danger: {
      background: "rgba(239, 68, 68, 0.14)",
      color: "#991b1b",
      border: "1px solid rgba(239, 68, 68, 0.36)",
    },
  };

  return {
    ...styles[tone],
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: 600,
    padding: "8px 10px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as React.CSSProperties;
};

export const StatsCards: React.FC<StatsCardsProps> = ({ cards }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
        gap: "16px",
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, white), var(--surface))",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "18px 20px",
            boxShadow: "0 8px 22px rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: card.accent,
              color: "var(--text)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {card.icon}
          </div>
          <div>
            <div style={{ color: "var(--text-2)", fontSize: "12px", marginBottom: "3px" }}>
              {card.label}
            </div>
            <div style={{ color: "var(--text)", fontSize: "30px", lineHeight: 1, fontWeight: 800 }}>
              {card.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const MapFilters: React.FC<MapFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  filterDifficulty,
  onFilterDifficultyChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  onClearFilters,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        marginBottom: "18px",
        padding: "14px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
      }}
    >
      <div style={{ position: "relative", flex: "1 1 260px", minWidth: "220px" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-2)",
          }}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="Search maps..."
          style={{
            width: "100%",
            padding: "10px 12px 10px 34px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            color: "var(--text)",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <select
        value={filterDifficulty}
        onChange={(e) =>
          onFilterDifficultyChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        style={{
          flex: "0 1 170px",
          padding: "10px 12px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          color: "var(--text)",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        <option value="">All Difficulty</option>
        <option value="1">Easy</option>
        <option value="2">Medium</option>
        <option value="3">Hard</option>
      </select>

      <div style={{ position: "relative", display: "inline-flex", flex: "0 1 190px" }}>
        <ListFilter
          size={14}
          style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
        />
        <select
          value={sortBy}
          onChange={(e) =>
            onSortByChange(e.target.value as "title" | "createdAt" | "difficulty" | "timeLimitMs")
          }
          style={{
            padding: "10px 12px 10px 30px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="createdAt">Sort by Created</option>
          <option value="title">Sort by Title</option>
          <option value="difficulty">Sort by Difficulty</option>
          <option value="timeLimitMs">Sort by Time Limit</option>
        </select>
      </div>

      <button
        onClick={onSortOrderToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          padding: "10px 14px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          color: "var(--text)",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          flex: "0 1 120px",
        }}
      >
        <ArrowUpDown size={14} /> {sortOrder === "asc" ? "Asc" : "Desc"}
      </button>

      {(searchTerm || filterDifficulty !== "") && (
        <button
          onClick={onClearFilters}
          style={{
            flex: "0 1 90px",
            padding: "10px 12px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            color: "var(--text-2)",
            fontSize: "13px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
};

const MapCard: React.FC<MapCardProps> = ({
  map,
  isAuthor,
  formatDate,
  formatTime,
  getMapStatusLabel,
  getDifficultyLabel,
  onPreview,
  onEdit,
  onPublish,
  onRate,
  onReport,
}) => {
  const difficultyStyle = getDifficultyBadgeStyle(map.difficulty);
  const statusStyle = getStatusBadgeStyle(map.mapStatus);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "center",
        padding: "16px",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        boxShadow: "0 4px 14px rgba(0, 0, 0, 0.06)",
        transition: "all 0.25s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 10px 22px rgba(0, 0, 0, 0.12)";
        e.currentTarget.style.background = "color-mix(in srgb, var(--surface) 87%, white)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0, 0, 0, 0.06)";
        e.currentTarget.style.background = "var(--surface)";
      }}
    >
      <div style={{ display: "flex", gap: "14px", minWidth: 0, flex: "1 1 360px" }}>
        <div
          style={{
            width: "92px",
            height: "92px",
            minWidth: "92px",
            borderRadius: "12px",
            overflow: "hidden",
            backgroundColor: "var(--surface-2)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {map.avatarUrl ? (
            <img
              src={map.avatarUrl}
              alt={map.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <MapIcon size={28} color="var(--text-2)" />
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <div
              style={{
                fontWeight: 700,
                color: "var(--text)",
                fontSize: "16px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {map.title}
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: "6px",
                padding: "3px 8px",
                fontSize: "11px",
                fontWeight: 700,
                background: map.type === "Platform" ? "#dbeafe" : "#fef3c7",
                color: map.type === "Platform" ? "#1e40af" : "#92400e",
              }}
            >
              {map.type}
            </span>
          </div>

          <div
            style={{
              color: "var(--text-2)",
              fontSize: "13px",
              lineHeight: 1.5,
              maxWidth: "520px",
              minHeight: "20px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginBottom: "10px",
            }}
          >
            {map.description || "No description provided"}
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {map.tagNames.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "3px 9px",
                  borderRadius: "999px",
                  fontSize: "11px",
                  background: "var(--surface-2)",
                  color: "var(--text-2)",
                  border: "1px solid var(--border)",
                }}
              >
                #{tag}
              </span>
            ))}
            {map.tagNames.length > 4 && (
              <span style={{ fontSize: "11px", color: "var(--text-2)", alignSelf: "center" }}>
                +{map.tagNames.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "9px", alignContent: "center", flex: "0 1 210px" }}>
        <span
          style={{
            ...difficultyStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "fit-content",
            borderRadius: "999px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          {getDifficultyLabel(map.difficulty)}
        </span>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "var(--text-2)",
            fontSize: "13px",
          }}
        >
          <Clock3 size={14} /> {formatTime(map.timeLimitMs)}
        </div>

        <span
          style={{
            ...statusStyle,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "fit-content",
            borderRadius: "999px",
            padding: "6px 12px",
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          {getMapStatusLabel(map.mapStatus)}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gap: "10px",
          justifyItems: "end",
          flex: "1 1 260px",
          marginLeft: "auto",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: map.price > 0 ? "var(--primary)" : "var(--text-2)",
              fontSize: "18px",
              fontWeight: 800,
            }}
          >
            {map.price > 0 ? `${map.price.toLocaleString("en-US")} OC` : "Free"}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--text-2)",
              fontSize: "12px",
            }}
          >
            <CalendarDays size={13} /> {formatDate(map.createdAt)}
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={() => onPreview(map.id)} style={actionBtnStyle("neutral")}>
            <Eye size={14} /> Preview
          </button>

          {isAuthor && map.mapStatus === 0 && (
            <>
              <button onClick={() => onEdit(map.id)} style={actionBtnStyle("primary")}>
                <Edit size={14} /> Edit
              </button>
              <button onClick={() => onPublish(map.id)} style={actionBtnStyle("success")}>
                <Send size={14} /> Publish
              </button>
            </>
          )}

          {!isAuthor && (
            <>
              <button onClick={() => onRate(map.id)} style={actionBtnStyle("warning")}>
                <Star size={14} /> Rate
              </button>
              <button onClick={() => onReport(map.id)} style={actionBtnStyle("danger")}>
                <Flag size={14} /> Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const MapList: React.FC<MapListProps> = ({
  maps,
  ownershipMap,
  formatDate,
  formatTime,
  getMapStatusLabel,
  getDifficultyLabel,
  onPreview,
  onEdit,
  onPublish,
  onRate,
  onReport,
}) => {
  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {maps.map((map) => (
        <MapCard
          key={map.id}
          map={map}
          isAuthor={ownershipMap[map.id]?.isAuthor || false}
          formatDate={formatDate}
          formatTime={formatTime}
          getMapStatusLabel={getMapStatusLabel}
          getDifficultyLabel={getDifficultyLabel}
          onPreview={onPreview}
          onEdit={onEdit}
          onPublish={onPublish}
          onRate={onRate}
          onReport={onReport}
        />
      ))}
    </div>
  );
};

export const MyMapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"author" | "collected">("author");

  // Modal state for rating
  const [ratingModal, setRatingModal] = useState<{ open: boolean; mapId: string | null }>({
    open: false,
    mapId: null,
  });
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);

  // Modal state for reporting
  const [reportModal, setReportModal] = useState<{ open: boolean; mapId: string | null }>({
    open: false,
    mapId: null,
  });
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Search, filter & sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"title" | "createdAt" | "difficulty" | "timeLimitMs">(
    "createdAt",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchMaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await learnerMapsApi.getMyMaps({
        pageNumber: currentPage,
        pageSize,
        publishedOnly: false, // Show all maps (draft, pending, approved, published)
        difficulty: filterDifficulty !== "" ? (filterDifficulty as number) : undefined,
        search: searchTerm || undefined,
        sortBy:
          sortBy === "createdAt"
            ? "CreatedAt"
            : sortBy === "title"
              ? "Title"
              : sortBy === "difficulty"
                ? "Difficulty"
                : "TimeLimitMs",
        sortAscending: sortOrder === "asc",
        isAuthorOnly: activeTab === "author" ? true : false,
      });

      if (response.data.isSuccess && response.data.data) {
        const items =
          activeTab === "collected"
            ? response.data.data.items.filter((m) => !(m.isAuthor ?? false))
            : [...response.data.data.items];
        setMaps(items);
        setTotalPages(response.data.data.totalPages);
        setTotalItems(response.data.data.totalItems);
      } else {
        setError(response.data.message || "Failed to load maps");
      }
    } catch (err) {
      setError("Failed to load maps");
      console.error("Maps fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterDifficulty, sortBy, sortOrder, activeTab]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleViewDetails = async (mapId: string) => {
    // Navigate to map editor or view
    navigate(ROUTES.MAP_EDITOR, { state: { mapId } });
  };

  const handleUpdateMap = (mapId: string) => {
    // Navigate to map editor with edit mode
    navigate(ROUTES.MAP_EDITOR, { state: { mapId, mode: "edit" } });
  };

  const handleSubmitForReview = async (mapId: string) => {
    if (
      !confirm(
        "Are you sure you want to submit this map for review? You won't be able to edit it until it's reviewed.",
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await learnerMapsApi.submitMapForReview(mapId);

      if (response.data.isSuccess) {
        alert("Map submitted for review successfully!");
        // Refresh the maps list
        fetchMaps();
      } else {
        setError(response.data.message || "Failed to submit map for review");
      }
    } catch (err) {
      setError("Failed to submit map for review");
      console.error("Submit error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRateModal = (mapId: string) => {
    setRatingModal({ open: true, mapId });
    setRating(5);
    setRatingComment("");
  };

  const handleCloseRateModal = () => {
    setRatingModal({ open: false, mapId: null });
    setRating(5);
    setRatingComment("");
  };

  const handleSubmitRating = async () => {
    if (!ratingModal.mapId) return;

    try {
      setRatingLoading(true);
      setError(null);

      const response = await learnerCommunityApi.rateMap(ratingModal.mapId, {
        rating,
        comment: ratingComment || undefined,
      });

      if (response.data.isSuccess) {
        alert("Rating submitted successfully!");
        handleCloseRateModal();
      } else {
        setError(response.data.message || "Failed to submit rating");
      }
    } catch (err) {
      setError("Failed to submit rating");
      console.error("Rating error:", err);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleOpenReportModal = (mapId: string) => {
    setReportModal({ open: true, mapId });
    setReportReason("");
    setReportDetails("");
  };

  const handleCloseReportModal = () => {
    setReportModal({ open: false, mapId: null });
    setReportReason("");
    setReportDetails("");
  };

  const handleSubmitReport = async () => {
    if (!reportModal.mapId || !reportReason) {
      setError("Please provide a reason for the report");
      return;
    }

    try {
      setReportLoading(true);
      setError(null);

      const response = await learnerCommunityApi.reportMap(reportModal.mapId, {
        reason: reportReason,
        details: reportDetails || undefined,
      });

      if (response.data.isSuccess) {
        alert("Report submitted successfully!");
        handleCloseReportModal();
      } else {
        setError(response.data.message || "Failed to submit report");
      }
    } catch (err) {
      setError("Failed to submit report");
      console.error("Report error:", err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleFilterChange = (updaters: Array<() => void>) => {
    updaters.forEach((fn) => fn());
    setCurrentPage(1);
  };

  const getMapStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return "Draft";
      case 1:
        return "Pending Review";
      case 2:
        return "Approved";
      case 3:
        return "Rejected";
      case 4:
        return "Published";
      default:
        return "Unknown";
    }
  };

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "Easy";
      case 2:
        return "Medium";
      case 3:
        return "Hard";
      default:
        return "Unknown";
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const ownershipMap: OwnershipMap = maps.reduce((acc, map) => {
    acc[map.id] = { isAuthor: Boolean(map.isAuthor) };
    return acc;
  }, {} as OwnershipMap);

  const publishedCount = maps.filter((m) => m.isPublished || m.mapStatus === 4).length;
  const draftCount = maps.filter((m) => m.mapStatus === 0).length;

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
          <p style={{ color: "var(--text-2)", marginTop: "16px" }}>Loading maps...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1600px", margin: "0 auto" }}>
      <div
        style={{
          marginBottom: "24px",
          display: "grid",
          gap: "16px",
          padding: "20px",
          borderRadius: "18px",
          border: "1px solid var(--border)",
          background:
            "radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 40%), var(--surface)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
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
              My Maps
            </h1>
            <p style={{ color: "var(--text-2)" }}>
              {activeTab === "author" ? "Màn chơi do bạn tạo" : "Màn chơi bạn đã sưu tầm"}
            </p>
          </div>
          <button
            onClick={() => navigate(ROUTES.MAP_EDITOR)}
            disabled={activeTab !== "author"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 20px",
              background: activeTab === "author" ? "var(--primary)" : "var(--surface-2)",
              border: "none",
              borderRadius: "8px",
              color: activeTab === "author" ? "white" : "var(--muted)",
              fontSize: "14px",
              fontWeight: "500",
              cursor: activeTab === "author" ? "pointer" : "not-allowed",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} /> Create Map
          </button>
        </div>

        <StatsCards
          cards={[
            {
              label: "Total Maps",
              value: totalItems,
              icon: <MapIcon size={20} />,
              accent: "rgba(59, 130, 246, 0.16)",
            },
            {
              label: "Published Maps",
              value: publishedCount,
              icon: <Send size={20} />,
              accent: "rgba(34, 197, 94, 0.16)",
            },
            {
              label: "Draft Maps",
              value: draftCount,
              icon: <Edit size={20} />,
              accent: "rgba(107, 114, 128, 0.18)",
            },
          ]}
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab("author");
            setCurrentPage(1);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: activeTab === "author" ? "var(--primary)" : "transparent",
            color: activeTab === "author" ? "var(--on-primary, #0b1020)" : "var(--text)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Bản đồ của tôi
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("collected");
            setCurrentPage(1);
          }}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: activeTab === "collected" ? "var(--primary)" : "transparent",
            color: activeTab === "collected" ? "var(--on-primary, #0b1020)" : "var(--text)",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sưu tầm
        </button>
      </div>

      <MapFilters
        searchTerm={searchTerm}
        onSearchTermChange={(value) => handleFilterChange([() => setSearchTerm(value)])}
        filterDifficulty={filterDifficulty}
        onFilterDifficultyChange={(value) => handleFilterChange([() => setFilterDifficulty(value)])}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
        onClearFilters={() =>
          handleFilterChange([() => setSearchTerm(""), () => setFilterDifficulty("")])
        }
      />

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

      {/* Empty State */}
      {!loading && maps.length === 0 && (
        <div
          style={{
            padding: "60px 24px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "16px", marginBottom: "16px" }}>
            No maps found
          </div>
          {activeTab === "author" ? (
            <button
              onClick={() => navigate(ROUTES.MAP_EDITOR)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                background: "var(--primary)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              <Plus size={16} /> Create Your First Map
            </button>
          ) : null}
        </div>
      )}

      {maps.length > 0 && (
        <div
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white), var(--surface))",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "14px",
            boxShadow: "0 8px 26px rgba(0, 0, 0, 0.08)",
          }}
        >
          <MapList
            maps={maps}
            ownershipMap={ownershipMap}
            formatDate={formatDate}
            formatTime={formatTime}
            getMapStatusLabel={getMapStatusLabel}
            getDifficultyLabel={getDifficultyLabel}
            onPreview={handleViewDetails}
            onEdit={handleUpdateMap}
            onPublish={handleSubmitForReview}
            onRate={handleOpenRateModal}
            onReport={handleOpenReportModal}
          />

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
                    background: currentPage === 1 ? "var(--surface-2)" : "var(--surface)",
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
                    background: currentPage === totalPages ? "var(--surface-2)" : "var(--surface)",
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
      )}

      {/* Rating Modal */}
      {ratingModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseRateModal}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "var(--text)", marginBottom: "16px", fontSize: "20px" }}>
              Rate This Map
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Rating (1-5)
              </label>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      background: rating >= value ? "var(--warning)" : "var(--surface-2)",
                      color: rating >= value ? "white" : "var(--text-2)",
                      cursor: "pointer",
                      fontSize: "20px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Comment (optional)
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your thoughts about this map..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseRateModal}
                disabled={ratingLoading}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  cursor: ratingLoading ? "not-allowed" : "pointer",
                  opacity: ratingLoading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={ratingLoading}
                style={{
                  padding: "10px 20px",
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: ratingLoading ? "not-allowed" : "pointer",
                  opacity: ratingLoading ? 0.5 : 1,
                }}
              >
                {ratingLoading ? "Submitting..." : "Submit Rating"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportModal.open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseReportModal}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: "var(--text)", marginBottom: "16px", fontSize: "20px" }}>
              Report This Map
            </h2>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Reason *
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select a reason...</option>
                <option value="inappropriate">Inappropriate Content</option>
                <option value="spam">Spam or Misleading</option>
                <option value="broken">Broken or Unplayable</option>
                <option value="copyright">Copyright Violation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  marginBottom: "8px",
                }}
              >
                Additional Details (optional)
              </label>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more information about why you're reporting this map..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "12px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text)",
                  fontSize: "14px",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={handleCloseReportModal}
                disabled={reportLoading}
                style={{
                  padding: "10px 20px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-2)",
                  fontSize: "14px",
                  cursor: reportLoading ? "not-allowed" : "pointer",
                  opacity: reportLoading ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={reportLoading || !reportReason}
                style={{
                  padding: "10px 20px",
                  background: "var(--danger)",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: reportLoading || !reportReason ? "not-allowed" : "pointer",
                  opacity: reportLoading || !reportReason ? 0.5 : 1,
                }}
              >
                {reportLoading ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMapsPage;
