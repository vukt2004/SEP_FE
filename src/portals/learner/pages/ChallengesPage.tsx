// src/portals/learner/pages/ChallengesPage.tsx
// Challenges page: 2 sections (Admin Challenges | Collection)
// Admin section has Test tab, uses getMaps API
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookMarked, Search } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import "@/shared/styles/tokens.css";
import "@/shared/styles/challenges.css";

type MainSection = "admin" | "collection";
type DifficultyFilter = "all" | 1 | 2 | 3;
type MapTypeFilter = "all" | "Platform" | "Topdown";

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [mainSection, setMainSection] = useState<MainSection>("admin");

  return (
    <div className="challenges-page">
      <div className="container">
        <div className="challenges-header">
          <h1 className="challenges-title">Challenges</h1>
        </div>

        {/* 2 main sections */}
        <div className="challenges-main-tabs">
          <button
            type="button"
            className={`main-tab-btn ${mainSection === "admin" ? "active" : ""}`}
            onClick={() => setMainSection("admin")}
          >
            <Shield size={20} />
            <span>Admin Challenges</span>
          </button>
          <button
            type="button"
            className={`main-tab-btn ${mainSection === "collection" ? "active" : ""}`}
            onClick={() => setMainSection("collection")}
          >
            <BookMarked size={20} />
            <span>Collection</span>
          </button>
        </div>

        {mainSection === "admin" && <AdminPuzzlesSection navigate={navigate} />}
        {mainSection === "collection" && <CollectionPlaceholder />}
      </div>
    </div>
  );
}

function AdminPuzzlesSection({ navigate }: { navigate: (path: string) => void }) {
  const [activeTab, setActiveTab] = useState<"test">("test");
  const [maps, setMaps] = useState<Map[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("all");
  const [mapTypeFilter, setMapTypeFilter] = useState<MapTypeFilter>("all");

  const loadMaps = useCallback(
    async (overridePage?: number) => {
      const page = overridePage ?? currentPage;
      try {
        setLoading(true);
        setError(null);
        const response = await learnerMapsApi.getMaps({
          pageNumber: page,
          pageSize: 20,
          publishedOnly: true,
          search: searchTerm.trim() || undefined,
          difficulty: difficultyFilter === "all" ? undefined : difficultyFilter,
        });

        if (response.data.isSuccess && response.data.data) {
          setMaps(response.data.data.items);
          setTotalPages(response.data.data.totalPages);
          if (overridePage != null) setCurrentPage(overridePage);
        } else {
          setError(response.data.message || "Unable to load challenge list");
        }
      } catch (err) {
        setError("An error occurred while loading challenges");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [currentPage, searchTerm, difficultyFilter],
  );

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, difficultyFilter, mapTypeFilter]);

  const handleSelectMap = (map: Map) => {
    navigate(`/app/map/${map.id}`);
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
        return "—";
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
    if (seconds === 0) return `${minutes}p`;
    return `${minutes}p ${seconds}s`;
  };

  const getTypeLabel = (type: Map["type"]) => {
    switch (type) {
      case "Platform":
        return "Platformer";
      case "Topdown":
        return "Puzzle / Logic";
      default:
        return type;
    }
  };

  const getCreatorLabel = (map: Map) => {
    if (!map.createdByUserId) return "Admin Team";
    return `Created by ${map.createdByUserId.slice(0, 8)}`;
  };

  const filteredMaps = maps.filter((map) => {
    if (mapTypeFilter !== "all" && map.type !== mapTypeFilter) return false;
    return true;
  });

  return (
    <div className="admin-puzzles-section">
      <div className="admin-sub-tabs">
        <button
          type="button"
          className={`sub-tab-btn ${activeTab === "test" ? "active" : ""}`}
          onClick={() => setActiveTab("test")}
        >
          Test
        </button>
      </div>

      {activeTab === "test" && (
        <>
          {loading ? (
            <div className="challenges-loading">Loading challenges...</div>
          ) : error ? (
            <div className="challenges-error">{error}</div>
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                  Test Lesson
                </h2>
                <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                  Browse levels in the Test lesson and choose one to start playing.
                </p>
              </div>

              <div className="challenges-toolbar">
                <label className="search-bar" htmlFor="map-search">
                  <Search size={18} />
                  <input
                    id="map-search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search maps by name..."
                  />
                </label>

                <div className="filters-row">
                  <select
                    className="filter-select"
                    value={difficultyFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDifficultyFilter(value === "all" ? "all" : (Number(value) as 1 | 2 | 3));
                    }}
                  >
                    <option value="all">Difficulty: All</option>
                    <option value={1}>Easy</option>
                    <option value={2}>Medium</option>
                    <option value={3}>Hard</option>
                  </select>

                  <select
                    className="filter-select"
                    value={mapTypeFilter}
                    onChange={(e) => setMapTypeFilter(e.target.value as MapTypeFilter)}
                  >
                    <option value="all">Type: All</option>
                    <option value="Platform">Platformer</option>
                    <option value="Topdown">Puzzle / Logic</option>
                  </select>
                </div>
              </div>

              <div className="challenges-grid">
                {filteredMaps.map((map) => (
                  <div key={map.id} className="card challenge-card">
                    {map.avatarUrl && (
                      <div className="challenge-thumb">
                        <img
                          src={map.avatarUrl}
                          alt={map.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {!map.avatarUrl && (
                      <div className="challenge-thumb challenge-thumb-placeholder">
                        <span>NO PREVIEW</span>
                      </div>
                    )}

                    <div className="challenge-header">
                      <h3 className="challenge-title">{map.title}</h3>
                      <div className="challenge-badges">
                        <span
                          className={`challenge-difficulty ${getDifficultyColor(map.difficulty)}`}
                        >
                          {getDifficultyLabel(map.difficulty)}
                        </span>
                        <span className="challenge-type-badge">{getTypeLabel(map.type)}</span>
                      </div>
                    </div>

                    <p className="challenge-creator">{getCreatorLabel(map)}</p>

                    <p className="challenge-description">{map.description}</p>

                    <div className="challenge-meta">
                      <div className="meta-item">
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
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
                    </div>

                    {map.tagNames?.length > 0 && (
                      <div className="challenge-tags">
                        {map.tagNames.slice(0, 4).map((tag, idx) => (
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
                        {map.isPublished ? "Play Map" : "Sắp ra mắt"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredMaps.length === 0 && (
                <div className="challenges-empty">
                  <p>No matching challenges found.</p>
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
                    Page {currentPage} / {totalPages}
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
            </>
          )}
        </>
      )}
    </div>
  );
}

function CollectionPlaceholder() {
  return (
    <div className="collection-placeholder">
      <BookMarked size={64} style={{ color: "var(--muted)", marginBottom: 16 }} />
      <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
        Collection
      </h3>
    </div>
  );
}
