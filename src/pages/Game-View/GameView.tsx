import { useEffect, useRef, useState } from "react";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import { EngineCommand } from "../../modules/executor/commands";
import type { BlockProgram } from "../../modules/executor/types";
import { StepExecutor } from "../../modules/executor/StepExecutor";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromMockData } from "../../utils/levelLoader";

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[useEffect] GameView useEffect triggered");
    const canvas = canvasRef.current;
    console.log("[useEffect] Canvas ref:", canvas);

    if (!canvas) {
      console.error("[useEffect] Canvas not found! Aborting initialization.");
      return;
    }

    let cleanup: (() => void) | null = null;

    const initGame = async () => {
      try {
        console.log("Starting game initialization...");
        setIsLoading(true);

        // Load level from mock data
        console.log("Loading level: level-tutorial-01");
        const levelDefinition = await loadLevelFromMockData("level-tutorial-01");
        console.log("Level loaded successfully:", levelDefinition.name);

        // Set canvas size based on level dimensions
        const tileSize = 16;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create TopDown game config (no gravity)
        const config = createGameConfig(LevelType.TopDown);
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config);
        engineRef.current = engine;

        // Integrate collision example
        // setupCollisionExample(engine, levelDefinition);

        // Initialize and start engine
        await engine.initialize();
        engine.start();

        // Create sample program with repeat and ifObstacleAhead
        const program: BlockProgram = [
          {
            id: "1",
            type: "repeat",
            times: 100,
            children: [
              {
                id: "2",
                type: "ifObstacleAhead",
                children: [{ id: "2-1", type: "turnLeft" }],
              },
              { id: "3", type: "move" },
            ],
          },
        ];

        const executor = new StepExecutor(program, () => engine.isObstacleAhead());
        executorRef.current = executor;

        // Event listeners
        const handleWin = () => {
          executor.stop();
          alert(`Level Complete! Steps: ${engine.getStepCount()}`);
        };

        const handleObjectStateChanged = (event: EngineEvent) => {
          if (event.type === "objectStateChanged") {
            console.log("Object changed:", event);
          }
        };

        engine.on("win", handleWin);
        engine.on("objectStateChanged", handleObjectStateChanged);

        const handleKeyDown = (e: KeyboardEvent) => {
          switch (e.key) {
            case "ArrowUp":
              engine.executeCommand(EngineCommand.MOVE_FORWARD);
              break;
            case "ArrowLeft":
              engine.executeCommand(EngineCommand.TURN_LEFT);
              break;
            case "ArrowRight":
              engine.executeCommand(EngineCommand.TURN_RIGHT);
              break;
            case " ": // Space key for step-by-step execution
              if (executor.hasNext()) {
                const cmd = executor.next();
                if (cmd) {
                  engine.executeCommand(cmd);
                }
              }
              break;
            case "r":
            case "R": // R key to start auto-run
              executor.run((cmd) => {
                engine.executeCommand(cmd);
              }, 500);
              break;
            case "s":
            case "S": // S key to stop auto-run
              executor.stop();
              break;
            case "e":
            case "E": // E key to interact
              engine.executeCommand(EngineCommand.INTERACT);
              break;
          }
        };

        window.addEventListener("keydown", handleKeyDown);

        setIsLoading(false);

        // Store cleanup function
        cleanup = () => {
          window.removeEventListener("keydown", handleKeyDown);
          engine.off("win", handleWin);
          engine.off("objectStateChanged", handleObjectStateChanged);
          executor.stop();
          engine.stop();
        };

        console.log("Game initialization complete!");
      } catch (err) {
        console.error("Failed to initialize game:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load level";
        console.error("Error details:", errorMessage);
        setError(errorMessage);
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
      <h2>Game View - Tutorial Level</h2>
      <p>
        <strong>Controls:</strong> Arrow keys to move, Space for step execution, R to run, S to
        stop, E to interact
      </p>

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>Loading level...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "20px", color: "red" }}>
          <h3>Error Loading Game</h3>
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
