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
import { Eye, Plus, Search, Edit, Star, Flag, Send } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export const MyMapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ownership tracking
  const [ownershipMap, setOwnershipMap] = useState<Record<string, { isAuthor: boolean }>>({});

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
  const [sortBy, setSortBy] = useState<"title" | "createdAt" | "difficulty" | "price">("createdAt");
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
                : "Price",
        sortAscending: sortOrder === "asc",
      });

      if (response.data.isSuccess && response.data.data) {
        const items = [...response.data.data.items];
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
  }, [currentPage, pageSize, searchTerm, filterDifficulty, sortBy, sortOrder]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  // Check ownership for all maps after fetching
  useEffect(() => {
    const checkOwnership = async () => {
      if (maps.length === 0) return;

      const ownershipChecks = await Promise.allSettled(
        maps.map((map) => learnerMapsApi.checkMapOwnership(map.id)),
      );

      const newOwnershipMap: Record<string, { isAuthor: boolean }> = {};
      ownershipChecks.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.data.isSuccess) {
          newOwnershipMap[maps[index].id] = {
            isAuthor: result.value.data.data?.isAuthor || false,
          };
        } else {
          // Default to not author if check fails
          newOwnershipMap[maps[index].id] = { isAuthor: false };
        }
      });

      setOwnershipMap(newOwnershipMap);
    };

    checkOwnership();
  }, [maps]);

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

  const getMapStatusColor = (status: number) => {
    switch (status) {
      case 0:
        return "var(--muted)";
      case 1:
        return "var(--warning)";
      case 2:
        return "var(--info)";
      case 3:
        return "var(--danger)";
      case 4:
        return "var(--success)";
      default:
        return "var(--text-2)";
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

  const getDifficultyColor = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "var(--success)";
      case 2:
        return "var(--warning)";
      case 3:
        return "var(--danger)";
      default:
        return "var(--text-2)";
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
            My Maps
          </h1>
          <p style={{ color: "var(--text-2)" }}>View and manage your challenge maps</p>
        </div>
        <button
          onClick={() => navigate(ROUTES.MAP_EDITOR)}
          style={{
            display: "flex",
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
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} /> Create Map
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            minWidth: "150px",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "13px", marginBottom: "4px" }}>
            Total Maps
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {totalItems}
          </div>
        </div>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "16px 20px",
            minWidth: "150px",
          }}
        >
          <div style={{ color: "var(--text-2)", fontSize: "13px", marginBottom: "4px" }}>
            Published Maps
          </div>
          <div style={{ color: "var(--text)", fontSize: "24px", fontWeight: "bold" }}>
            {maps.filter((m) => m.isPublished).length}
          </div>
        </div>
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
            placeholder="Search maps..."
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              color: "var(--text)",
              fontSize: "14px",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Difficulty Filter */}
        <select
          value={filterDifficulty}
          onChange={(e) =>
            handleFilterChange([
              () => setFilterDifficulty(e.target.value === "" ? "" : Number(e.target.value)),
            ])
          }
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          <option value="">All Difficulties</option>
          <option value="1">Easy</option>
          <option value="2">Medium</option>
          <option value="3">Hard</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) =>
            setSortBy(e.target.value as "title" | "createdAt" | "difficulty" | "price")
          }
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
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
          style={{
            padding: "8px 14px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            fontSize: "14px",
            cursor: "pointer",
            fontWeight: "500",
          }}
          title={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>

        {/* Clear Filters */}
        {(searchTerm || filterDifficulty !== "") && (
          <button
            onClick={() =>
              handleFilterChange([() => setSearchTerm(""), () => setFilterDifficulty("")])
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
        </div>
      )}

      {/* Maps Table */}
      {maps.length > 0 && (
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
                    TYPE
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
                    TIME LIMIT
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
                {maps.map((map) => (
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
                        {map.avatarUrl ? (
                          <img
                            src={map.avatarUrl}
                            alt={map.title}
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
                    <td style={{ padding: "16px" }}>
                      <div>
                        <div
                          style={{ fontWeight: "500", color: "var(--text)", marginBottom: "4px" }}
                        >
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
                          display: "inline-block",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor: map.type === "Platform" ? "#dbeafe" : "#fef3c7",
                          color: map.type === "Platform" ? "#1e40af" : "#92400e",
                        }}
                      >
                        {map.type}
                      </span>
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
                    <td style={{ padding: "16px", color: "var(--text-2)", fontSize: "14px" }}>
                      {formatTime(map.timeLimitMs)}
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
                        {ownershipMap[map.id]?.isAuthor && map.mapStatus === 0 ? (
                          // Show update and submit buttons for draft maps owned by user
                          <>
                            <button
                              onClick={() => handleViewDetails(map.id)}
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
                              title="View Map"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdateMap(map.id)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: "1px solid var(--border)",
                                borderRadius: "6px",
                                color: "var(--primary)",
                                cursor: "pointer",
                                fontSize: "12px",
                                transition: "all 0.2s ease",
                              }}
                              title="Update Map"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleSubmitForReview(map.id)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: "1px solid var(--border)",
                                borderRadius: "6px",
                                color: "var(--success)",
                                cursor: "pointer",
                                fontSize: "12px",
                                transition: "all 0.2s ease",
                              }}
                              title="Submit for Review"
                            >
                              <Send size={16} />
                            </button>
                          </>
                        ) : !ownershipMap[map.id]?.isAuthor ? (
                          // Show rate and report buttons for maps not owned by user
                          <>
                            <button
                              onClick={() => handleViewDetails(map.id)}
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
                              title="View Map"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenRateModal(map.id)}
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
                              title="Rate Map"
                            >
                              <Star size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenReportModal(map.id)}
                              style={{
                                padding: "6px 12px",
                                background: "transparent",
                                border: "1px solid var(--border)",
                                borderRadius: "6px",
                                color: "var(--danger)",
                                cursor: "pointer",
                                fontSize: "12px",
                                transition: "all 0.2s ease",
                              }}
                              title="Report Map"
                            >
                              <Flag size={16} />
                            </button>
                          </>
                        ) : (
                          // Show only view button for other cases
                          <button
                            onClick={() => handleViewDetails(map.id)}
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
                            title="View Map"
                          >
                            <Eye size={16} />
                          </button>
                        )}
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
