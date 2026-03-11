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
import type { Map } from "@/types/api/learner/maps";
import { Eye, Plus, Search } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export const MyMapsPage: React.FC = () => {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleViewDetails = async (mapId: string) => {
    // Navigate to map editor or view
    navigate(ROUTES.MAP_EDITOR, { state: { mapId } });
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
                          title="Edit Map"
                        >
                          <Eye size={16} />
                        </button>
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
    </div>
  );
};

export default MyMapsPage;
