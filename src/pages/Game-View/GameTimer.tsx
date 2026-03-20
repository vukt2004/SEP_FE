import React, { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../../modules/engine/core/GameEngine";

interface GameTimerProps {
  engineRef: React.RefObject<GameEngine | null>;
  isLoading: boolean;
  error: string | null;
  resetSignal?: number;
  onElapsedTimeChange?: (seconds: number) => void;
}

const GameTimer: React.FC<GameTimerProps> = ({
  engineRef,
  isLoading,
  error,
  resetSignal = 0,
  onElapsedTimeChange,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const previousEngineElapsedRef = useRef(0);
  const carriedElapsedRef = useRef(0);

  useEffect(() => {
    if (isLoading || error) {
      previousEngineElapsedRef.current = 0;
      carriedElapsedRef.current = 0;
      setElapsedTime(0);
      onElapsedTimeChange?.(0);
    }
  }, [isLoading, error, onElapsedTimeChange]);

  useEffect(() => {
    previousEngineElapsedRef.current = 0;
    carriedElapsedRef.current = 0;
    setElapsedTime(0);
    onElapsedTimeChange?.(0);
  }, [resetSignal, onElapsedTimeChange]);

  // Update timer every 200ms when game is loaded
  useEffect(() => {
    if (isLoading || error) return;

    const timerInterval = setInterval(() => {
      if (engineRef.current) {
        const newTime = engineRef.current.getElapsedTime();

        // Detect engine reset (elapsed time drops) and keep a running total.
        if (newTime + 0.1 < previousEngineElapsedRef.current) {
          carriedElapsedRef.current += previousEngineElapsedRef.current;
        }

        previousEngineElapsedRef.current = newTime;
        const totalElapsed = carriedElapsedRef.current + newTime;
        onElapsedTimeChange?.(totalElapsed);

        // Only update if time actually changed (avoid unnecessary re-renders)
        setElapsedTime((prevTime) => {
          const timeDiff = Math.abs(totalElapsed - prevTime);
          return timeDiff > 0.05 ? totalElapsed : prevTime; // Update only if changed by > 0.05s
        });
      }
    }, 200); // Update every 200ms

    return () => clearInterval(timerInterval);
  }, [isLoading, error, engineRef, onElapsedTimeChange]);

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
