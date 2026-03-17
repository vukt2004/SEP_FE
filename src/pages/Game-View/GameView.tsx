import { useEffect, useRef, useState, useCallback } from "react";
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
import type { MapConfig } from "../../shared/types/MapSchema";
import type { LevelBlockConstraints } from "../../modules/map-system/types";
import { ROUTES } from "@/lib/constants/routes";
import { GameResultsModal } from "./GameResultsModal";
import { MissionBar } from "./MissionBar";
import { LevelMissionModal } from "./LevelMissionModal";
import { BlockCounter } from "./BlockCounter";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Eraser,
  Send,
  Flag,
  Info,
} from "lucide-react";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import blocksConfig from "../../shared/block/blocks-config.json";

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
  const [mapConfig, setMapConfig] = useState<MapConfig | null>(null);
  const [blockConstraints, setBlockConstraints] = useState<LevelBlockConstraints | null>(null);
  const [collectedFruits, setCollectedFruits] = useState(0);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [audioSystem, setAudioSystem] = useState<
    import("../../modules/engine/systems/audio/AudioSystem").AudioSystem | null
  >(null);
  const [gameResult, setGameResult] = useState<{
    isWin: boolean;
    stepCount: number;
    blocksUsed: number;
    elapsedTime: number;
    fruitsCollected: number;
  } | null>(null);
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const lastRunBlockCountRef = useRef(0);
  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [isLevelStarted, setIsLevelStarted] = useState(false);
  const [levelTitle, setLevelTitle] = useState("Level");
  const [blocksUsed, setBlocksUsed] = useState(0);
  const warningToastTimeoutRef = useRef<number | null>(null);

  // Get level ID and multiplayer room from location state
  const levelId = (location.state as { levelId?: string })?.levelId;
  const levelFile = (location.state as { levelFile?: string })?.levelFile;
  const multiplayerRoomId = (location.state as { multiplayerRoomId?: string })?.multiplayerRoomId;

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const showWarningToast = useCallback((message: string) => {
    setWarningToast(message);
    if (warningToastTimeoutRef.current !== null) {
      window.clearTimeout(warningToastTimeoutRef.current);
    }
    warningToastTimeoutRef.current = window.setTimeout(() => {
      setWarningToast(null);
      warningToastTimeoutRef.current = null;
    }, 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (warningToastTimeoutRef.current !== null) {
        window.clearTimeout(warningToastTimeoutRef.current);
      }
    };
  }, []);

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
        const levelResult = levelId
          ? await loadLevelFromAPI(levelId)
          : await loadLevelFromMockData(levelFile || "level-tutorial-01");

        console.log("Level result loaded:", levelResult);

        // Store map config if available
        if (levelResult.mapConfig) {
          console.log("Setting map config:", levelResult.mapConfig);
          setMapConfig(levelResult.mapConfig as MapConfig);
        } else {
          console.log("No map config in result");
        }

        const levelDefinition = levelResult.level;
        setBlockConstraints(levelDefinition.blockConstraints ?? null);
        setLevelTitle(levelDefinition.name || levelDefinition.id || "Level");
        console.log("Level loaded successfully:", levelDefinition.name || levelDefinition.id);

        // Set canvas size based on level dimensions
        // Using larger tileSize (48) for better visibility
        const tileSize = 48;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;
        setCanvasRenderSize({ width: canvas.width, height: canvas.height });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Determine level type from map config, default to TopDown
        const mapType = levelResult.mapConfig?.type || "topdown";
        const winCondition = levelResult.mapConfig?.winCondition === 2 ? 2 : 1;
        const levelType = mapType === "platform" ? LevelType.Platform : LevelType.TopDown;
        // Convert map type to GameType format
        const gameType = mapType === "platform" ? "platformer" : "topdown";
        console.log(
          "Using level type:",
          levelType,
          "game type:",
          gameType,
          "from map type:",
          mapType,
        );

        // Create game config based on map type
        const config = createGameConfig(levelType, { winCondition });
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config, gameType);
        engineRef.current = engine;

        // Integrate collision example
        // setupCollisionExample(engine, levelDefinition);

        // Initialize and start engine
        await engine.initialize();
        engine.reset();
        setShowMissionModal(true);
        setIsLevelStarted(false);

        // Expose AudioSystem via state so it can be safely used during render
        setAudioSystem(engine.getAudioSystem() ?? null);

        // Event listeners
        const handleWin = () => {
          if (executorRef.current) {
            executorRef.current.stop();
          }
          setIsExecutorRunning(false);

          // Show results modal
          setGameResult({
            isWin: true,
            stepCount: engine.getStepCount(),
            blocksUsed: lastRunBlockCountRef.current,
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };

        const handleFailed = () => {
          if (executorRef.current) {
            executorRef.current.stop();
          }
          setIsExecutorRunning(false);

          // Show results modal
          setGameResult({
            isWin: false,
            stepCount: engine.getStepCount(),
            blocksUsed: lastRunBlockCountRef.current,
            elapsedTime: engine.getElapsedTime(),
            fruitsCollected: engine.getCollectedFruitsCount(),
          });
          setShowResultsModal(true);
        };

        const handleObjectStateChanged = (event: EngineEvent) => {
          if (event.type === "objectStateChanged") {
            console.log("Object changed:", event);
          }
        };

        const handleFruitCollected = (event: EngineEvent) => {
          if (event.type === "fruitCollected") {
            console.log("Fruit collected:", event);
            setCollectedFruits(event.totalCollected);
          }
        };

        const handleWinConditionNotMet = (event: EngineEvent) => {
          if (event.type === "winConditionNotMet") {
            showWarningToast(event.message);
          }
        };

        engine.on("win", handleWin);
        engine.on("engine:failed", handleFailed);
        engine.on("objectStateChanged", handleObjectStateChanged);
        engine.on("fruitCollected", handleFruitCollected);
        engine.on("winConditionNotMet", handleWinConditionNotMet);

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
          engine.off("engine:failed", handleFailed);
          engine.off("objectStateChanged", handleObjectStateChanged);
          engine.off("fruitCollected", handleFruitCollected);
          engine.off("winConditionNotMet", handleWinConditionNotMet);
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
  }, [levelFile, levelId, showWarningToast]); // Include both dependencies

  // Handle workspace ready - memoized to prevent Blockly re-renders
  const handleWorkspaceReady = useCallback((workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
  }, []);

  // Generate program from Blockly and run it
  const handleRunProgram = () => {
    if (!workspaceRef.current || !engineRef.current) {
      alert("Game not ready yet!");
      return;
    }

    if (!isLevelStarted) {
      setShowMissionModal(true);
      return;
    }

    try {
      // Generate AST from Blockly workspace (blocks remain in editor)
      // Note: This only reads the workspace, it does not modify or remove blocks
      const blocksBeforeGeneration = workspaceRef.current.getAllBlocks().length;
      console.log("Blocks in workspace before generation:", blocksBeforeGeneration);

      // Count only learner-placed blocks (exclude Blockly shadow blocks).
      const placedBlocks = workspaceRef.current
        .getAllBlocks(false)
        .filter((block) => !block.isShadow());
      const usedBlocksCount = placedBlocks.length;
      lastRunBlockCountRef.current = usedBlocksCount;

      const blockUsage = placedBlocks.reduce<Record<string, number>>((acc, block) => {
        acc[block.type] = (acc[block.type] ?? 0) + 1;
        return acc;
      }, {});

      const constraintsValidation = engineRef.current.validateBlockUsage(blockUsage);
      if (!constraintsValidation.isValid) {
        showWarningToast(constraintsValidation.message || "Block constraints are not satisfied.");
        return;
      }

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
          case "wallLeft":
            return engine.isObstacleLeft();
          case "wallRight":
            return engine.isObstacleRight();
          case "goalReached":
            return engine.hasWon();
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
      executor.setWarningCallback((message) => {
        showWarningToast(message);
      });
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

  const handleStartLevel = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.start();
    setIsLevelStarted(true);
    setShowMissionModal(false);
  };

  const blockTypeLabelMap = new Map(blocksConfig.blocks.map((block) => [block.type, block.label]));
  const toBlockLabel = (type: string) => blockTypeLabelMap.get(type) || type;

  const missionGoal = mapConfig?.winCondition === 2 ? "Collect All Fruits" : "Reach Goal";
  const requiredBlocks = (blockConstraints?.requiredBlocks ?? []).map((rule) => {
    const label = toBlockLabel(rule.type);
    return rule.minCount > 1 ? `${label} x${rule.minCount}` : label;
  });
  const forbiddenBlocks = (blockConstraints?.bannedBlocks ?? []).map((type) => toBlockLabel(type));

  // Multiplayer: listen RankingUpdated, GameEnded
  useEffect(() => {
    if (!multiplayerRoomId) return;
    let unsubRank: (() => void) | undefined;
    let unsubEnd: (() => void) | undefined;
    gameLobbyHub.connect().then(() => {
      unsubRank = gameLobbyHub.on("RankingUpdated", (ranking: unknown) => {
        const arr = Array.isArray(ranking) ? ranking : [];
        if (arr.length === 0 || !multiplayerRoomId) return;
        const normalized = arr.map((r: Record<string, unknown>) => ({
          playerId: String(r.playerId ?? r.PlayerId ?? ""),
          score: Number(r.score ?? r.Score ?? 0),
          rank: Number(r.rank ?? r.Rank ?? 0),
          status: String(r.status ?? r.Status ?? ""),
        }));
        navigate(ROUTES.LEARNER_ROOM_RESULT, {
          state: { ranking: normalized, roomId: multiplayerRoomId },
        });
      });
      unsubEnd = gameLobbyHub.on("GameEnded", () => {
        navigate(ROUTES.LEARNER_LEARN);
      });
    });
    return () => {
      unsubRank?.();
      unsubEnd?.();
    };
  }, [multiplayerRoomId, navigate]);

  const handleMultiplayerSubmit = async () => {
    if (!multiplayerRoomId || !workspaceRef.current || submitLoading || submitted) return;
    setSubmitLoading(true);
    try {
      const program = generateAST(workspaceRef.current);
      const astSpec = JSON.stringify(program);
      const res = await learnerLobbyApi.submitSolution(multiplayerRoomId, {
        language: "Blockly",
        astSpec,
      });
      if (res.data?.isSuccess) {
        setSubmitted(true);
        if (res.data?.data?.rankingIfAllSubmitted?.length && multiplayerRoomId) {
          const ranking = res.data.data.rankingIfAllSubmitted.map((r) => ({
            playerId: r.playerId,
            score: r.score,
            rank: r.rank,
            status: r.status,
          }));
          navigate(ROUTES.LEARNER_ROOM_RESULT, { state: { ranking, roomId: multiplayerRoomId } });
          return;
        }
      } else {
        window.alert(res.data?.message ?? "Submit failed.");
      }
    } catch {
      window.alert("Submit failed.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleEndMultiplayerGame = async () => {
    if (!multiplayerRoomId) return;
    try {
      await learnerLobbyApi.endGame(multiplayerRoomId);
      navigate(ROUTES.LEARNER_LEARN);
    } catch {
      window.alert("Could not end game.");
    }
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
      {warningToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "16px",
            right: "16px",
            zIndex: 1000,
            maxWidth: "420px",
            padding: "12px 14px",
            borderRadius: "12px",
            background: "color-mix(in srgb, var(--warning) 88%, black 12%)",
            color: "#ffffff",
            border: "1px solid color-mix(in srgb, var(--warning) 80%, black 20%)",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.24)",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {warningToast}
        </div>
      )}

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
          onClick={() =>
            navigate(multiplayerRoomId ? ROUTES.LEARNER_LEARN : ROUTES.LEARNER_MAPS_BROWSE)
          }
          style={controlButtonStyle("neutral", false, hoveredControl === "back")}
          onMouseEnter={() => setHoveredControl("back")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <ArrowLeft size={15} /> {multiplayerRoomId ? "Leave" : "Back to Maps"}
        </button>

        {multiplayerRoomId && (
          <>
            <button
              onClick={handleMultiplayerSubmit}
              disabled={isLoading || !!error || submitLoading || submitted}
              style={controlButtonStyle(
                "primary",
                isLoading || !!error || submitLoading || submitted,
                hoveredControl === "submit",
              )}
              onMouseEnter={() => setHoveredControl("submit")}
              onMouseLeave={() => setHoveredControl(null)}
            >
              <Send size={15} /> {submitted ? "Submitted" : "Submit solution"}
            </button>
            <button
              onClick={handleEndMultiplayerGame}
              style={controlButtonStyle("warning", false, hoveredControl === "end")}
              onMouseEnter={() => setHoveredControl("end")}
              onMouseLeave={() => setHoveredControl(null)}
            >
              <Flag size={15} /> End game
            </button>
          </>
        )}

        <button
          onClick={handleRunProgram}
          disabled={isLoading || !!error || isExecutorRunning || !isLevelStarted}
          style={controlButtonStyle(
            "primary",
            isLoading || !!error || isExecutorRunning || !isLevelStarted,
            hoveredControl === "run",
          )}
          onMouseEnter={() => setHoveredControl("run")}
          onMouseLeave={() => setHoveredControl(null)}
        >
          <Play size={15} /> Run Program
        </button>

        <button
          onClick={handleStepExecution}
          disabled={isLoading || !!error || isExecutorRunning || !isLevelStarted}
          style={controlButtonStyle(
            "primary",
            isLoading || !!error || isExecutorRunning || !isLevelStarted,
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

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)" }}>
          <p>Loading level...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: "20px", color: "var(--danger)" }}>
          <h3>Error Loading Game</h3>
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
            flex: isCompactLayout ? "1 1 auto" : "6 1 0",
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
            {/* <div
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
            </div> */}
            <div style={{ minWidth: "120px" }}>
              <GameTimer engineRef={engineRef} isLoading={isLoading} error={error} />
            </div>

            <button
              onClick={() => setShowMissionModal(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "color-mix(in srgb, var(--primary) 18%, var(--surface))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)";
              }}
            >
              <Info size={14} /> Mission
            </button>

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
            {/* <div
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
            </div> */}
          </div>

          <MissionBar
            goal={missionGoal}
            blockLimit={blockConstraints?.blockLimit ?? null}
            requiredBlocks={requiredBlocks}
            forbiddenBlocks={forbiddenBlocks}
          />

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
                Game View - Block Programming
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
            flex: isCompactLayout ? "1 1 auto" : "4 1 0",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            width: isCompactLayout ? "100%" : "min(42vw, 560px)",
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
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
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
            <BlockCounter used={blocksUsed} limit={blockConstraints?.blockLimit ?? null} />
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
            <BlocklyWorkspace
              onWorkspaceReady={handleWorkspaceReady}
              bannedBlockTypes={blockConstraints?.bannedBlocks ?? []}
              blockLimit={blockConstraints?.blockLimit ?? null}
              onConstraintViolation={showWarningToast}
              onBlockCountChange={setBlocksUsed}
            />
          </div>
        </div>
      </div>

      <LevelMissionModal
        isOpen={showMissionModal && !isLoading && !error}
        levelTitle={levelTitle}
        goal={missionGoal}
        blockLimit={blockConstraints?.blockLimit ?? null}
        requiredBlocks={requiredBlocks}
        forbiddenBlocks={forbiddenBlocks}
        onStart={handleStartLevel}
        onClose={handleStartLevel}
      />

      {/* Game Results Modal */}
      {gameResult && (
        <GameResultsModal
          isOpen={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          isWin={gameResult.isWin}
          stepCount={gameResult.stepCount}
          blocksUsed={gameResult.blocksUsed}
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
