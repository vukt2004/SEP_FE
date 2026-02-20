import { useEffect, useRef, useState } from "react";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import { EngineCommand } from "../../modules/executor/commands";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromMockData } from "../../utils/levelLoader";

/**
 * PlatformGameView - Test view for platformer levels with gravity
 *
 * Controls:
 * - Arrow Left/Right: Move horizontally
 * - Arrow Up/Down: Face up/down (for future jump/climb mechanics)
 *
 * Physics:
 * - Gravity automatically pulls player down
 * - Player falls tile-by-tile until reaching solid ground
 */
export default function PlatformGameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[useEffect] PlatformGameView useEffect triggered");
    const canvas = canvasRef.current;
    console.log("[useEffect] Canvas ref:", canvas);

    if (!canvas) {
      console.error("[useEffect] Canvas not found! Aborting initialization.");
      return;
    }

    let cleanup: (() => void) | null = null;

    const initGame = async () => {
      try {
        setIsLoading(true);

        // Load platform level from mock data
        const levelDefinition = await loadLevelFromMockData("level-platform-01");

        // Set canvas size based on level dimensions
        const tileSize = 16;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create Platform game config (with gravity)
        const config = createGameConfig(LevelType.Platform);
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config);
        engineRef.current = engine;

        // Initialize and start
        await engine.initialize();
        engine.start();

        // Event listener for win condition
        const handleWin = () => {
          alert(`Platform Complete! Steps: ${engine.getStepCount()}`);
        };
        engine.on("win", handleWin);

        // Keyboard controls
        const handleKeyDown = (e: KeyboardEvent) => {
          switch (e.key) {
            case "ArrowLeft":
              engine.executeCommand(EngineCommand.TURN_LEFT);
              engine.executeCommand(EngineCommand.MOVE_FORWARD);
              break;
            case "ArrowRight":
              engine.executeCommand(EngineCommand.TURN_RIGHT);
              engine.executeCommand(EngineCommand.MOVE_FORWARD);
              break;
            case "ArrowUp":
              // Face up (for future jump or climb mechanics)
              engine.executeCommand(EngineCommand.TURN_LEFT);
              engine.executeCommand(EngineCommand.TURN_LEFT);
              break;
            case "ArrowDown":
              // Face down
              engine.executeCommand(EngineCommand.TURN_RIGHT);
              engine.executeCommand(EngineCommand.TURN_RIGHT);
              break;
          }
        };

        window.addEventListener("keydown", handleKeyDown);

        setIsLoading(false);

        // Store cleanup function
        cleanup = () => {
          window.removeEventListener("keydown", handleKeyDown);
          engine.off("win", handleWin);
          engine.stop();
        };
      } catch (err) {
        console.error("Failed to initialize platform game:", err);
        setError(err instanceof Error ? err.message : "Failed to load level");
        setIsLoading(false);
      }
    };

    initGame();

    // Return cleanup function for useEffect
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Platform Game View (with Gravity)</h2>
      <p>
        <strong>Controls:</strong> Arrow keys to move left/right. Player will fall with gravity.
      </p>

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>Loading platform level...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "20px", color: "red" }}>
          <h3>Error Loading Platform Game</h3>
          <p>{error}</p>
          <p style={{ fontSize: "12px", marginTop: "10px" }}>
            Check browser console (F12) for more details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: "10px", padding: "8px 16px" }}
          >
            Retry
          </button>
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          border: "2px solid #333",
          display: isLoading || error ? "none" : "block",
          marginTop: "10px",
        }}
      />
    </div>
  );
}
