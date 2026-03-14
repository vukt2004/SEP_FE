// src/portals/learner/pages/MapsPage.tsx
// Browse / play maps page (ex-challenges)
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Search, Clock, Gamepad2 } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import styles from "./MapsPage.module.css";

type DifficultyFilter = "all" | 1 | 2 | 3;
type MapTypeFilter = "all" | "Platform" | "Topdown";

export default function MapsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.badge}>Play & learn</span>
          <h1 className={styles.title}>
            <Gamepad2 size={32} className={styles.titleIcon} aria-hidden />
            Maps
          </h1>
          <p className={styles.subtitle}>Pick a map, play the level, and sharpen your logic.</p>
        </header>

        <AdminPuzzlesSection />
      </div>
    </div>
  );
}

function AdminPuzzlesSection() {
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
          setError(response.data.message || "Failed to load map list");
        }
      } catch (err) {
        setError("An error occurred while loading the map list");
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
    if (map.createdByUserName?.trim()) return `Created by ${map.createdByUserName.trim()}`;
    if (!map.createdByUserId) return "Admin Team";
    return `Created by ${map.createdByUserId.slice(0, 8)}`;
  };

  const filteredMaps = maps.filter((map) => {
    if (mapTypeFilter !== "all" && map.type !== mapTypeFilter) return false;
    return true;
  });

  const getDifficultyClass = (d: number) => {
    if (d === 1) return styles.difficultyEasy;
    if (d === 2) return styles.difficultyMedium;
    if (d === 3) return styles.difficultyHard;
    return "";
  };

  return (
    <div className={styles.section}>
      {loading ? (
        <div className={styles.loading}>Loading maps...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <label className={styles.searchBar} htmlFor="map-search">
              <Search size={18} />
              <input
                id="map-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search maps by name..."
              />
            </label>

            <div className={styles.filtersRow}>
              <select
                className={styles.filterSelect}
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
                className={styles.filterSelect}
                value={mapTypeFilter}
                onChange={(e) => setMapTypeFilter(e.target.value as MapTypeFilter)}
              >
                <option value="all">Type: All</option>
                <option value="Platform">Platformer</option>
                <option value="Topdown">Puzzle / Logic</option>
              </select>
            </div>
          </div>

          <div className={styles.grid}>
            {filteredMaps.map((map) => {
              const cardClass = `${styles.card} ${!map.isPublished ? styles.cardDisabled : ""}`;
              const content = (
                <>
                  {map.avatarUrl ? (
                    <div className={styles.thumb}>
                      <img
                        src={map.avatarUrl}
                        alt={map.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`${styles.thumb} ${styles.thumbPlaceholder}`}>
                      <span>No preview</span>
                    </div>
                  )}

                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{map.title}</h3>
                    <div className={styles.badges}>
                      <span
                        className={`${styles.difficulty} ${getDifficultyClass(map.difficulty)}`}
                      >
                        {getDifficultyLabel(map.difficulty)}
                      </span>
                      <span className={styles.typeBadge}>{getTypeLabel(map.type)}</span>
                    </div>
                  </div>

                  <p className={styles.creator}>{getCreatorLabel(map)}</p>

                  {map.description && <p className={styles.description}>{map.description}</p>}

                  <div className={styles.meta}>
                    <div className={styles.metaItem}>
                      <Clock size={16} />
                      <span>{formatTimeLimit(map.timeLimitMs)}</span>
                    </div>
                  </div>

                  {map.tagNames && map.tagNames.length > 0 && (
                    <div className={styles.tags}>
                      {map.tagNames.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              );
              return map.isPublished ? (
                <Link key={map.id} to={`/app/map/${map.id}`} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <div key={map.id} className={cardClass}>
                  {content}
                </div>
              );
            })}
          </div>

          {filteredMaps.length === 0 && (
            <div className={styles.empty}>
              <p>No matching maps found. Try changing filters or search.</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className={styles.paginationInfo}>
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
