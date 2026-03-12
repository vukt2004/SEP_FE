import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import "@/shared/styles/tokens.css";

export default function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [map, setMap] = useState<Map | null>(null);
  const [ownership, setOwnership] = useState<MapOwnershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMap = useCallback(async () => {
    if (!id) {
      setError("Map ID not found");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load map details
      const mapResponse = await learnerMapsApi.getMapById(id, true);
      if (mapResponse.data.isSuccess && mapResponse.data.data) {
        setMap(mapResponse.data.data as unknown as Map);
      } else {
        setError(mapResponse.data.message || "Failed to load map details");
        return;
      }

      // Check ownership
      const ownershipResponse = await learnerMapsApi.checkMapOwnership(id);
      if (ownershipResponse.data.isSuccess && ownershipResponse.data.data) {
        setOwnership(ownershipResponse.data.data);
      } else {
        console.warn("Failed to check map ownership:", ownershipResponse.data.message);
      }
    } catch (err) {
      setError("An error occurred while loading map details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  const handleStartChallenge = () => {
    if (map) {
      navigate(ROUTES.GAME, {
        state: {
          levelId: map.id,
        },
      });
    }
  };

  const handleBuyMap = () => {
    // TODO: Implement purchase flow with OrbitCoin
    console.log("Buy map with OrbitCoin:", map?.id);
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
        return "#10b981";
      case 2:
        return "#f59e0b";
      case 3:
        return "#ef4444";
      default:
        return "#6b7280";
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

  const getWinConditionLabel = (winCondition: number) => {
    switch (winCondition) {
      case 1:
        return "Reach Goal";
      case 2:
        return "Collect All Fruits";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <p style={{ color: "var(--text-2)", fontSize: "16px" }}>Loading map details...</p>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div style={{ padding: "40px 24px" }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            color: "var(--text)",
            cursor: "pointer",
            marginBottom: "20px",
            fontSize: "14px",
          }}
        >
          <ArrowLeft size={18} /> Back
        </button>
        <div
          style={{
            padding: "24px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "12px",
            color: "var(--danger)",
          }}
        >
          {error || "Map not found"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text)",
          cursor: "pointer",
          marginBottom: "24px",
          fontSize: "14px",
        }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "32px",
          alignItems: "start",
        }}
      >
        {/* Left: Image and Quick Info */}
        <div>
          {/* Avatar Image */}
          {map.avatarUrl ? (
            <div
              style={{
                width: "100%",
                height: "300px",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                marginBottom: "24px",
              }}
            >
              <img
                src={map.avatarUrl}
                alt={map.title}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "300px",
                borderRadius: "12px",
                overflow: "hidden",
                backgroundColor: "var(--surface-2)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "24px",
                fontSize: "80px",
              }}
            >
              🗺️
            </div>
          )}

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div
              style={{
                padding: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div style={{ color: "var(--text-2)", fontSize: "12px", marginBottom: "4px" }}>
                Difficulty
              </div>
              <div
                style={{
                  color: getDifficultyColor(map.difficulty),
                  fontSize: "18px",
                  fontWeight: "600",
                }}
              >
                {getDifficultyLabel(map.difficulty)}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div style={{ color: "var(--text-2)", fontSize: "12px", marginBottom: "4px" }}>
                Time Limit
              </div>
              <div style={{ color: "var(--text)", fontSize: "18px", fontWeight: "600" }}>
                {formatTimeLimit(map.timeLimitMs)}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div style={{ color: "var(--text-2)", fontSize: "12px", marginBottom: "4px" }}>
                Type
              </div>
              <div
                style={{
                  color: map.type === "Platform" ? "#1e40af" : "#92400e",
                  fontSize: "18px",
                  fontWeight: "600",
                  backgroundColor: map.type === "Platform" ? "#dbeafe" : "#fef3c7",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  display: "inline-block",
                }}
              >
                {map.type}
              </div>
            </div>

            <div
              style={{
                padding: "16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
              }}
            >
              <div style={{ color: "var(--text-2)", fontSize: "12px", marginBottom: "4px" }}>
                Price
              </div>
              <div style={{ color: "var(--primary)", fontSize: "18px", fontWeight: "600" }}>
                {formatPrice(map.price)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Detailed Information */}
        <div>
          {/* Title */}
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "var(--text)",
              marginBottom: "8px",
            }}
          >
            {map.title}
          </h1>

          {/* Description */}
          <p
            style={{
              color: "var(--text-2)",
              fontSize: "16px",
              lineHeight: "1.6",
              marginBottom: "24px",
            }}
          >
            {map.description}
          </p>

          {/* Win Condition */}
          <div
            style={{
              padding: "16px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                color: "var(--text-2)",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "4px",
              }}
            >
              Win Condition
            </div>
            <div style={{ color: "var(--text)", fontSize: "16px" }}>
              {getWinConditionLabel(map.winCondition)}
            </div>
          </div>

          {/* Tags */}
          {map.tagNames && map.tagNames.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  color: "var(--text)",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                Tags
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {map.tagNames.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "6px 12px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      fontSize: "13px",
                      color: "var(--text-2)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Button - Conditional based on ownership or free published map */}
          {ownership?.isOwned || (map?.isPublished && map?.price === 0) ? (
            <button
              onClick={handleStartChallenge}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              Start Challenge
            </button>
          ) : (
            <button
              onClick={handleBuyMap}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              <Lock size={18} /> Buy this Map with Orbit Coin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
