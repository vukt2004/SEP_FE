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
import { ArrowLeft, Play, Pause, RotateCcw, SkipForward, Eraser } from "lucide-react";
import type { MapConfig } from "../../shared/types/MapSchema";

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
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
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
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");

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

        if (levelResult.mapConfig) {
          setMapConfig(levelResult.mapConfig as MapConfig);
        }

        const levelDefinition = levelResult.level;

        // Set canvas size based on level dimensions
        const tileSize = 48;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;
        setCanvasRenderSize({ width: canvas.width, height: canvas.height });

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

  const handleStepExecution = () => {
    const executor = executorRef.current;
    const engine = engineRef.current;

    if (!executor || !engine) {
      alert("Run Program first, then use Step Execution.");
      return;
    }

    if (executor.hasNext()) {
      const result = executor.next();
      if (result) {
        engine.executeCommand(result.command);
      }
    } else {
      setIsExecutorRunning(false);
    }
  };

  const handleClearBlocks = () => {
    if (!workspaceRef.current) return;
    if (!confirm("Clear all blocks in the workspace?")) return;
    workspaceRef.current.clear();
  };

  useEffect(() => {
    const updateLayout = () => setIsCompactLayout(window.innerWidth < 1280);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  useEffect(() => {
    const viewport = canvasViewportRef.current;
    if (!viewport || canvasRenderSize.width === 0 || canvasRenderSize.height === 0) return;

    const computeScale = () => {
      if (zoomMode === "actual") {
        setCanvasScale(1);
        return;
      }

      const availableWidth = viewport.clientWidth - 8;
      const availableHeight = viewport.clientHeight - 8;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const widthRatio = availableWidth / canvasRenderSize.width;
      const heightRatio = availableHeight / canvasRenderSize.height;
      const nextScale = Math.min(1, widthRatio, heightRatio);
      setCanvasScale(Math.max(0.1, nextScale));
    };

    computeScale();

    const resizeObserver = new ResizeObserver(computeScale);
    resizeObserver.observe(viewport);

    window.addEventListener("resize", computeScale);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", computeScale);
    };
  }, [canvasRenderSize, zoomMode]);

  const controlButtonStyle = (
    variant: "neutral" | "primary" | "danger" | "warning",
    disabled: boolean,
    hovered: boolean,
  ): React.CSSProperties => {
    const palette = {
      neutral: { bg: "var(--surface-2)", text: "var(--text)", border: "var(--border)" },
      primary: { bg: "var(--primary)", text: "#ffffff", border: "var(--primary)" },
      danger: { bg: "var(--danger)", text: "#ffffff", border: "var(--danger)" },
      warning: { bg: "var(--warning)", text: "#ffffff", border: "var(--warning)" },
    }[variant];

    return {
      display: "inline-flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 14px",
      borderRadius: "12px",
      border: `1px solid ${palette.border}`,
      backgroundColor: disabled ? "var(--muted)" : palette.bg,
      color: disabled ? "var(--text-2)" : palette.text,
      cursor: disabled ? "not-allowed" : "pointer",
      fontSize: "13px",
      fontWeight: 700,
      transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
      boxShadow: hovered && !disabled ? "0 10px 20px rgba(15, 23, 42, 0.2)" : "none",
      transform: hovered && !disabled ? "translateY(-1px)" : "translateY(0)",
      filter: hovered && !disabled ? "brightness(1.03)" : "none",
    };
  };

  return (
    <div
      style={{
        padding: "16px",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        background: "radial-gradient(1200px 600px at 10% -10%, var(--surface-2) 0%, var(--bg) 45%)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          padding: "12px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--surface) 90%, transparent)",
          backdropFilter: "blur(4px)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <button
          onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
          style={controlButtonStyle("neutral", false, hoveredControl === "back")}
          onMouseEnter={() => setHoveredControl("back")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <ArrowLeft size={15} /> Back to Maps
        </button>

        <button
          onClick={handleRunProgram}
          disabled={isLoading || !!error || isExecutorRunning}
          style={controlButtonStyle(
            "primary",
            isLoading || !!error || isExecutorRunning,
            hoveredControl === "run",
          )}
          onMouseEnter={() => setHoveredControl("run")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <Play size={15} /> Run Program
        </button>

        <button
          onClick={handleStepExecution}
          disabled={isLoading || !!error || isExecutorRunning}
          style={controlButtonStyle(
            "primary",
            isLoading || !!error || isExecutorRunning,
            hoveredControl === "step",
          )}
          onMouseEnter={() => setHoveredControl("step")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <SkipForward size={15} /> Step Execution
        </button>

        <button
          onClick={handleStopProgram}
          disabled={!isExecutorRunning}
          style={controlButtonStyle("danger", !isExecutorRunning, hoveredControl === "stop")}
          onMouseEnter={() => setHoveredControl("stop")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <Pause size={15} /> Stop
        </button>

        <button
          onClick={handleReset}
          disabled={isLoading || !!error}
          style={controlButtonStyle("warning", isLoading || !!error, hoveredControl === "reset")}
          onMouseEnter={() => setHoveredControl("reset")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)" }}>
          <p>Loading platform level...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "20px", color: "var(--danger)" }}>
          <h3>Error Loading Platform Game</h3>
          <p>{error}</p>
          <p style={{ fontSize: "12px", marginTop: "10px" }}>
            Check browser console (F12) for more details.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "10px",
              padding: "8px 16px",
              border: "1px solid var(--danger)",
              background: "transparent",
              color: "var(--text)",
              borderRadius: "10px",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content: canvas + block editor side by side */}
      <div
        style={{
          display: isLoading || error ? "none" : "flex",
          flexDirection: isCompactLayout ? "column" : "row",
          gap: "14px",
          flex: 1,
          minHeight: 0,
          position: "relative",
        }}
      >
        <div
          style={{
            flex: isCompactLayout ? "1 1 auto" : "7 1 0",
            minHeight: 0,
            borderRadius: "18px",
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                background: "color-mix(in srgb, var(--info) 18%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--info) 50%, var(--border))",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              ⏱ Time
            </div>
            <div style={{ minWidth: "120px" }}>
              <GameTimer engineRef={engineRef} isLoading={isLoading} error={error} />
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                background: "color-mix(in srgb, var(--warning) 18%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--warning) 45%, var(--border))",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              🍎 Fruits: {collectedFruits}
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "12px",
                background: "color-mix(in srgb, var(--primary) 18%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--primary) 45%, var(--border))",
                fontSize: "13px",
                fontWeight: 700,
                color: "var(--text)",
              }}
            >
              🎯 {mapConfig?.winCondition === 1 ? "Reach Goal" : "Collect All Fruits"}
            </div>
          </div>

          <div
            style={{
              padding: "12px 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: "18px", color: "var(--text)" }}>
                Platform Game - Block Programming
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    display: "inline-flex",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "var(--surface-2)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setZoomMode("fit")}
                    style={{
                      border: "none",
                      padding: "6px 10px",
                      background: zoomMode === "fit" ? "var(--primary)" : "transparent",
                      color: zoomMode === "fit" ? "#fff" : "var(--text-2)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomMode("actual")}
                    style={{
                      border: "none",
                      borderLeft: "1px solid var(--border)",
                      padding: "6px 10px",
                      background: zoomMode === "actual" ? "var(--primary)" : "transparent",
                      color: zoomMode === "actual" ? "#fff" : "var(--text-2)",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    100%
                  </button>
                </div>
                <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: "16px",
                border: "1px solid var(--border)",
                boxShadow:
                  "inset 0 0 0 1px rgba(255,255,255,0.5), 0 10px 24px rgba(15, 23, 42, 0.14)",
                background: "linear-gradient(180deg, var(--surface-2), var(--surface))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                overflow: zoomMode === "fit" ? "hidden" : "auto",
                transition: "box-shadow 0.2s ease, transform 0.2s ease",
              }}
              ref={canvasViewportRef}
            >
              <canvas
                ref={canvasRef}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  display: "block",
                  background: "var(--surface)",
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.22)",
                  width: `${Math.round(canvasRenderSize.width * canvasScale)}px`,
                  height: `${Math.round(canvasRenderSize.height * canvasScale)}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            flex: isCompactLayout ? "1 1 auto" : "3 1 0",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            borderRadius: "18px",
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
            boxShadow: "0 14px 30px rgba(15, 23, 42, 0.12)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: "16px" }}>Block Editor</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-2)" }}>
                Palette is on the left, workspace is on the right.
              </p>
            </div>
            <button
              onClick={handleClearBlocks}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid color-mix(in srgb, var(--danger) 50%, var(--border))",
                background: "color-mix(in srgb, var(--danger) 16%, var(--surface))",
                color: "var(--text)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Clear all blocks"
            >
              <Eraser size={14} /> Clear Blocks
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text)",
                background: "color-mix(in srgb, var(--primary) 20%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--primary) 40%, var(--border))",
                borderRadius: "999px",
                padding: "4px 10px",
              }}
            >
              Movement
            </span>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--text)",
                background: "color-mix(in srgb, var(--accent) 20%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--accent) 40%, var(--border))",
                borderRadius: "999px",
                padding: "4px 10px",
              }}
            >
              Control
            </span>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
              position: "relative",
              background: "var(--surface)",
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
          onBackToMenu={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
        />
      )}
    </div>
  );
}
