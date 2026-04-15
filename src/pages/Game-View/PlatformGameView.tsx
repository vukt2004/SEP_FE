import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import { EngineState, GameEngine } from "../../modules/engine/core/GameEngine";
import type {
  BlockProgram,
  ConditionType,
  LastRemovedItem,
  PositionResolver,
  RuntimeVariables,
} from "../../modules/executor/types";
import { StepExecutor } from "../../modules/executor/StepExecutor";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";
import { loadLevelFromAPI, loadLevelFromMockData } from "../../utils/levelLoader";
import type { MapLevelItem } from "../../types/api/learner/maps";
import BlocklyWorkspace from "../../tools/block-editor/components/BlocklyWorkspace";
import { generateAST } from "../../tools/block-editor/blocks/registerGenerators";
import { ROUTES } from "@/lib/constants/routes";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
import { GameResultsModal } from "./GameResultsModal";
import { ExecutionIncompleteModal } from "./ExecutionIncompleteModal";
import { TrapFailedModal } from "./TrapFailedModal";
import { LevelMissionModal } from "./LevelMissionModal";
import { BlockCounter } from "./BlockCounter";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";
import { HintModal, type GameplayHint } from "./HintModal";
import { StatusDetailsModal } from "./StatusDetailsModal";
import { RunDecisionModal } from "./RunDecisionModal";
import { ArrowLeft, Play, Pause, RotateCcw, SkipForward, Eraser, Send, Flag } from "lucide-react";
import type { MapConfig } from "../../shared/types/MapSchema";
import type { LevelBlockConstraints } from "../../modules/map-system/types";
import blocksConfig from "../../shared/block/blocks-config.json";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { AlertToast } from "@/shared/components/AlertToast";
import { useTranslation } from "@/lib/i18n/translations";
import { leaveLobbyRoom } from "@/lib/lobby/leaveLobbyRoom";
import { markCampaignLevelCompleted, markCampaignLevelStarted } from "@/lib/game/campaignProgress";

/**
 * PlatformGameView - Platformer game view with block editor and gravity physics.
 *
 * Block editor controls:
 * - Run Program: Execute the block program
 * - Stop: Stop execution
 * - Reset: Reset game and executor
 */
