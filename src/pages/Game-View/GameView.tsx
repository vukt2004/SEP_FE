import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import type { BlockProgram, ConditionType } from "../../modules/executor/types";
import { StepExecutor } from "../../modules/executor/StepExecutor";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromAPI, loadLevelFromMockData } from "../../utils/levelLoader";
import BlocklyWorkspace from "../../tools/block-editor/components/BlocklyWorkspace";
import { generateAST } from "../../tools/block-editor/blocks/registerGenerators";

export default function GameView() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutorRunning, setIsExecutorRunning] = useState(false);

  // Get level ID from location state
  const levelId = (location.state as { levelId?: string })?.levelId;
  const levelFile = (location.state as { levelFile?: string })?.levelFile;

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

        // Load level from API or fallback to mock data
        console.log("Loading level:", levelId || levelFile);
        const levelDefinition = levelId
          ? await loadLevelFromAPI(levelId)
          : await loadLevelFromMockData(levelFile || "level-tutorial-01");
        console.log("Level loaded successfully:", levelDefinition.name);

        // Set canvas size based on level dimensions
        // Using larger tileSize (48) for better visibility
        const tileSize = 48;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Create TopDown game config (no gravity)
        const config = createGameConfig(LevelType.TopDown);
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config, "topdown");
        engineRef.current = engine;

        // Integrate collision example
        // setupCollisionExample(engine, levelDefinition);

        // Initialize and start engine
        await engine.initialize();
        engine.start();

        // Event listeners
        const handleWin = () => {
          if (executorRef.current) {
            executorRef.current.stop();
          }
          setIsExecutorRunning(false);
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
          const executor = executorRef.current;

          switch (e.key) {
            case " ": // Space key for step-by-step execution
              if (executor && executor.hasNext()) {
                const result = executor.next();
                if (result) {
                  engine.executeCommand(result.command);
                }
              }
              break;
            case "s":
            case "S": // S key to stop auto-run
              if (executor) {
                executor.stop();
                setIsExecutorRunning(false);
              }
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
          if (executorRef.current) {
            executorRef.current.stop();
          }
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
  }, [levelFile]);

  // Handle workspace ready
  const handleWorkspaceReady = (workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
  };

  // Generate program from Blockly and run it
  const handleRunProgram = () => {
    if (!workspaceRef.current || !engineRef.current) {
      alert("Game not ready yet!");
      return;
    }

    try {
      // Generate AST from Blockly workspace (blocks remain in editor)
      // Note: This only reads the workspace, it does not modify or remove blocks
      const blocksBeforeGeneration = workspaceRef.current.getAllBlocks().length;
      console.log("Blocks in workspace before generation:", blocksBeforeGeneration);

      const program: BlockProgram = generateAST(workspaceRef.current);

      const blocksAfterGeneration = workspaceRef.current.getAllBlocks().length;
      console.log("Blocks in workspace after generation:", blocksAfterGeneration);

      if (program.length === 0) {
        alert("No blocks in workspace! Add some blocks first.");
        return;
      }

      console.log("Generated program:", program);

      // Create condition checker that delegates to engine
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

      // Stop existing executor if running
      if (executorRef.current) {
        executorRef.current.stop();
      }

      // Create new executor with the generated program
      const executor = new StepExecutor(program, conditionChecker);
      executorRef.current = executor;

      // Run the executor
      setIsExecutorRunning(true);
      executor.run((result) => {
        const engine = engineRef.current;
        if (engine) {
          engine.executeCommand(result.command);
          // TODO: Highlight block with result.blockId
        }
      }, 500);
    } catch (err) {
      console.error("Failed to run program:", err);
      alert("Error running program: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  // Stop program execution
  const handleStopProgram = () => {
    if (executorRef.current) {
      executorRef.current.stop();
      setIsExecutorRunning(false);
    }
  };

  // Reset game and executor
  const handleReset = () => {
    // Stop and reset executor
    if (executorRef.current) {
      executorRef.current.stop();
      executorRef.current.reset();
    }

    // Reset game engine to initial state
    if (engineRef.current) {
      try {
        engineRef.current.reset();
        // Restart the engine
        engineRef.current.start();
      } catch (err) {
        console.error("Error resetting engine:", err);
        // Fallback: reload page
        window.location.reload();
      }
    }

    setIsExecutorRunning(false);
  };

  return (
    <div style={{ padding: "20px", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={() => navigate("/game-menu")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#4a5568",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to Menu
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

      <h2 style={{ margin: "0 0 10px 0" }}>Game View - Block Programming</h2>
      <p style={{ margin: "0 0 20px 0", fontSize: "14px", color: "#666" }}>
        <strong>Controls:</strong> Space for step execution, S to stop
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
        <div style={{ flex: "0 0 auto" }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Game</h3>
          <canvas
            ref={canvasRef}
            style={{
              border: "2px solid #333",
              display: "block",
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
    </div>
  );
}
