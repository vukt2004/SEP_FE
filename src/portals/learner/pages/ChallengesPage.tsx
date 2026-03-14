// src/portals/learner/pages/ChallengesPage.tsx
// Trang Câu đố: 2 phần (Câu đố của quản trị viên | Ải sưu tầm)
// Phần quản trị viên có tab Test, dùng API getMaps như cũ
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, BookMarked } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import "@/shared/styles/tokens.css";
import "@/shared/styles/challenges.css";

type MainSection = "admin" | "collection";

export default function ChallengesPage() {
  const navigate = useNavigate();
  const [mainSection, setMainSection] = useState<MainSection>("admin");

  return (
    <div className="challenges-page">
      <div className="container">
        <div className="challenges-header">
          <h1 className="challenges-title">Maps</h1>
        </div>

        {/* 2 phần chính */}
        <div className="challenges-main-tabs">
          <button
            type="button"
            className={`main-tab-btn ${mainSection === "admin" ? "active" : ""}`}
            onClick={() => setMainSection("admin")}
          >
            <Shield size={20} />
            <span>Admin maps</span>
          </button>
          <button
            type="button"
            className={`main-tab-btn ${mainSection === "collection" ? "active" : ""}`}
            onClick={() => setMainSection("collection")}
          >
            <BookMarked size={20} />
            <span>Collected maps</span>
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
        });

        if (response.data.isSuccess && response.data.data) {
          setMaps(response.data.data.items);
          setTotalPages(response.data.data.totalPages);
          if (overridePage != null) setCurrentPage(overridePage);
        } else {
          setError(response.data.message || "Failed to load map list");
        }
      } catch (err) {
        setError("An error occurred while loading the map list");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [currentPage],
  );

  useEffect(() => {
    loadMaps();
  }, [loadMaps]);

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
        return "-";
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
            <div className="challenges-loading">Loading maps...</div>
          ) : error ? (
            <div className="challenges-error">{error}</div>
          ) : (
            <>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                  Test maps
                </h2>
                <p style={{ margin: "4px 0 0", color: "var(--text-2)", fontSize: 14 }}>
                  List of maps belonging to the Test category. Please select a map to start.
                </p>
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
                        <span
                          className={`challenge-difficulty ${getDifficultyColor(map.difficulty)}`}
                        >
                          {getDifficultyLabel(map.difficulty)}
                        </span>
                      </div>
                    </div>

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
                        {map.isPublished ? "View details" : "Coming soon"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {maps.length === 0 && (
                <div className="challenges-empty">
                  <p>No matching maps found.</p>
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
        Collected maps
      </h3>
    </div>
  );
}
