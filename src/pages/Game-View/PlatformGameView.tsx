import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import type { Direction } from "../../modules/engine/core/types";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromAPI, loadLevelFromMockData } from "../../utils/levelLoader";
import { ROUTES } from "@/lib/constants/routes";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
import { GameResultsModal } from "./GameResultsModal";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";

/**
 * PlatformGameView - Test view for platformer levels with gravity
 *
 * Controls:
 * - Arrow Left/Right: Move horizontally
 * - Space: Jump
 * - Arrow Up/Down: Face up/down (for future climb mechanics)
 *
 * Physics:
 * - Gravity automatically pulls player down
 * - Player falls tile-by-tile until reaching solid ground
 * - Player can jump when on solid ground
 */
export default function PlatformGameView() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectedFruits, setCollectedFruits] = useState(0);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [audioSystem, setAudioSystem] = useState<
    import("../../modules/engine/systems/audio/AudioSystem").AudioSystem | null
  >(null);
  const [gameResult, setGameResult] = useState<{
    isWin: boolean;
    stepCount: number;
    elapsedTime: number;
    fruitsCollected: number;
  } | null>(null);

  // Get level ID from location state
  const levelId = (location.state as { levelId?: string })?.levelId;
  const levelFile = (location.state as { levelFile?: string })?.levelFile;

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

        // Load level from API or fallback to mock data
        const levelResult = levelId
          ? await loadLevelFromAPI(levelId)
          : await loadLevelFromMockData(levelFile || "level-platform-01");

        const levelDefinition = levelResult.level;

        // Set canvas size based on level dimensions
        const tileSize = 48;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Determine level type from map config, default to Platform
        const mapType = levelResult.mapConfig?.type || "platform";
        const levelType = mapType === "platform" ? LevelType.Platform : LevelType.TopDown;
        // Convert map type to GameType format
        const gameType = mapType === "platform" ? "platformer" : "topdown";

        // Create game config based on map type
        const config = createGameConfig(levelType);
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config, gameType);
        engineRef.current = engine;

        // Initialize and start
        await engine.initialize();
        engine.start();

        // Expose AudioSystem via state so it can be safely used during render
        setAudioSystem(engine.getAudioSystem() ?? null);

        // Event listener for win condition
        const handleWin = () => {
          setGameResult({
            isWin: true,
            stepCount: engine.getStepCount(),
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };
        engine.on("win", handleWin);

        // Event listener for failure
        const handleFailed = () => {
          setGameResult({
            isWin: false,
            stepCount: engine.getStepCount(),
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };
        engine.on("engine:failed", handleFailed);

        // Event listener for fruit collection
        const handleFruitCollected = (event: EngineEvent) => {
          if (event.type === "fruitCollected") {
            console.log("Fruit collected:", event);
            setCollectedFruits(event.totalCollected);
          }
        };
        engine.on("fruitCollected", handleFruitCollected);

        // Keyboard controls
        const handleKeyDown = (e: KeyboardEvent) => {
          let direction: Direction | null = null;

          switch (e.key) {
            case "ArrowLeft":
              direction = "left";
              break;
            case "ArrowRight":
              direction = "right";
              break;
            case "ArrowUp":
              direction = "up";
              break;
            case "ArrowDown":
              direction = "down";
              break;
            case " ":
              e.preventDefault();
              engine.executeCommand({ type: "jump" });
              return;
            default:
              return;
          }

          if (direction) {
            engine.executeCommand({ type: "move", direction });
          }
        };

        window.addEventListener("keydown", handleKeyDown);

        setIsLoading(false);

        // Store cleanup function
        cleanup = () => {
          window.removeEventListener("keydown", handleKeyDown);
          engine.off("win", handleWin);
          engine.off("engine:failed", handleFailed);
          engine.off("fruitCollected", handleFruitCollected);
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
  }, [levelId, levelFile]);

  const handleReset = () => {
    if (engineRef.current) {
      engineRef.current.reset();
      engineRef.current.start();
    }
    setCollectedFruits(0);
    setShowResultsModal(false);
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => navigate(ROUTES.LEARNER_CHALLENGES)}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4a5568",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to Challenges
        </button>
        <button
          onClick={handleReset}
          disabled={isLoading || !!error}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f59e0b",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🔄 Reset
        </button>
      </div>
      <h2>Platform Game View (with Gravity)</h2>
      <p>
        <strong>Controls:</strong> Arrow Left/Right to move, Space to jump. Player will fall with
        gravity.
      </p>

      {!isLoading && !error && (
        <div style={{ display: "flex", gap: "12px", marginTop: "10px", marginBottom: "10px" }}>
          <GameTimer engineRef={engineRef} isLoading={isLoading} error={error} />
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#fef3c7",
              borderRadius: "8px",
              border: "2px solid #fbbf24",
              display: "inline-block",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#92400e" }}>
              🍎 Fruits Collected: {collectedFruits}
            </div>
          </div>
        </div>
      )}

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

      <div style={{ position: "relative", display: "inline-block" }}>
        <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
        <canvas
          ref={canvasRef}
          style={{
            border: "2px solid #333",
            display: isLoading || error ? "none" : "block",
            marginTop: "10px",
          }}
        />
      </div>

      {/* Game Results Modal */}
      {gameResult && (
        <GameResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          isWin={gameResult.isWin}
          stepCount={gameResult.stepCount}
          elapsedTime={gameResult.elapsedTime}
          fruitsCollected={gameResult.fruitsCollected}
          onReset={() => {
            setShowResultsModal(false);
            handleReset();
          }}
          onBackToMenu={() => navigate(ROUTES.LEARNER_CHALLENGES)}
        />
      )}
    </div>
  );
}
