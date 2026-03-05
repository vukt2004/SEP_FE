import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import type { LevelMapItem } from "../../types/api/cms/maps";
import "../../shared/styles/tokens.css";

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    backgroundColor: "var(--bg)",
    padding: "32px",
  },
  maxWidth: {
    maxWidth: "1440px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "48px",
  },
  title: {
    fontSize: "48px",
    fontWeight: "bold",
    color: "var(--text)",
    marginBottom: "16px",
  },
  subtitle: {
    color: "var(--text-2)",
    fontSize: "18px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "24px",
  },
  card: {
    backgroundColor: "var(--surface)",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    transform: "scale(1)",
    transition: "all 300ms ease",
    border: "1px solid var(--border)",
  } as React.CSSProperties,
  cardHeader: {
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    padding: "24px",
    textAlign: "center",
  } as React.CSSProperties,
  typeIcon: {
    fontSize: "48px",
    marginBottom: "8px",
  },
  typeLabel: {
    color: "white",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  } as React.CSSProperties,
  cardContent: {
    padding: "24px",
  },
  cardTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "var(--text)",
    marginBottom: "16px",
  },
  difficultyContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  levelId: {
    fontSize: "13px",
    color: "var(--text-2)",
    marginBottom: "16px",
    fontFamily: "monospace",
  },
  playButton: {
    width: "100%",
    background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
    color: "white",
    fontWeight: "bold",
    padding: "12px 24px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    transition: "all 300ms ease",
    fontSize: "16px",
  } as React.CSSProperties,
  backButton: {
    backgroundColor: "var(--surface-2)",
    color: "var(--text)",
    fontWeight: "bold",
    padding: "12px 32px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    cursor: "pointer",
    transition: "all 300ms ease",
    fontSize: "16px",
  } as React.CSSProperties,
  loadingError: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "var(--bg)",
  },
  loadingText: {
    color: "var(--text)",
    fontSize: "24px",
  },
  errorText: {
    color: "var(--danger)",
    fontSize: "20px",
  },
  backButtonContainer: {
    textAlign: "center",
    marginTop: "48px",
  } as React.CSSProperties,
};

const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case "1":
      return "var(--success)";
    case "2":
      return "var(--warning)";
    case "3":
      return "var(--accent)";
    case "4":
      return "var(--danger)";
    default:
      return "var(--text-2)";
  }
};

const getDifficultyLabel = (difficulty: string): string => {
  switch (difficulty) {
    case "1":
      return "Easy";
    case "2":
      return "Medium";
    case "3":
      return "Hard";
    case "4":
      return "Expert";
    default:
      return "Unknown";
  }
};

const getTypeIcon = (type: string): string => {
  return type === "platform" ? "🎮" : "🎯";
};

export default function GameMenu() {
  const [levels, setLevels] = useState<LevelMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadLevels = async () => {
      try {
        setIsLoading(true);
        // Fetch level maps from API
        const response = await cmsMapsApi.getLevelMaps({
          pageNumber: 1,
          pageSize: 100, // Get all levels
        });

        // API returns PaginationResult<LevelMapItem> directly in response.data
        if (response.data.isSuccess && response.data.items) {
          const items = response.data.items;
          setLevels(items);
        } else {
          throw new Error(response.data.message || "Failed to load levels");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Failed to load levels:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadLevels();
  }, []);

  const handleLevelSelect = (level: LevelMapItem) => {
    // Navigate to appropriate game view based on level type
    const route = level.type === "platform" ? "/platform" : "/game";
    // Use the level ID directly
    navigate(route, { state: { levelId: level.id } });
  };

  if (isLoading) {
    return (
      <div style={styles.loadingError}>
        <div style={styles.loadingText}>Loading levels...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingError}>
        <div style={styles.errorText}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Game Levels</h1>
          <p style={styles.subtitle}>Choose a level to start playing</p>
        </div>

        {/* Level Grid */}
        <div style={styles.grid}>
          {levels.map((level) => (
            <div
              key={level.id}
              onClick={() => handleLevelSelect(level)}
              style={styles.card}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            >
              {/* Level Type Icon */}
              <div style={styles.cardHeader}>
                <div style={styles.typeIcon}>{getTypeIcon(level.type)}</div>
                <div style={styles.typeLabel}>{level.type}</div>
              </div>

              {/* Level Info */}
              <div style={styles.cardContent}>
                <h3 style={styles.cardTitle}>{level.name}</h3>

                {/* Difficulty Badge */}
                <div style={styles.difficultyContainer}>
                  <span
                    style={{
                      padding: "6px 12px",
                      borderRadius: "9999px",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: "600",
                      backgroundColor: getDifficultyColor(level.difficulty),
                    }}
                  >
                    {getDifficultyLabel(level.difficulty)}
                  </span>
                </div>

                {/* Level ID
                <div style={styles.levelId}>
                  Level ID: <span style={{ fontFamily: "monospace" }}>{level.id}</span>
                </div> */}

                {/* Play Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLevelSelect(level);
                  }}
                  style={styles.playButton}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "0.9";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.opacity = "1";
                  }}
                >
                  Play Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div style={styles.backButtonContainer}>
          <button
            onClick={() => navigate("/")}
            style={styles.backButton}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-2)";
            }}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
