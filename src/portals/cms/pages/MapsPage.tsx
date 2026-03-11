/**
 * CMS Maps Page
 *
 * Displays paginated list of all challenge maps with:
 * - Status indicators (Draft/Published/Archived)
 * - Difficulty levels
 * - Publishing status
 * - Tags and concepts
 * - Pagination controls
 * - Action buttons (View, Approve, Reject)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cmsMapsApi } from "@/services/api/cms/maps.api";
import type { MapListItem, MapStatusEnum, MapDetail } from "@/types/api/cms/maps";
import { Modal } from "../components/Modal";
import { Eye, Check, CheckCircle, X, Plus, Search } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export const MapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal and action states
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MapDetail | null>(null);
  const [selectedMapForAction, setSelectedMapForAction] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Search, filter & sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<MapStatusEnum | "">("");
  const [filterDifficulty, setFilterDifficulty] = useState<number | "">("");
  const [sortBy, setSortBy] = useState<"title" | "createdAt" | "difficulty" | "price">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchMaps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await cmsMapsApi.getMaps({
        pageNumber: currentPage,
        pageSize,
        searchTerm: searchTerm || undefined,
        mapStatus: filterStatus !== "" ? filterStatus : undefined,
        difficulty: filterDifficulty !== "" ? (filterDifficulty as number) : undefined,
      });

      const paginationData = response.data.data;
      if (paginationData) {
        const items = [...paginationData.items];
        // Client-side sort
        items.sort((a, b) => {
          let aVal: string | number = 0;
          let bVal: string | number = 0;
          if (sortBy === "title") {
            aVal = a.title.toLowerCase();
            bVal = b.title.toLowerCase();
          } else if (sortBy === "difficulty") {
            aVal = a.difficulty;
            bVal = b.difficulty;
          } else if (sortBy === "price") {
            aVal = a.price;
            bVal = b.price;
          } else {
            aVal = a.createdAt;
            bVal = b.createdAt;
          }
          if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
          if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
          return 0;
        });
        setMaps(items);
        setTotalPages(paginationData.totalPages);
        setTotalItems(paginationData.totalItems);
      }
    } catch (err) {
      setError("Failed to load maps");
      console.error("Maps fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, filterStatus, filterDifficulty, sortBy, sortOrder]);

  useEffect(() => {
    fetchMaps();
  }, [fetchMaps]);

  const handleViewDetails = async (mapId: string) => {
    try {
      setActionLoading(true);
      const response = await cmsMapsApi.getMapById(mapId);
      const mapDetail = response.data.data;
      if (mapDetail) {
        setSelectedMap(mapDetail);
        setDetailModalOpen(true);
      } else {
        alert("Map not found");
      }
    } catch (err) {
      alert("Failed to load map details");
      console.error("Map detail error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApproveModal = (mapId: string, mapTitle: string) => {
    setSelectedMapForAction({ id: mapId, title: mapTitle });
    setReviewNote("");
    setApproveModalOpen(true);
  };

  const handleOpenRejectModal = (mapId: string, mapTitle: string) => {
    setSelectedMapForAction({ id: mapId, title: mapTitle });
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapForAction) return;

    try {
      setActionLoading(true);
      await cmsMapsApi.approveMap(selectedMapForAction.id, {
        reviewNote: reviewNote || undefined,
      });
      alert("Map approved successfully!");
      setApproveModalOpen(false);
      setSelectedMapForAction(null);
      setReviewNote("");
      fetchMaps();
    } catch (err) {
      alert("Failed to approve map");
      console.error("Approve error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMapForAction) return;

    try {
      setActionLoading(true);
      await cmsMapsApi.rejectMap(selectedMapForAction.id, {
        rejectReason: rejectReason || undefined,
      });
      alert("Map rejected successfully!");
      setRejectModalOpen(false);
      setSelectedMapForAction(null);
      setRejectReason("");
      fetchMaps();
    } catch (err) {
      alert("Failed to reject map");
      console.error("Reject error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterChange = (updaters: Array<() => void>) => {
    updaters.forEach((fn) => fn());
    setCurrentPage(1);
  };

  const getMapStatusLabel = (status: MapStatusEnum) => {
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

  const getMapStatusColor = (status: MapStatusEnum) => {
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
            Challenge Maps
          </h1>
          <p style={{ color: "var(--text-2)" }}>View and manage all challenge maps</p>
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

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) =>
            handleFilterChange([
              () =>
                setFilterStatus(
                  e.target.value === "" ? "" : (Number(e.target.value) as MapStatusEnum),
                ),
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
          <option value="">All Statuses</option>
          <option value="0">Draft</option>
          <option value="1">Pending Review</option>
          <option value="2">Approved</option>
          <option value="3">Rejected</option>
          <option value="4">Published</option>
        </select>

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
        {(searchTerm || filterStatus !== "" || filterDifficulty !== "") && (
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

                      {/* Approve */}
                      {map.mapStatus === 1 && (
                        <button
                          onClick={() => handleOpenApproveModal(map.id, map.title)}
                          disabled={actionLoading}
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
                          title="Approve Map"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}

                      {/* Reject */}
                      {map.mapStatus === 1 && (
                        <button
                          onClick={() => handleOpenRejectModal(map.id, map.title)}
                          disabled={actionLoading}
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
                          title="Reject Map"
                        >
                          <X size={16} />
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

      {/* Map Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Map Details"
        maxWidth="800px"
      >
        {selectedMap && (
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
            {selectedMap.hints.length > 0 && (
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
            {selectedMap.constraints.length > 0 && (
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
                    <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
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
                    <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
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
                    <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
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
                    <div style={{ fontSize: "11px", color: "var(--text-2)", marginBottom: "4px" }}>
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
                  Map ID
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
                  Spec Version
                </div>
                <div style={{ fontSize: "11px", color: "var(--text)" }}>
                  v{selectedMap.activeSpec.version}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Map Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve Map"
        maxWidth="500px"
      >
        {selectedMapForAction && (
          <form
            onSubmit={handleApprove}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <p style={{ color: "var(--text)", fontSize: "14px", marginBottom: "16px" }}>
                Are you sure you want to approve <strong>"{selectedMapForAction.title}"</strong>?
              </p>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Review Note (Optional)
              </label>
              <textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
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
                }}
                placeholder="Add a review note (optional)"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
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
                Cancel
              </button>
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
                {actionLoading ? "Approving..." : "Approve Map"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reject Map Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Map"
        maxWidth="500px"
      >
        {selectedMapForAction && (
          <form
            onSubmit={handleReject}
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div>
              <p style={{ color: "var(--text)", fontSize: "14px", marginBottom: "16px" }}>
                Are you sure you want to reject <strong>"{selectedMapForAction.title}"</strong>?
              </p>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "var(--text)",
                  marginBottom: "8px",
                }}
              >
                Rejection Reason (Optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
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
                }}
                placeholder="Add a rejection reason (optional)"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "flex-end",
                paddingTop: "16px",
                borderTop: "1px solid var(--border)",
              }}
            >
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
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
                Cancel
              </button>
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
                {actionLoading ? "Rejecting..." : "Reject Map"}
              </button>
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
