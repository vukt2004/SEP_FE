import React from "react";

interface GameResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isWin: boolean;
  stepCount: number;
  elapsedTime: number;
  fruitsCollected: number;
  onReset: () => void;
  onBackToMenu: () => void;
}

export const GameResultsModal: React.FC<GameResultsModalProps> = ({
  isOpen,
  onClose,
  isWin,
  stepCount,
  elapsedTime,
  fruitsCollected,
  onReset,
  onBackToMenu,
}) => {
  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "40px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.3)",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
            color: "#666",
            padding: "4px 8px",
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "64px", marginBottom: "16px" }}>{isWin ? "🎉" : "😔"}</div>
          <h2
            style={{
              margin: 0,
              fontSize: "32px",
              color: isWin ? "#10b981" : "#ef4444",
              fontWeight: "bold",
            }}
          >
            {isWin ? "Level Complete!" : "Game Over"}
          </h2>
          {!isWin && (
            <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>Try again!</p>
          )}
        </div>

        {/* Results */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Time */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "white",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontSize: "16px", color: "#374151" }}>
                ⏱️ <strong>Time:</strong>
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  fontFamily: "monospace",
                }}
              >
                {formatTime(elapsedTime)}
              </span>
            </div>

            {/* Steps */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "white",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontSize: "16px", color: "#374151" }}>
                👣 <strong>Steps:</strong>
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {stepCount}
              </span>
            </div>

            {/* Fruits */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                backgroundColor: "white",
                borderRadius: "8px",
              }}
            >
              <span style={{ fontSize: "16px", color: "#374151" }}>
                🍎 <strong>Fruits:</strong>
              </span>
              <span
                style={{
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#1f2937",
                }}
              >
                {fruitsCollected}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onReset}
            style={{
              flex: 1,
              padding: "14px 24px",
              backgroundColor: "#f59e0b",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#d97706")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#f59e0b")}
          >
            🔄 Try Again
          </button>
          <button
            onClick={onBackToMenu}
            style={{
              flex: 1,
              padding: "14px 24px",
              backgroundColor: "#4a5568",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#2d3748")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4a5568")}
          >
            ← Menu
          </button>
        </div>
      </div>
    </div>
  );
};
