// src/portals/learner/pages/ChallengesPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpDown } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import "@/shared/styles/tokens.css";
import "@/shared/styles/challenges.css";

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("Title");
  const [sortAscending, setSortAscending] = useState(true);

  useEffect(() => {
    loadMaps();
  }, [currentPage, selectedDifficulty, sortBy, sortAscending]);

  const loadMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await learnerMapsApi.getMaps({
        pageNumber: currentPage,
        pageSize: 20,
        publishedOnly: true,
        difficulty: selectedDifficulty,
        search: searchQuery || undefined,
        sortBy,
        sortAscending,
      });

      if (response.data.isSuccess && response.data.data) {
        setMaps(response.data.data.items);
        setTotalPages(response.data.data.totalPages);
      } else {
        setError(response.data.message || "Failed to load maps");
      }
    } catch (err) {
      setError("An error occurred while loading maps");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page when searching
    loadMaps();
  };

  const handleSelectMap = (map: Map) => {
    // Navigate to game view with the selected map ID
    navigate(ROUTES.GAME, {
      state: {
        levelId: map.id,
      },
    });
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
        return "difficulty-easy";
      case 2:
        return "difficulty-medium";
      case 3:
        return "difficulty-hard";
      default:
        return "";
    }
  };

  const formatTimeLimit = (timeLimitMs: number) => {
    if (timeLimitMs === 0) return "No limit";
    const minutes = Math.floor(timeLimitMs / 60000);
    const seconds = Math.floor((timeLimitMs % 60000) / 1000);
    if (minutes === 0) return `${seconds}s`;
    if (seconds === 0) return `${minutes}m`;
    return `${minutes}m ${seconds}s`;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "Free";
    return `${price.toLocaleString("vi-VN")} VND`;
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortBy(field);
      setSortAscending(true);
    }
  };

  if (loading) {
    return (
      <div className="challenges-page">
        <div className="container">
          <div className="challenges-loading">Loading maps...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="challenges-page">
        <div className="container">
          <div className="challenges-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="challenges-page">
      <div className="container">
        <div className="challenges-header">
          <h1 className="challenges-title">Browse Maps</h1>
          <p className="challenges-subtitle">Choose your map and start coding!</p>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "1.5rem", display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, maxWidth: "500px" }}>
            <Search
              size={20}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search maps by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              style={{
                width: "100%",
                padding: "10px 16px 10px 44px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "14px",
              }}
            />
          </div>
          <button
            className="btn btnPrimary"
            onClick={handleSearch}
            style={{ whiteSpace: "nowrap" }}
          >
            Search
          </button>
        </div>

        {/* Sort Controls */}
        <div style={{ marginBottom: "1rem", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>Sort by:</span>
          <button
            className={`filter-btn ${sortBy === "Title" ? "active" : ""}`}
            onClick={() => toggleSort("Title")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            Title
            {sortBy === "Title" && (
              <ArrowUpDown
                size={14}
                style={{ transform: sortAscending ? "rotate(0deg)" : "rotate(180deg)" }}
              />
            )}
          </button>
          <button
            className={`filter-btn ${sortBy === "Difficulty" ? "active" : ""}`}
            onClick={() => toggleSort("Difficulty")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            Difficulty
            {sortBy === "Difficulty" && (
              <ArrowUpDown
                size={14}
                style={{ transform: sortAscending ? "rotate(0deg)" : "rotate(180deg)" }}
              />
            )}
          </button>
          <button
            className={`filter-btn ${sortBy === "CreatedAt" ? "active" : ""}`}
            onClick={() => toggleSort("CreatedAt")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            Date
            {sortBy === "CreatedAt" && (
              <ArrowUpDown
                size={14}
                style={{ transform: sortAscending ? "rotate(0deg)" : "rotate(180deg)" }}
              />
            )}
          </button>
        </div>

        <div className="challenges-filters">
          <button
            className={`filter-btn ${selectedDifficulty === undefined ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(undefined)}
          >
            All
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 1 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(1)}
          >
            Easy
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 2 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(2)}
          >
            Medium
          </button>
          <button
            className={`filter-btn ${selectedDifficulty === 3 ? "active" : ""}`}
            onClick={() => setSelectedDifficulty(3)}
          >
            Hard
          </button>
        </div>

        <div className="challenges-grid">
          {maps.map((map) => (
            <div key={map.id} className="card challenge-card">
              <div className="challenge-header">
                <h3 className="challenge-title">{map.title}</h3>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600",
                      backgroundColor: map.type === "Platform" ? "#dbeafe" : "#fef3c7",
                      color: map.type === "Platform" ? "#1e40af" : "#92400e",
                    }}
                  >
                    {map.type}
                  </span>
                  <span className={`challenge-difficulty ${getDifficultyColor(map.difficulty)}`}>
                    {getDifficultyLabel(map.difficulty)}
                  </span>
                </div>
              </div>

              <p className="challenge-description">{map.description}</p>

              <div className="challenge-meta">
                <div className="meta-item">
                  <svg className="meta-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M10 5V10L13 13M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{formatTimeLimit(map.timeLimitMs)}</span>
                </div>

                <div className="meta-item">
                  <svg className="meta-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>{formatPrice(map.price)}</span>
                </div>
              </div>

              {map.tagNames && map.tagNames.length > 0 && (
                <div className="challenge-tags">
                  {map.tagNames.map((tag, idx) => (
                    <span key={idx} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="challenge-actions">
                <button
                  className="btn btnPrimary"
                  onClick={() => handleSelectMap(map)}
                  disabled={!map.isPublished}
                >
                  {map.isPublished ? "Start Challenge" : "Coming Soon"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {maps.length === 0 && !loading && (
          <div className="challenges-empty">
            <p>No maps found matching your criteria.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="challenges-pagination">
            <button
              className="btn btnSecondary"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btnSecondary"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
