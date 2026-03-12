import React, { useState, useEffect } from "react";
import type { GameEngine } from "../../modules/engine/core/GameEngine";

interface GameTimerProps {
  engineRef: React.RefObject<GameEngine | null>;
  isLoading: boolean;
  error: string | null;
}

const GameTimer: React.FC<GameTimerProps> = ({ engineRef, isLoading, error }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update timer every 200ms when game is loaded
  useEffect(() => {
    if (isLoading || error) return;

    const timerInterval = setInterval(() => {
      if (engineRef.current) {
        const newTime = engineRef.current.getElapsedTime();
        // Only update if time actually changed (avoid unnecessary re-renders)
        setElapsedTime((prevTime) => {
          const timeDiff = Math.abs(newTime - prevTime);
          return timeDiff > 0.05 ? newTime : prevTime; // Update only if changed by > 0.05s
        });
      }
    }, 200); // Update every 200ms

    return () => clearInterval(timerInterval);
  }, [isLoading, error, engineRef]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        padding: "12px 20px",
        backgroundColor: "#dbeafe",
        borderRadius: "8px",
        border: "2px solid #3b82f6",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e3a8a" }}>
        ⏱️ Time: {formatTime(elapsedTime)}
      </div>
    </div>
  );
};

// Memoize to prevent unnecessary re-renders
export default React.memo(GameTimer);