export default function PlatformGameView() {
  const { t } = useTranslation();
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
  const [blockConstraints, setBlockConstraints] = useState<LevelBlockConstraints | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsDockVisible, setResultsDockVisible] = useState(false);
  const historyRecordedRef = useRef(false);
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
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    score: number | null;
    stars: number | null;
    status: string | null;
    message: string | null;
  } | null>(null);
  const submitRunRef = useRef<((options?: { skipConfirm?: boolean }) => Promise<void>) | null>(
    null,
  );
  const [hoveredControl, setHoveredControl] = useState<string | null>(null);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const lastRunBlockCountRef = useRef(0);
  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");
  const [warningToast, setWarningToast] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<string>("");
  const [, setLastSubmissionId] = useState<string | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showExecutionIncompleteModal, setShowExecutionIncompleteModal] = useState(false);
  const [showTrapFailedModal, setShowTrapFailedModal] = useState(false);
  const [showStatusDetailsModal, setShowStatusDetailsModal] = useState(false);
  const [isLevelStarted, setIsLevelStarted] = useState(false);
  const [levelTitle, setLevelTitle] = useState("Level");
  const [blocksUsed, setBlocksUsed] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [hints, setHints] = useState<GameplayHint[]>([]);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [showDoorKeyHints, setShowDoorKeyHints] = useState(true);
  const [showResultPopup, setShowResultPopup] = useState(true);
  const [showWinDecisionModal, setShowWinDecisionModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [pendingSubmitIsWin] = useState(false);
  const [hasDoor, setHasDoor] = useState(false);
  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const timerElapsedRef = useRef(0);
  const lastEvaluatedAstSpecRef = useRef<string | null>(null);
  const lastEvaluatedIsWinRef = useRef(false);
  const isExecutorRunningRef = useRef(false);
  const isSilentSubmitCheckRef = useRef(false);
  const warningToastTimeoutRef = useRef<number | null>(null);
  const fruitCollectedPulseRef = useRef(false);
  const [execVariables, setExecVariables] = useState<RuntimeVariables>({});
  const [lastRemoved, setLastRemoved] = useState<LastRemovedItem | null>(null);
  // Data panel is hidden from learner UI, keep runtime state for executor internals.
  void execVariables;
  void lastRemoved;

  // Get level ID and multiplayer room from location state
  const locationState = (location.state ?? null) as {
    levelId?: string;
    levelFile?: string;
    multiplayerRoomId?: string;
    mapDetailId?: string;
    roleContext?: "cms" | "learner";
    returnTo?: string;
  } | null;
  const levelId = locationState?.levelId;
  const levelFile = locationState?.levelFile;
  const multiplayerRoomId = locationState?.multiplayerRoomId;
  const mapDetailIdFromState = locationState?.mapDetailId;
  const roleContext = locationState?.roleContext;
  const returnTo = locationState?.returnTo;
  const isCmsPreview = roleContext === "cms";
  const levelSelectPath =
    levelId != null ? ROUTES.LEARNER_MAP_LEVEL_SELECT(levelId) : ROUTES.LEARNER_MAPS_BROWSE;
  const mapDetailPath =
    levelId != null
      ? ROUTES.LEARNER_MAP_DETAIL.replace(":id", levelId)
      : ROUTES.LEARNER_MAPS_BROWSE;

  const playMapDetailIdRef = useRef<string | null>(null);
  const [campaignLevels, setCampaignLevels] = useState<MapLevelItem[]>([]);
  const [activeMapDetailId, setActiveMapDetailId] = useState<string | null>(null);

  const nextCampaignLevelId = useMemo(() => {
    if (!campaignLevels.length || !activeMapDetailId) return null;
    const i = campaignLevels.findIndex((l) => l.id === activeMapDetailId);
    if (i < 0 || i >= campaignLevels.length - 1) return null;
    return campaignLevels[i + 1].id;
  }, [campaignLevels, activeMapDetailId]);

  const campaignProgressLabel = useMemo(() => {
    if (campaignLevels.length <= 1 || !activeMapDetailId) return null;
    const i = campaignLevels.findIndex((l) => l.id === activeMapDetailId);
    if (i < 0) return null;
    return `Level ${i + 1} / ${campaignLevels.length}`;
  }, [campaignLevels, activeMapDetailId]);

  const handleNextCampaignLevel = useCallback(() => {
    if (!levelId || !nextCampaignLevelId) return;

    // Close the game result modal and clear results
    setShowResultsModal(false);
    setResultsDockVisible(false);
    setGameResult(null);
    setSubmissionFeedback(null);
    setSubmitted(false);
    historyRecordedRef.current = false;

    const nextLevelTypeRaw = (
      campaignLevels.find((level) => level.id === nextCampaignLevelId)?.type ?? ""
    )
      .trim()
      .toLowerCase();
    const nextRoute =
      nextLevelTypeRaw === "platform"
        ? ROUTES.PLATFORM
        : nextLevelTypeRaw === "snake"
          ? ROUTES.SNAKE
          : ROUTES.GAME;

    navigate(nextRoute, {
      replace: true,
      state: {
        levelId,
        mapDetailId: nextCampaignLevelId,
        multiplayerRoomId,
        roleContext,
        returnTo,
      },
    });
  }, [
    levelId,
    nextCampaignLevelId,
    campaignLevels,
    multiplayerRoomId,
    navigate,
    roleContext,
    returnTo,
  ]);

  const handleBackToMapFlow = useCallback(() => {
    if (multiplayerRoomId) {
      void leaveLobbyRoom(multiplayerRoomId).then(() => navigate(ROUTES.LEARNER_LEARN));
      return;
    }
    navigate(
      isCmsPreview
        ? returnTo || ROUTES.CMS_MAPS
        : campaignLevels.length <= 1
          ? mapDetailPath
          : levelSelectPath,
    );
  }, [
    campaignLevels.length,
    isCmsPreview,
    levelSelectPath,
    mapDetailPath,
    multiplayerRoomId,
    navigate,
    returnTo,
  ]);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** Mirrors timer for time-limit effect (ref alone does not trigger re-renders). */
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const timeLimitTriggeredRef = useRef(false);

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

  const handleTimerElapsedChange = useCallback((seconds: number) => {
    timerElapsedRef.current = seconds;
    setElapsedDisplay(seconds);
  }, []);

  /** Reset countdown timer when the level session starts (mission modal or first Run). */
  const resetGameTimerForLevelStart = useCallback(() => {
    timeLimitTriggeredRef.current = false;
    setTimerResetSignal((prev) => prev + 1);
  }, []);

  useEffect(() => {
    return () => {
      if (warningToastTimeoutRef.current !== null) {
        window.clearTimeout(warningToastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setDoorKeyHintVisible(showDoorKeyHints);
  }, [showDoorKeyHints]);

  useEffect(() => {
    let isMounted = true;

    const loadMapHints = async () => {
      if (isCmsPreview || !levelId) {
        if (isMounted) {
          setHints([]);
          setRevealedHints(0);
        }
        return;
      }

      if (isMounted) {
        setRevealedHints(0);
      }

      try {
        const response = await learnerMapsApi.getMapHints(levelId);

        if (!isMounted) return;

        if (response.data.isSuccess && Array.isArray(response.data.data)) {
          const nextHints = response.data.data
            .filter(
              (hint): hint is GameplayHint =>
                typeof hint?.orderNo === "number" && typeof hint?.content === "string",
            )
            .map((hint) => ({ orderNo: hint.orderNo, content: hint.content.trim() }))
            .filter((hint) => hint.content.length > 0);

          setHints(nextHints);
          return;
        }

        setHints([]);
      } catch (hintError) {
        console.error("Failed to load map hints:", hintError);
        if (isMounted) {
          setHints([]);
        }
      }
    };

    loadMapHints();

    return () => {
      isMounted = false;
    };
  }, [isCmsPreview, levelId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cleanup: (() => void) | null = null;

    const initGame = async () => {
      try {
        historyRecordedRef.current = false;
        setSubmitted(false);
        setSubmitLoading(false);
        setSubmissionFeedback(null);
        setGameResult(null);
        setShowResultsModal(false);
        setResultsDockVisible(false);
        setShowWinDecisionModal(false);
        setShowSubmitConfirmModal(false);
        setLastSubmissionId(null);
        timeLimitTriggeredRef.current = false;
        setIsLoading(true);

        // Load level from API or fallback to mock data
        const levelResult = levelId
          ? await loadLevelFromAPI(levelId, { mapDetailId: mapDetailIdFromState })
          : await loadLevelFromMockData(levelFile || "level-platform-01");

        if (levelId && levelResult.mapConfig?.type === "topdown") {
          navigate(ROUTES.GAME, {
            replace: true,
            state: {
              levelId,
              mapDetailId: mapDetailIdFromState,
              multiplayerRoomId,
              roleContext,
              returnTo,
            },
          });
          return;
        }

        if (levelId && levelResult.mapConfig?.type === "snake") {
          navigate(ROUTES.SNAKE, {
            replace: true,
            state: {
              levelId,
              mapDetailId: mapDetailIdFromState,
              multiplayerRoomId,
              roleContext,
              returnTo,
            },
          });
          return;
        }

        playMapDetailIdRef.current = levelResult.mapDetailId;
        setCampaignLevels(levelResult.levels ?? []);
        setActiveMapDetailId(levelResult.mapDetailId);
        if (levelId && levelResult.mapDetailId) {
          markCampaignLevelStarted(levelId, levelResult.mapDetailId);
        }

        if (levelResult.mapConfig) {
          setMapConfig(levelResult.mapConfig as MapConfig);
        }

        const levelDefinition = levelResult.level;
        setBlockConstraints(levelDefinition.blockConstraints ?? null);
        const rowMeta =
          levelResult.levels?.find((l) => l.id === levelResult.mapDetailId) ??
          levelResult.levels?.[0];
        setLevelTitle(
          rowMeta?.title?.trim() || levelDefinition.name || levelDefinition.id || "Level",
        );
        setHasDoor(
          levelDefinition.objects?.some((obj: { type?: string }) => obj.type === "door") ?? false,
        );

        // Set canvas size based on level dimensions
        const tileSize = 48;
        canvas.width = levelDefinition.width * tileSize;
        canvas.height = levelDefinition.height * tileSize;
        setCanvasRenderSize({ width: canvas.width, height: canvas.height });

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Always use Platform level type for this view
        const mapType = levelResult.mapConfig?.type || "platform";
        const winCondition = levelResult.mapConfig?.winCondition === 2 ? 2 : 1;
        const levelType = mapType === "platform" ? LevelType.Platform : LevelType.TopDown;
        const gameType = mapType === "platform" ? "platformer" : "topdown";

        const requiredFruits =
          levelResult.mapConfig?.requiredFruits ?? levelResult.level.metadata?.requiredFruits;
        const config = createGameConfig(levelType, { winCondition, requiredFruits });
        const engine = new GameEngine(levelDefinition, tileSize, ctx, config, gameType);
        engineRef.current = engine;

        await engine.initialize();
        engine.reset();
        setShowMissionModal(true);
        setIsLevelStarted(false);

        setAudioSystem(engine.getAudioSystem() ?? null);

        // Win event
        const handleWin = () => {
          if (executorRef.current) executorRef.current.stop();
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          lastEvaluatedIsWinRef.current = true;
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          if (levelId && playMapDetailIdRef.current) {
            markCampaignLevelCompleted(levelId, playMapDetailIdRef.current);
          }
          setShowWinDecisionModal(true);
        };
        engine.on("win", handleWin);

        // Failed event
        const handleFailed = () => {
          if (executorRef.current) executorRef.current.stop();
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          setShowExecutionIncompleteModal(false);
          setShowTrapFailedModal(true);
        };
        engine.on("engine:failed", handleFailed);

        // Fruit collection event
        const handleFruitCollected = (event: EngineEvent) => {
          if (event.type === "fruitCollected") {
            setCollectedFruits(event.totalCollected);
            fruitCollectedPulseRef.current = true;
          }
        };
        engine.on("fruitCollected", handleFruitCollected);

        const handleWinConditionNotMet = (event: EngineEvent) => {
          if (event.type === "winConditionNotMet") {
            showWarningToast(event.message);
          }
        };
        engine.on("winConditionNotMet", handleWinConditionNotMet);

        const handleInteractionFeedback = (event: EngineEvent) => {
          if (event.type === "interactionFeedback") {
            showWarningToast(event.message);
          }
        };
        engine.on("interactionFeedback", handleInteractionFeedback);
        setIsLoading(false);

        cleanup = () => {
          engine.off("win", handleWin);
          engine.off("engine:failed", handleFailed);
          engine.off("fruitCollected", handleFruitCollected);
          engine.off("winConditionNotMet", handleWinConditionNotMet);
          engine.off("interactionFeedback", handleInteractionFeedback);
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
  }, [
    levelId,
    levelFile,
    mapDetailIdFromState,
    multiplayerRoomId,
    returnTo,
    roleContext,
    showWarningToast,
    showResultPopup,
    navigate,
    t,
  ]);

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

    if (!isLevelStarted) {
      try {
        resetGameTimerForLevelStart();
        engineRef.current.start();
        setIsLevelStarted(true);
        setShowMissionModal(false);
      } catch (err) {
        console.error("Failed to start level before running program:", err);
        setShowMissionModal(true);
        return;
      }
    }

    const existingExecutor = executorRef.current;
    if (existingExecutor && existingExecutor.hasNext()) {
      isExecutorRunningRef.current = true;
      setIsExecutorRunning(true);
      existingExecutor.run(
        (result) => {
          const engine = engineRef.current;
          if (engine) {
            engine.executeCommand(result.command);

            const player = engine.getPlayer();
            const dist = Math.max(
              Math.abs(player.targetPixelX - player.pixelX),
              Math.abs(player.targetPixelY - player.pixelY),
            );
            return Math.max(500, dist / 0.5);
          }
          return 500;
        },
        500,
        () => {
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          const engine = engineRef.current;
          if (!engine || engine.hasWon()) {
            return;
          }
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          setShowExecutionIncompleteModal(true);
        },
      );
      return;
    }

    try {
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

      const constraints = engineRef.current.getBlockConstraints();
      if (constraints) {
        const allBlockTypes = blocksConfig.blocks.map((block) => block.type);
        const allowedBlocks = Array.from(new Set(constraints.allowedBlocks ?? [])).filter((type) =>
          allBlockTypes.includes(type),
        );

        if (allowedBlocks.length > 0) {
          for (const usedType of Object.keys(blockUsage)) {
            if (!allowedBlocks.includes(usedType)) {
              showWarningToast(`${t("blockNotAllowed")}: ${toBlockLabel(usedType)}.`);
              return;
            }
          }
        } else {
          for (const bannedType of constraints.bannedBlocks || []) {
            const used = blockUsage[bannedType] ?? 0;
            if (used > 0) {
              showWarningToast(`${t("blockNotAllowed")}: ${toBlockLabel(bannedType)}.`);
              return;
            }
          }
        }

        for (const rule of constraints.requiredBlocks || []) {
          const used = blockUsage[rule.type] ?? 0;
          if (used < rule.minCount) {
            showWarningToast(
              `${t("requiredBlockMissing")}: ${toBlockLabel(rule.type)} (${used}/${rule.minCount}).`,
            );
            return;
          }
        }

        const blockLimit = constraints.blockLimit;
        if (typeof blockLimit === "number" && Number.isFinite(blockLimit) && blockLimit > 0) {
          const totalUsed = Object.values(blockUsage).reduce((sum, count) => sum + (count || 0), 0);
          if (totalUsed > blockLimit) {
            showWarningToast(
              `${t("blockLimitExceeded")} (${totalUsed}/${blockLimit}). ${t("runningAnyway")}.`,
            );
          }
        }
      }

      const program: BlockProgram = generateAST(workspaceRef.current);
      lastEvaluatedAstSpecRef.current = JSON.stringify(program);
      lastEvaluatedIsWinRef.current = false;
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
            return !engine.isWallAhead() && !engine.isObstacleAhead();
          case "wallAhead":
            return engine.isWallAhead();
          case "obstacleAhead":
            return engine.isObstacleAhead();
          case "wallLeft":
            return engine.isWallLeft();
          case "wallRight":
            return engine.isWallRight();
          case "goalReached":
            return engine.hasWon();
          case "enemyAhead":
            return engine.isEnemyAhead();
          case "trapAhead":
            return engine.isTrapAhead();
          case "bodyAhead":
            return false;
          case "fruitCollected":
            if (fruitCollectedPulseRef.current) {
              fruitCollectedPulseRef.current = false;
              return true;
            }
            return false;
          default:
            return false;
        }
      };

      const numberResolver = (sensorType: "boxHardnessAhead"): number => {
        const engine = engineRef.current;
        if (!engine) return 0;

        switch (sensorType) {
          case "boxHardnessAhead":
            return engine.getBoxHardnessAhead();
          default:
            return 0;
        }
      };

      const positionResolver: PositionResolver = {
        getStartCell: () => {
          const engine = engineRef.current;
          return engine ? engine.getStartCell() : "0,0";
        },
        getGoalCell: () => {
          const engine = engineRef.current;
          return engine ? engine.getGoalCell() : "0,0";
        },
        getCurrentCell: () => {
          const engine = engineRef.current;
          return engine ? engine.getCurrentCell() : "0,0";
        },
        getNeighbors: (cell: string) => {
          const engine = engineRef.current;
          return engine ? engine.getNeighbors(cell) : [];
        },
        getCharacterAtCurrentCell: () => {
          const engine = engineRef.current;
          return engine ? engine.getCharacterAtCurrentCell() : "";
        },
        hasCharacterAtCurrentCell: () => {
          const engine = engineRef.current;
          return engine ? engine.hasCharacterAtCurrentCell() : false;
        },
      };

      // Stop any running executor first
      if (executorRef.current) executorRef.current.stop();
      fruitCollectedPulseRef.current = false;

      const executor = new StepExecutor(
        program,
        conditionChecker,
        numberResolver,
        positionResolver,
      );
      executor.setWarningCallback((message) => {
        showWarningToast(message);
      });
      executor.setStateChangeCallback(() => {
        const ctx = executor.getExecutionContext();
        setExecVariables({ ...ctx.variables });
        setLastRemoved(ctx.lastRemoved);
        setLiveSteps(engineRef.current?.getStepCount() ?? 0);
      });
      executorRef.current = executor;

      isExecutorRunningRef.current = true;
      setIsExecutorRunning(true);
      executor.run(
        (result) => {
          const engine = engineRef.current;
          if (engine) {
            engine.executeCommand(result.command);
            setLiveSteps(engine.getStepCount());

            const player = engine.getPlayer();
            const dist = Math.max(
              Math.abs(player.targetPixelX - player.pixelX),
              Math.abs(player.targetPixelY - player.pixelY),
            );
            return Math.max(500, dist / 0.5);
          }
          return 500;
        },
        500,
        () => {
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          const engine = engineRef.current;
          if (!engine || engine.hasWon() || engine.getState() === EngineState.Failed) {
            return;
          }
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          setShowExecutionIncompleteModal(true);
        },
      );
    } catch (err) {
      console.error("Failed to run program:", err);
      alert("Error running program: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const runAutoSubmitPrecheck = useCallback(async (targetAstSpec: string): Promise<boolean> => {
    if (!workspaceRef.current || !engineRef.current) return false;

    if (executorRef.current) {
      executorRef.current.stop();
      executorRef.current = null;
    }

    isSilentSubmitCheckRef.current = true;
    handleRunProgram();

    let sawRunning = isExecutorRunningRef.current;
    const timeoutAt = Date.now() + 20000;
    try {
      while (Date.now() < timeoutAt) {
        const verifiedCurrentAst = lastEvaluatedAstSpecRef.current === targetAstSpec;
        const running = isExecutorRunningRef.current;

        if (running) {
          sawRunning = true;
        }

        if (verifiedCurrentAst && sawRunning && !running) {
          return true;
        }

        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 60);
        });
      }
      return false;
    } finally {
      isSilentSubmitCheckRef.current = false;
    }
  }, []);

  const handleStopProgram = () => {
    if (executorRef.current) {
      executorRef.current.stop();
      setIsExecutorRunning(false);
    }
  };

  const handleReset = () => {
    historyRecordedRef.current = false;
    setSubmitted(false);
    setShowWinDecisionModal(false);
    setShowSubmitConfirmModal(false);
    setSubmissionFeedback(null);
    timeLimitTriggeredRef.current = false;
    if (executorRef.current) {
      executorRef.current.stop();
      executorRef.current = null;
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
    setResultsDockVisible(false);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);
    setGameResult(null);
    setExecVariables({});
    setLastRemoved(null);
    setLiveSteps(0);
    fruitCollectedPulseRef.current = false;
  };

  const handlePlayAgainFromResults = (options?: { preserveResult?: boolean }) => {
    const preserveResult = options?.preserveResult ?? false;
    historyRecordedRef.current = false;
    setSubmitted(false);
    setShowWinDecisionModal(false);
    setShowSubmitConfirmModal(false);
    timeLimitTriggeredRef.current = false;

    if (executorRef.current) {
      executorRef.current.stop();
      executorRef.current = null;
    }

    if (engineRef.current) {
      try {
        // New game style restart: reset world and wait for Start Level
        engineRef.current.reset();
      } catch (err) {
        console.error("Error resetting engine for play again:", err);
        window.location.reload();
        return;
      }
    }

    setIsExecutorRunning(false);
    setCollectedFruits(0);
    if (!preserveResult) {
      setShowResultsModal(false);
    }
    setResultsDockVisible(false);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);
    if (!preserveResult) {
      setGameResult(null);
      setSubmissionFeedback(null);
    }
    setExecVariables({});
    setLastRemoved(null);
    setBlocksUsed(0);
    setLiveSteps(0);
    setRevealedHints(0);
    setIsLevelStarted(false);
    setShowMissionModal(!preserveResult);
    fruitCollectedPulseRef.current = false;
    resetGameTimerForLevelStart();
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
        setLiveSteps(engine.getStepCount());
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
    historyRecordedRef.current = false;
    const engine = engineRef.current;
    if (!engine) return;
    resetGameTimerForLevelStart();
    engine.start();
    setIsLevelStarted(true);
    setShowMissionModal(false);
  };

  const blockTypeLabelMap = new Map(blocksConfig.blocks.map((block) => [block.type, block.label]));
  const toBlockLabel = (type: string) => {
    const key = `block.${type}`;
    const translated = t(key);
    return translated !== key ? translated : blockTypeLabelMap.get(type) || type;
  };

  const missionGoal =
    mapConfig?.winCondition === 2
      ? mapConfig.requiredFruits && mapConfig.requiredFruits > 0
        ? `Collect ${mapConfig.requiredFruits} Fruits and reach goal`
        : "Collect All Fruits and reach goal"
      : "Reach Goal";
  const objectiveText = (mapConfig?.levelObjective ?? "").trim() || missionGoal;
  const requiredBlocks = (blockConstraints?.requiredBlocks ?? []).map((rule) => {
    const label = toBlockLabel(rule.type);
    return rule.minCount > 1 ? `${label} x${rule.minCount}` : label;
  });
  const allBlockTypes = blocksConfig.blocks.map((block) => block.type);
  const normalizedAllowedTypes = Array.from(new Set(blockConstraints?.allowedBlocks ?? [])).filter(
    (type) => allBlockTypes.includes(type),
  );
  const derivedBannedTypesForWorkspace =
    normalizedAllowedTypes.length > 0
      ? allBlockTypes.filter((type) => !normalizedAllowedTypes.includes(type))
      : (blockConstraints?.bannedBlocks ?? []);
  const allowedBlocks = normalizedAllowedTypes.map((type) => toBlockLabel(type));
  const bannedBlocks = derivedBannedTypesForWorkspace.map((type) => toBlockLabel(type));
  const totalHints = hints.length;
  const revealedHintCount = Math.min(revealedHints, totalHints);
  const allHintsRevealed = totalHints > 0 && revealedHintCount >= totalHints;

  const hintButtonState: "empty" | "progress" | "complete" =
    revealedHintCount === 0 ? "empty" : allHintsRevealed ? "complete" : "progress";

  const hintButtonStyles: Record<
    "empty" | "progress" | "complete",
    { background: string; border: string; color: string }
  > = {
    empty: {
      background: "color-mix(in srgb, var(--text-2) 15%, var(--surface))",
      border: "1px solid color-mix(in srgb, var(--text-2) 35%, var(--border))",
      color: "var(--text)",
    },
    progress: {
      background: "color-mix(in srgb, var(--warning) 28%, var(--surface))",
      border: "1px solid color-mix(in srgb, var(--warning) 52%, var(--border))",
      color: "var(--text)",
    },
    complete: {
      background: "linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)",
      border: "1px solid #d97706",
      color: "#422006",
    },
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
        void leaveLobbyRoom(multiplayerRoomId).then(() => navigate(ROUTES.LEARNER_LEARN));
      });
    });
    return () => {
      unsubRank?.();
      unsubEnd?.();
    };
  }, [multiplayerRoomId, navigate]);

  /** When map has timeLimitSeconds: force game over and auto-submit (same as lose + submit flow). */
  useEffect(() => {
    const limit = mapConfig?.timeLimitSeconds;
    if (limit == null || !Number.isFinite(limit) || limit <= 0) return;
    if (!isLevelStarted) return;
    if (showResultsModal) return;
    if (timeLimitTriggeredRef.current) return;
    if (elapsedDisplay < limit) return;

    timeLimitTriggeredRef.current = true;
    showWarningToast(t("gameTimeUpToast"));

    if (executorRef.current) {
      executorRef.current.stop();
    }
    setIsExecutorRunning(false);
    const engine = engineRef.current;
    if (!engine) return;
    try {
      engine.stop();
    } catch {
      /* ignore */
    }
    setGameResult({
      isWin: false,
      stepCount: engine.getStepCount(),
      blocksUsed: lastRunBlockCountRef.current,
      elapsedTime: Math.min(elapsedDisplay, limit),
      fruitsCollected: engine.getCollectedFruitsCount(),
    });
    setShowResultsModal(false);
    setResultsDockVisible(false);
  }, [
    mapConfig?.timeLimitSeconds,
    isLevelStarted,
    showResultsModal,
    showResultPopup,
    elapsedDisplay,
    showWarningToast,
    t,
  ]);

  const handleMinimizeResults = useCallback(() => {
    setShowResultsModal(false);
    setResultsDockVisible(true);
  }, []);

  const handleCloseResults = useCallback(() => {
    setShowResultsModal(false);
    setResultsDockVisible(false);
    setGameResult(null);
    setSubmissionFeedback(null);
  }, []);

  const handleSubmitRun = useCallback(
    async (options?: { skipConfirm?: boolean }) => {
      if (!workspaceRef.current || submitLoading || submitted) return;

      const engine = engineRef.current;
      if (!engine) return;

      const program = generateAST(workspaceRef.current);
      const astSpec = JSON.stringify(program);
      const isProgramChecked = astSpec === lastEvaluatedAstSpecRef.current;
      if (!options?.skipConfirm) {
        if (!isProgramChecked) {
          const precheckOk = await runAutoSubmitPrecheck(astSpec);
          if (!precheckOk) {
            showWarningToast(t("gameSubmitAutoCheckFailed"));
            return;
          }
        }
        void handleSubmitRun({ skipConfirm: true });
        return;
      }

      const isProgramCheckedAfterAuto = astSpec === lastEvaluatedAstSpecRef.current;
      const precheckedIsWinAfterAuto = isProgramCheckedAfterAuto
        ? lastEvaluatedIsWinRef.current
        : false;

      if (!isProgramCheckedAfterAuto) {
        showWarningToast(t("gameSubmitAutoCheckFailed"));
        return;
      }

      if (executorRef.current) {
        executorRef.current.stop();
      }
      setIsExecutorRunning(false);

      try {
        engine.stop();
      } catch {
        /* ignore stop errors while freezing the run */
      }

      const snapshot = {
        isWin: precheckedIsWinAfterAuto,
        stepCount: engine.getStepCount(),
        blocksUsed,
        elapsedTime: timerElapsedRef.current,
        fruitsCollected: engine.getCollectedFruitsCount(),
      };

      historyRecordedRef.current = true;
      setSubmitLoading(true);
      try {
        setSubmissionFeedback(null);

        if (multiplayerRoomId) {
          const res = await learnerLobbyApi.submitSolution(multiplayerRoomId, {
            language: "Blockly",
            astSpec,
            isWin: snapshot.isWin,
            stepsUsed: snapshot.stepCount,
            blocksUsed: snapshot.blocksUsed,
            time: snapshot.elapsedTime,
            mapDetailId: activeMapDetailId ?? undefined,
          });

          if (res.data?.isSuccess) {
            setSubmitted(true);
            setGameResult(snapshot);
            setSubmissionFeedback({
              score: res.data.data?.score ?? null,
              stars: null,
              status: res.data.data?.status ?? null,
              message: null,
            });
            setResultsDockVisible(false);
            setShowResultsModal(true);
            if (res.data?.data?.rankingIfAllSubmitted?.length) {
              const ranking = res.data.data.rankingIfAllSubmitted.map((r) => ({
                playerId: r.playerId,
                score: r.score,
                rank: r.rank,
                status: r.status,
              }));
              navigate(ROUTES.LEARNER_ROOM_RESULT, {
                state: { ranking, roomId: multiplayerRoomId },
              });
              return;
            }
          } else {
            historyRecordedRef.current = false;
            window.alert(res.data?.message ?? "Submit failed.");
          }
        } else {
          if (!levelId) return;

          const before = snapshot.isWin
            ? await learnerProfileApi.getMyXpProfile().catch(() => null)
            : null;
          const validateRes = await learnerGameplayApi.validateSolution({
            mapId: levelId,
            mapDetailId: activeMapDetailId ?? undefined,
            language: "Blockly",
            astSpec,
            playMode: 0,
            isWin: snapshot.isWin,
            clientStepsUsed: snapshot.stepCount,
            clientBlocksUsed: snapshot.blocksUsed,
            clientElapsedSeconds: snapshot.elapsedTime,
          });

          if (validateRes.isSuccess && validateRes.data?.submissionId) {
            setSubmitted(true);
            setGameResult(snapshot);
            setSubmissionFeedback({
              score: validateRes.data.score ?? null,
              stars: validateRes.data.stars ?? null,
              status: validateRes.data.status ?? null,
              message: validateRes.data.message ?? null,
            });
            setResultsDockVisible(false);
            setShowResultsModal(true);
          } else {
            historyRecordedRef.current = false;
            window.alert(validateRes.message ?? "Submit failed.");
          }

          if (snapshot.isWin) {
            const after = await learnerProfileApi.getMyXpProfile().catch(() => null);
            const beforeXp = before?.data?.currentXp ?? null;
            const afterXp = after?.data?.currentXp ?? null;
            if (beforeXp != null && afterXp != null) {
              const delta = afterXp - beforeXp;
              if (delta > 0) {
                setXpToast(`+${delta} XP`);
                window.setTimeout(() => setXpToast(""), 2600);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to save play history", err);
        historyRecordedRef.current = false;
      } finally {
        setSubmitLoading(false);
      }
    },
    [
      activeMapDetailId,
      blocksUsed,
      levelId,
      multiplayerRoomId,
      navigate,
      runAutoSubmitPrecheck,
      submitLoading,
      submitted,
      t,
    ],
  );

  submitRunRef.current = handleSubmitRun;

  useEffect(() => {
    isExecutorRunningRef.current = isExecutorRunning;
  }, [isExecutorRunning]);

  const handleContinueEditingAfterWin = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    historyRecordedRef.current = false;
    timeLimitTriggeredRef.current = false;
    setSubmitted(false);
    setSubmissionFeedback(null);
    setGameResult(null);
    setShowResultsModal(false);
    setResultsDockVisible(false);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);
    setCollectedFruits(0);
    setLiveSteps(0);
    fruitCollectedPulseRef.current = false;
    try {
      engine.reset();
      engine.start();
    } catch {
      window.location.reload();
      return;
    }
    setIsLevelStarted(true);
    showWarningToast(t("gameWinSubmitHint"));
  }, [showWarningToast, t]);

  const handleEndMultiplayerGame = useCallback(async () => {
    if (!multiplayerRoomId) return;
    try {
      await learnerLobbyApi.endGame(multiplayerRoomId);
      await leaveLobbyRoom(multiplayerRoomId);
      navigate(ROUTES.LEARNER_LEARN);
    } catch {
      window.alert("Could not end game.");
    }
  }, [multiplayerRoomId, navigate]);

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

  const timeLimit =
    mapConfig?.timeLimitSeconds && mapConfig.timeLimitSeconds > 0
      ? mapConfig.timeLimitSeconds
      : Number.POSITIVE_INFINITY;
  const timeStarThresholdPercent =
    mapConfig?.timeStarThresholdPercent && Number.isFinite(mapConfig.timeStarThresholdPercent)
      ? Math.max(1, Math.min(100, Math.floor(mapConfig.timeStarThresholdPercent)))
      : 100;
  const timeStarLimit = Number.isFinite(timeLimit)
    ? timeLimit * (timeStarThresholdPercent / 100)
    : Number.POSITIVE_INFINITY;
  const stepLimit =
    mapConfig?.estimatedSteps && mapConfig.estimatedSteps > 0
      ? mapConfig.estimatedSteps
      : Number.POSITIVE_INFINITY;
  const blockLimit =
    blockConstraints?.blockLimit && blockConstraints.blockLimit > 0
      ? blockConstraints.blockLimit
      : Number.POSITIVE_INFINITY;

  let currentStars = 0;
  if (elapsedDisplay <= timeStarLimit) currentStars++;
  if (liveSteps <= stepLimit) currentStars++;
  if (blocksUsed <= blockLimit) currentStars++;

  const currentElapsedForDetails =
    showResultsModal && gameResult ? gameResult.elapsedTime : elapsedDisplay;
  const currentStepsForDetails = showResultsModal && gameResult ? gameResult.stepCount : liveSteps;
  const currentBlocksForDetails =
    showResultsModal && gameResult ? gameResult.blocksUsed : blocksUsed;
  const currentFruitsForDetails =
    showResultsModal && gameResult ? gameResult.fruitsCollected : collectedFruits;

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
      {xpToast ? (
        <AlertToast type="success" message={xpToast} onClose={() => setXpToast("")} />
      ) : null}
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

      {multiplayerRoomId && submitted && !showResultsModal && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "16px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1001,
            maxWidth: "min(92vw, 520px)",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "color-mix(in srgb, var(--primary) 16%, var(--surface))",
            border: "1px solid color-mix(in srgb, var(--primary) 40%, var(--border))",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text)",
            textAlign: "center",
            boxShadow: "0 12px 24px rgba(15, 23, 42, 0.2)",
          }}
        >
          {t("multiplayerWaitOthers")}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "stretch",
          justifyContent: "space-between",
          padding: "12px",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          background: "color-mix(in srgb, var(--surface) 90%, transparent)",
          backdropFilter: "blur(4px)",
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => {
              handleBackToMapFlow();
            }}
            style={controlButtonStyle("neutral", false, hoveredControl === "back")}
            onMouseEnter={() => setHoveredControl("back")}
            onMouseLeave={() => setHoveredControl(null)}
          >
            <ArrowLeft size={15} /> {multiplayerRoomId ? t("leave") : t("backToMaps")}
          </button>
          <button
            onClick={() => {
              void handleSubmitRun();
            }}
            disabled={isLoading || !!error || submitLoading || submitted}
            style={controlButtonStyle(
              "primary",
              isLoading || !!error || submitLoading || submitted,
              hoveredControl === "submit",
            )}
            onMouseEnter={() => setHoveredControl("submit")}
            onMouseLeave={() => setHoveredControl(null)}
          >
            <Send size={15} /> {submitted ? t("submitted") : t("submitSolution")}
          </button>

          {multiplayerRoomId && (
            <button
              onClick={handleEndMultiplayerGame}
              style={controlButtonStyle("warning", false, hoveredControl === "end")}
              onMouseEnter={() => setHoveredControl("end")}
              onMouseLeave={() => setHoveredControl(null)}
            >
              <Flag size={15} /> {t("endGame")}
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
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
            <Play size={15} /> {t("runProgram")}
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
            <SkipForward size={15} /> {t("stepExecution")}
          </button>

          <button
            onClick={handleStopProgram}
            disabled={isLoading || !!error}
            style={controlButtonStyle("danger", isLoading || !!error, hoveredControl === "stop")}
            onMouseEnter={() => setHoveredControl("stop")}
            onMouseLeave={() => setHoveredControl(null)}
          >
            <Pause size={15} /> {t("stop")}
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading || !!error}
            style={controlButtonStyle("warning", isLoading || !!error, hoveredControl === "reset")}
            onMouseEnter={() => setHoveredControl("reset")}
            onMouseLeave={() => setHoveredControl(null)}
          >
            <RotateCcw size={15} /> {t("reset")}
          </button>

          {hasDoor && (
            <button
              onClick={() => setShowDoorKeyHints((prev) => !prev)}
              disabled={isLoading || !!error}
              style={{
                padding: "8px 10px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: showDoorKeyHints ? "var(--primary)" : "var(--surface-2)",
                color: showDoorKeyHints ? "#fff" : "var(--text)",
                fontSize: "12px",
                fontWeight: 700,
                cursor: isLoading || !!error ? "not-allowed" : "pointer",
              }}
              title="Toggle door key message"
            >
              {showDoorKeyHints ? t("hideDoorKey") : t("showDoorKey")}
            </button>
          )}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)" }}>
          <p>{t("loadingLevel")}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: "20px", color: "var(--danger)" }}>
          <h3>{t("errorLoadingGame")}</h3>
          <p>{error}</p>
          <p style={{ fontSize: "12px", marginTop: "10px" }}>{t("checkBrowserConsole")}</p>
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
            {t("retry")}
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
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
              display: "flex",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.2s ease, box-shadow 0.2s ease",
            }}
            onClick={() => setShowStatusDetailsModal(true)}
            title="Click to view detailed performance"
          >
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Time */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color:
                    elapsedDisplay > timeLimit
                      ? "var(--danger)"
                      : elapsedDisplay >= timeLimit * 0.8
                        ? "var(--warning)"
                        : "var(--text)",
                }}
              >
                ⏱️{" "}
                <GameTimer
                  engineRef={engineRef}
                  isLoading={isLoading}
                  error={error}
                  resetSignal={timerResetSignal}
                  onElapsedTimeChange={handleTimerElapsedChange}
                  compact
                  isActive={isLevelStarted && !gameResult}
                />
                {timeLimit !== Number.POSITIVE_INFINITY && (
                  <span style={{ opacity: 0.7, fontSize: "12px" }}>/ {timeLimit}s</span>
                )}
              </div>

              {/* Steps */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color:
                    liveSteps > stepLimit
                      ? "var(--danger)"
                      : liveSteps >= stepLimit * 0.8
                        ? "var(--warning)"
                        : "var(--text)",
                }}
              >
                👣 <strong>{liveSteps}</strong>
                {stepLimit !== Number.POSITIVE_INFINITY && (
                  <span style={{ opacity: 0.7, fontSize: "12px" }}>/ {stepLimit}</span>
                )}
              </div>

              {/* Blocks */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color:
                    blocksUsed > blockLimit
                      ? "var(--danger)"
                      : blocksUsed >= blockLimit * 0.8
                        ? "var(--warning)"
                        : "var(--text)",
                }}
              >
                🧩 <strong>{blocksUsed}</strong>
                {blockLimit !== Number.POSITIVE_INFINITY && (
                  <span style={{ opacity: 0.7, fontSize: "12px" }}>/ {blockLimit}</span>
                )}
              </div>

              {/* Fruits */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}
              >
                🍎 <strong>{collectedFruits}</strong>
                {mapConfig?.requiredFruits ? (
                  <span style={{ opacity: 0.7, fontSize: "12px" }}>
                    / {mapConfig.requiredFruits}
                  </span>
                ) : (
                  ""
                )}
              </div>

              {/* Stars */}
              <div style={{ display: "flex", alignItems: "center", gap: "2px", marginLeft: "8px" }}>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    style={{
                      color: i < currentStars ? "var(--warning)" : "var(--border)",
                      fontSize: "16px",
                    }}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowHintsModal(true);
              }}
              disabled={false}
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 10px",
                borderRadius: "12px",
                ...hintButtonStyles[hintButtonState],
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 800,
                transition: "all 0.2s ease",
                boxShadow: "0 8px 16px color-mix(in srgb, var(--warning) 24%, transparent)",
                opacity: 1,
              }}
              aria-label="Show game hints"
            >
              💡 {t("hintsCount")} ({revealedHintCount}/{totalHints})
            </button>
          </div>

          <div
            style={{
              padding: "8px 16px",
              background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
              borderBottom: "1px solid var(--border)",
              fontSize: "13px",
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {campaignProgressLabel ? (
              <span
                style={{
                  marginRight: "8px",
                  padding: "2px 8px",
                  borderRadius: "8px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  fontWeight: 800,
                  fontSize: "12px",
                }}
              >
                {campaignProgressLabel}
              </span>
            ) : null}
            <strong>{t("gameObjectiveLabel")}:</strong> {objectiveText}
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
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
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
                    {t("zoomFit")}
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
                    {t("zoomActual")}
                  </button>
                </div>
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
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: "16px" }}>
                {t("blockEditorTitle")}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-2)" }}>
                {t("blockEditorSubtitle")}
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
              <Eraser size={14} /> {t("clearBlocks")}
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
            <BlockCounter used={blocksUsed} limit={blockConstraints?.blockLimit ?? null} />
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontSize: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <div style={{ fontWeight: 800, opacity: 0.9 }}>{t("dataPanelTitle")}</div>
              {lastRemoved && (
                <div style={{ opacity: 0.8 }}>
                  {t("dataTookFrom")}{" "}
                  <strong>
                    {lastRemoved.name} ({lastRemoved.structure})
                  </strong>
                  : <code>{String(lastRemoved.value)}</code>
                </div>
              )}
            </div>
            <div style={{ marginTop: "8px", display: "grid", gap: "6px" }}>
              {Object.entries(execVariables)
                .filter(([, v]) => Array.isArray(v))
                .map(([name, v]) => {
                  const arr = v as unknown[];
                  const items = arr
                    .slice(0, 20)
                    .map((item) =>
                      typeof item === "object" && item !== null
                        ? JSON.stringify(item)
                        : String(item),
                    );
                  return (
                    <div key={name} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <div style={{ minWidth: "90px", fontWeight: 700 }}>{name}:</div>
                      <div
                        style={{
                          fontFamily:
                            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                          opacity: 0.9,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                        title={items.join(" → ")}
                      >
                        [{items.join(" → ")}]
                      </div>
                    </div>
                  );
                })}
              {Object.entries(execVariables).filter(([, v]) => Array.isArray(v)).length === 0 && (
                <div style={{ opacity: 0.7 }}>{t("dataPanelEmpty")}</div>
              )}
            </div>
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
              bannedBlockTypes={derivedBannedTypesForWorkspace}
              blockLimit={null}
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
        allowedBlocks={allowedBlocks}
        bannedBlocks={bannedBlocks}
        onStart={handleStartLevel}
        onClose={handleStartLevel}
      />

      <HintModal
        isOpen={showHintsModal}
        hints={hints}
        revealedHints={revealedHintCount}
        onRevealNext={() => {
          setRevealedHints((prev) => Math.min(prev + 1, totalHints));
        }}
        onClose={() => setShowHintsModal(false)}
      />

      <StatusDetailsModal
        isOpen={showStatusDetailsModal}
        onClose={() => setShowStatusDetailsModal(false)}
        elapsedSeconds={currentElapsedForDetails}
        timeLimitSeconds={Number.isFinite(timeLimit) ? timeLimit : null}
        timeStarLimitSeconds={Number.isFinite(timeStarLimit) ? timeStarLimit : null}
        stepsUsed={currentStepsForDetails}
        stepLimit={Number.isFinite(stepLimit) ? stepLimit : null}
        blocksUsed={currentBlocksForDetails}
        blockLimit={Number.isFinite(blockLimit) ? blockLimit : null}
        fruitsCollected={currentFruitsForDetails}
        fruitsTotal={mapConfig?.requiredFruits ?? null}
      />

      <ExecutionIncompleteModal
        isOpen={showExecutionIncompleteModal}
        onConfirm={() => {
          setShowExecutionIncompleteModal(false);
          handleReset();
        }}
      />

      <TrapFailedModal
        isOpen={showTrapFailedModal}
        onReplay={() => {
          setShowTrapFailedModal(false);
          handleReset();
        }}
      />

      <RunDecisionModal
        isOpen={showWinDecisionModal}
        title={t("gameWinDecisionTitle")}
        description={`${t("gameWinDecisionPrompt")}\n\n${t("gameWinDecisionEditHint")}`}
        primaryLabel={t("gameWinDecisionSubmit")}
        secondaryLabel={t("gameWinDecisionEdit")}
        onPrimary={() => {
          setShowWinDecisionModal(false);
          void submitRunRef.current?.({ skipConfirm: true });
        }}
        onSecondary={() => {
          setShowWinDecisionModal(false);
          handleContinueEditingAfterWin();
        }}
      />

      <RunDecisionModal
        isOpen={showSubmitConfirmModal}
        title={t("gameSubmitConfirmTitle")}
        description={
          pendingSubmitIsWin ? t("gameSubmitConfirmWin") : t("gameSubmitConfirmUnsolved")
        }
        primaryLabel={t("gameSubmitConfirmYes")}
        secondaryLabel={t("gameSubmitConfirmNo")}
        onPrimary={() => {
          setShowSubmitConfirmModal(false);
          void submitRunRef.current?.({ skipConfirm: true });
        }}
        onSecondary={() => {
          setShowSubmitConfirmModal(false);
        }}
      />

      {/* Game Results Modal */}
      {gameResult && (
        <GameResultsModal
          isOpen={showResultsModal}
          isWin={gameResult.isWin}
          stepCount={gameResult.stepCount}
          blocksUsed={gameResult.blocksUsed}
          elapsedTime={gameResult.elapsedTime}
          fruitsCollected={gameResult.fruitsCollected}
          timeLimitSeconds={mapConfig?.timeLimitSeconds ?? null}
          timeStarThresholdPercent={mapConfig?.timeStarThresholdPercent ?? 100}
          stepEstimated={mapConfig?.estimatedSteps ?? null}
          blockLimit={blockConstraints?.blockLimit ?? null}
          multiplayerFooterNote={multiplayerRoomId && submitted ? t("multiplayerWaitOthers") : null}
          onNextLevel={
            gameResult.isWin && nextCampaignLevelId && !multiplayerRoomId
              ? handleNextCampaignLevel
              : undefined
          }
          nextLevelLabel="Next level"
          onReset={() => {
            handlePlayAgainFromResults();
          }}
          onBackToMenu={handleBackToMapFlow}
          onMinimize={handleMinimizeResults}
          onClose={handleCloseResults}
          resultPopupEnabled={showResultPopup}
          onToggleResultPopup={() => setShowResultPopup((prev) => !prev)}
          resultPopupOnLabel={t("gameResultPopupOn")}
          resultPopupOffLabel={t("gameResultPopupOff")}
          backendScore={submissionFeedback?.score ?? null}
          backendStars={submissionFeedback?.stars ?? null}
          backendStatus={submissionFeedback?.status ?? null}
          backendMessage={submissionFeedback?.message ?? null}
          backendScoreLabel={t("gameResultBackendScore")}
          backendStatusLabel={t("gameResultBackendStatus")}
          backendMessageLabel={t("gameResultBackendMessage")}
        />
      )}

      {resultsDockVisible && gameResult ? (
        <button
          type="button"
          onClick={() => {
            setResultsDockVisible(false);
            setShowResultsModal(true);
          }}
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            zIndex: 1001,
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "8px 14px",
            fontSize: "13px",
            fontWeight: 700,
            color: "var(--text)",
            background:
              "linear-gradient(180deg, color-mix(in srgb, var(--surface) 92%, white 8%), var(--surface-2))",
            boxShadow: "0 8px 20px rgba(2, 6, 23, 0.28)",
            cursor: "pointer",
          }}
        >
          {t("gameResultPopupRestore")}
        </button>
      ) : null}
    </div>
  );
}
