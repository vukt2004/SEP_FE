import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import type { BlockProgram, ConditionType } from "../../modules/executor/types";
import { StepExecutor } from "../../modules/executor/StepExecutor";
import type { Direction } from "../../modules/engine/core/types";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromAPI, loadLevelFromMockData } from "../../utils/levelLoader";
import BlocklyWorkspace from "../../tools/block-editor/components/BlocklyWorkspace";
import { generateAST } from "../../tools/block-editor/blocks/registerGenerators";
import { ROUTES } from "@/lib/constants/routes";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
import { GameResultsModal } from "./GameResultsModal";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";

/**
 * PlatformGameView - Platformer game view with block editor and gravity physics.
 *
 * Keyboard controls (manual):
 * - Arrow Left/Right: Move horizontally
 * - Space: Jump
 *
 * Block editor controls:
 * - Run Program: Execute the block program
 * - Stop: Stop execution
 * - Reset: Reset game and executor
 */
export default function PlatformGameView() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutorRunning, setIsExecutorRunning] = useState(false);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

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

        // Always use Platform level type for this view
        const mapType = levelResult.mapConfig?.type || "platform";
        const levelType = mapType === "platform" ? LevelType.Platform : LevelType.TopDown;
        const gameType = mapType === "platform" ? "platformer" : "topdown";

        const config = createGameConfig(levelType);
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config, gameType);
        engineRef.current = engine;

        await engine.initialize();
        engine.start();

        setAudioSystem(engine.getAudioSystem() ?? null);

        // Win event
        const handleWin = () => {
          if (executorRef.current) executorRef.current.stop();
          setIsExecutorRunning(false);
          setGameResult({
            isWin: true,
            stepCount: engine.getStepCount(),
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };
        engine.on("win", handleWin);

        // Failed event
        const handleFailed = () => {
          if (executorRef.current) executorRef.current.stop();
          setIsExecutorRunning(false);
          setGameResult({
            isWin: false,
            stepCount: engine.getStepCount(),
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };
        engine.on("engine:failed", handleFailed);

        // Fruit collection event
        const handleFruitCollected = (event: EngineEvent) => {
          if (event.type === "fruitCollected") {
            setCollectedFruits(event.totalCollected);
          }
        };
        engine.on("fruitCollected", handleFruitCollected);

        // Keyboard controls (manual play, secondary to block editor)
        const handleKeyDown = (e: KeyboardEvent) => {
          // If executor is running, ignore manual key input
          if (executorRef.current?.getState().isRunning) return;

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

        cleanup = () => {
          window.removeEventListener("keydown", handleKeyDown);
          engine.off("win", handleWin);
          engine.off("engine:failed", handleFailed);
          engine.off("fruitCollected", handleFruitCollected);
          if (executorRef.current) executorRef.current.stop();
          engine.stop();
        };
      } catch (err) {
        console.error("Failed to initialize platform game:", err);
        setError(err instanceof Error ? err.message : "Failed to load level");
        setIsLoading(false);
      }
    };

    initGame();
    return () => {
      if (cleanup) cleanup();
    };
  }, [levelId, levelFile]);

  // Handle Blockly workspace ready
  const handleWorkspaceReady = useCallback((workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
  }, []);

  // Run blocks program
  const handleRunProgram = () => {
    if (!workspaceRef.current || !engineRef.current) {
      alert("Game not ready yet!");
      return;
    }

    try {
      const program: BlockProgram = generateAST(workspaceRef.current);
      if (program.length === 0) {
        alert("No blocks in workspace! Add some blocks first.");
        return;
      }

      // Condition checker delegates to engine
      const conditionChecker = (condition: ConditionType): boolean => {
        const engine = engineRef.current;
        if (!engine) return false;
        switch (condition) {
          case "pathAhead":
            return !engine.isObstacleAhead();
          case "wallAhead":
            return engine.isObstacleAhead();
          case "obstacleAhead":
            return engine.isObstacleAhead();
          default:
            return false;
        }
      };

      // Stop any running executor first
      if (executorRef.current) executorRef.current.stop();

      const executor = new StepExecutor(program, conditionChecker);
      executorRef.current = executor;

      setIsExecutorRunning(true);
      executor.run((result) => {
        const engine = engineRef.current;
        if (engine) {
          engine.executeCommand(result.command);
        }
      }, 500);
    } catch (err) {
      console.error("Failed to run program:", err);
      alert("Error running program: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStopProgram = () => {
    if (executorRef.current) {
      executorRef.current.stop();
      setIsExecutorRunning(false);
    }
  };

  const handleReset = () => {
    if (executorRef.current) {
      executorRef.current.stop();
      executorRef.current.reset();
    }
    if (engineRef.current) {
      try {
        engineRef.current.reset();
        engineRef.current.start();
      } catch (err) {
        console.error("Error resetting engine:", err);
        window.location.reload();
      }
    }
    setIsExecutorRunning(false);
    setCollectedFruits(0);
    setShowResultsModal(false);
  };

  return (
    <div style={{ padding: "20px", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top toolbar */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
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
          onClick={handleRunProgram}
          disabled={isLoading || !!error || isExecutorRunning}
          style={{
            padding: "8px 16px",
            backgroundColor: isExecutorRunning ? "#9ca3af" : "#10b981",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isExecutorRunning ? "not-allowed" : "pointer",
          }}
        >
          ▶ Run Program
        </button>

        <button
          onClick={handleStopProgram}
          disabled={!isExecutorRunning}
          style={{
            padding: "8px 16px",
            backgroundColor: isExecutorRunning ? "#ef4444" : "#9ca3af",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isExecutorRunning ? "pointer" : "not-allowed",
          }}
        >
          ⏹ Stop
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

      {/* Header row with stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 10px 0" }}>Platform Game — Block Programming</h2>
          <p style={{ margin: 0, fontSize: "14px", color: "#666" }}>
            <strong>Manual:</strong> Arrow keys to move, Space to jump (disabled while program runs)
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <GameTimer engineRef={engineRef} isLoading={isLoading} error={error} />
          <div
            style={{
              padding: "12px 20px",
              backgroundColor: "#fef3c7",
              borderRadius: "8px",
              border: "2px solid #fbbf24",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#92400e" }}>
              🍎 Fruits Collected: {collectedFruits}
            </div>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>Loading platform level...</p>
        </div>
      )}

      {/* Error state */}
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

      {/* Main content: canvas + block editor side by side */}
      <div
        style={{
          display: isLoading || error ? "none" : "flex",
          gap: "20px",
          flex: 1,
          minHeight: 0,
          position: "relative",
        }}
      >
        {/* Game Canvas */}
        <div style={{ flex: "0 0 auto", position: "relative" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Game</h3>
          <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
          <canvas
            ref={canvasRef}
            style={{
              border: "2px solid #333",
              display: "block",
              marginTop: "10px",
            }}
          />
        </div>

        {/* Blockly Editor */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <h3 style={{ margin: "0 0 10px 0", flex: "0 0 auto" }}>Block Editor</h3>
          <div
            style={{
              flex: 1,
              border: "2px solid #333",
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <BlocklyWorkspace onWorkspaceReady={handleWorkspaceReady} />
          </div>
        </div>
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
