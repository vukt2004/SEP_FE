import React, { useEffect, useRef, useState } from "react";
import type { GameEngine } from "../../modules/engine/core/GameEngine";

interface GameTimerProps {
  engineRef: React.RefObject<GameEngine | null>;
  isLoading: boolean;
  error: string | null;
  resetSignal?: number;
  onElapsedTimeChange?: (seconds: number) => void;
  compact?: boolean;
  isActive?: boolean;
}

const GameTimer: React.FC<GameTimerProps> = ({
  engineRef,
  isLoading,
  error,
  resetSignal = 0,
  onElapsedTimeChange,
  compact = false,
  isActive = true,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const previousEngineElapsedRef = useRef(0);
  const carriedElapsedRef = useRef(0);
  const wallStartMsRef = useRef<number | null>(null);
  const engineSyncedToWallRef = useRef(false);

  useEffect(() => {
    if (isLoading || error || !isActive) {
      previousEngineElapsedRef.current = 0;
      carriedElapsedRef.current = 0;
      wallStartMsRef.current = null;
      engineSyncedToWallRef.current = false;
      setElapsedTime(0);
      onElapsedTimeChange?.(0);
    }
  }, [isLoading, error, isActive, onElapsedTimeChange]);

  useEffect(() => {
    previousEngineElapsedRef.current = 0;
    carriedElapsedRef.current = 0;
    wallStartMsRef.current = null;
    engineSyncedToWallRef.current = false;
    setElapsedTime(0);
    onElapsedTimeChange?.(0);
  }, [resetSignal, onElapsedTimeChange]);

  // Update timer every 200ms while gameplay is active
  useEffect(() => {
    if (isLoading || error || !isActive) return;

    // If the engine hasn't started yet, keep a fallback timer so UI doesn't show "0:00".
    // Once engine time starts moving, we sync engine elapsed to the wall timer (no jump backwards).
    if (wallStartMsRef.current === null) {
      wallStartMsRef.current = Date.now();
    }

    const timerInterval = setInterval(() => {
      const now = Date.now();
      const wallStartMs = wallStartMsRef.current ?? now;
      const wallElapsedSec = Math.max(0, (now - wallStartMs) / 1000);

      if (!engineRef.current) return;

      const newTime = engineRef.current.getElapsedTime();

      // Detect engine reset (elapsed time drops) and keep a running total.
      if (newTime + 0.1 < previousEngineElapsedRef.current) {
        carriedElapsedRef.current += previousEngineElapsedRef.current;
        // Engine reset => we consider it in sync with wall again.
        engineSyncedToWallRef.current = false;
      }

      const engineAdvanced = newTime > previousEngineElapsedRef.current + 0.05;

      // First time engine starts advancing: sync carried offset so timer continues smoothly.
      if (engineAdvanced && !engineSyncedToWallRef.current) {
        carriedElapsedRef.current = wallElapsedSec - newTime;
        engineSyncedToWallRef.current = true;
      }

      previousEngineElapsedRef.current = newTime;

      const totalElapsed = engineSyncedToWallRef.current
        ? carriedElapsedRef.current + newTime
        : wallElapsedSec;

      onElapsedTimeChange?.(totalElapsed);

      // Only update if time actually changed (avoid unnecessary re-renders)
      setElapsedTime((prevTime) => {
        const timeDiff = Math.abs(totalElapsed - prevTime);
        return timeDiff > 0.05 ? totalElapsed : prevTime; // Update only if changed by > 0.05s
      });
    }, 200); // Update every 200ms

    return () => clearInterval(timerInterval);
  }, [isLoading, error, isActive, engineRef, onElapsedTimeChange]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <span style={{ fontSize: "14px", fontWeight: 800, color: "inherit" }}>
        {formatTime(elapsedTime)}
      </span>
    );
  }

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
