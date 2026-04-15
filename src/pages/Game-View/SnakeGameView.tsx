import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import { ArrowLeft, Eraser, Flag, Pause, Play, RotateCcw, Send, SkipForward } from "lucide-react";
import { EngineState, GameEngine } from "@/modules/engine/core/GameEngine";
import { LevelType, createGameConfig } from "@/modules/engine/core/GameConfig";
import type { LevelBlockConstraints, LevelDefinition } from "@/modules/map-system/types";
import type { ExecutionResult } from "@/modules/executor/commands";
import type {
  BlockProgram,
  ConditionType,
  PositionResolver,
  Rotation,
} from "@/modules/executor/types";
import type { EngineEvent } from "@/modules/engine/core/engineEvents";
import { StepExecutor } from "@/modules/executor/StepExecutor";
import { animationRegistry } from "@/modules/engine/systems/animation/animationRegistry";
import type { AnimationDefinition } from "@/modules/engine/systems/animation/animationTypes";
import type { MapConfig } from "@/shared/types/MapSchema";
import type { MapLevelItem } from "@/types/api/learner/maps";
import BlocklyWorkspace from "@/tools/block-editor/components/BlocklyWorkspace";
import { generateAST } from "@/tools/block-editor/blocks/registerGenerators";
import { loadLevelFromAPI } from "@/utils/levelLoader";
import { ROUTES } from "@/lib/constants/routes";
import { markCampaignLevelCompleted, markCampaignLevelStarted } from "@/lib/game/campaignProgress";
import blocksConfig from "@/shared/block/blocks-config.json";
import { useTranslation } from "@/lib/i18n/translations";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import { learnerLobbyApi } from "@/services/api/learner/lobby.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerProfileApi } from "@/services/api/learner/profile.api";
import { gameLobbyHub } from "@/lib/realtime/gameLobbyHub";
import { AlertToast } from "@/shared/components/AlertToast";
import { leaveLobbyRoom } from "@/lib/lobby/leaveLobbyRoom";
import snakeAssetRaw from "@/shared/assets/platformer/snake/object/snake.json";
import { BlockCounter } from "./BlockCounter";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";
import { LevelMissionModal } from "./LevelMissionModal";
import { ExecutionIncompleteModal } from "./ExecutionIncompleteModal";
import { TrapFailedModal } from "./TrapFailedModal";
import { GameResultsModal } from "./GameResultsModal";
import { HintModal, type GameplayHint } from "./HintModal";
import { StatusDetailsModal } from "./StatusDetailsModal";
import { RunDecisionModal } from "./RunDecisionModal";

interface CellPoint {
  row: number;
  col: number;
}

type Dir = "up" | "down" | "left" | "right";

type SnakeFailureReason = "trap" | "self";

type SnakeGameLocationState = {
  levelId?: string;
  mapDetailId?: string;
  levelFile?: string;
  mapUrl?: string;
  multiplayerRoomId?: string;
  roleContext?: string;
  returnTo?: string;
};

type SnakeLevelLoadResult = Awaited<ReturnType<typeof loadLevelFromAPI>>;

const DEFAULT_SNAKE_MAP_FILE = "snake-default";
const TILE_SIZE = 40;

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

type SnakePartSet = {
  head: Record<Dir, string>;
  body: {
    horizontal: string;
    vertical: string;
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  tail: Record<Dir, string>;
};

type SnakeAssetDefinition = {
  frameWidth: number;
  frameHeight: number;
  parts: SnakePartSet;
};

const snakeAsset = snakeAssetRaw as SnakeAssetDefinition;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });
}

function rotateDirection90(direction: Dir, rotation: Rotation): Dir {
  if (rotation === "clockwise") {
    switch (direction) {
      case "up":
        return "right";
      case "right":
        return "down";
      case "down":
        return "left";
      case "left":
        return "up";
    }
  }

  switch (direction) {
    case "up":
      return "left";
    case "left":
      return "down";
    case "down":
      return "right";
    case "right":
      return "up";
  }
}

function resolveBodySpriteKey(
  firstDirection: Dir,
  secondDirection: Dir,
): keyof SnakePartSet["body"] {
  const pair = [firstDirection, secondDirection].sort().join("-");

  switch (pair) {
    case "left-right":
      return "horizontal";
    case "down-up":
      return "vertical";
    case "left-up":
      return "topLeft";
    case "right-up":
      return "topRight";
    case "left-down":
      return "bottomLeft";
    case "down-right":
      return "bottomRight";
    default:
      return "horizontal";
  }
}

function oppositeDirection(direction: Dir): Dir {
  switch (direction) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

function directionFromTo(from: CellPoint, to: CellPoint): Dir | null {
  if (from.row === to.row) {
    if (from.col === to.col + 1) return "left";
    if (from.col + 1 === to.col) return "right";
  }
  if (from.col === to.col) {
    if (from.row === to.row + 1) return "up";
    if (from.row + 1 === to.row) return "down";
  }
  return null;
}

async function loadSnakeLevelFromMock(pathOrFile?: string): Promise<SnakeLevelLoadResult> {
  const raw = (pathOrFile ?? DEFAULT_SNAKE_MAP_FILE).trim();
  const resolvedUrl = raw.startsWith("/")
    ? raw
    : raw.endsWith(".json")
      ? `/mockdata/${raw}`
      : `/mockdata/${raw}.json`;

  const res = await fetch(resolvedUrl);
  if (!res.ok) throw new Error(`Failed to load snake map: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;

  const winConditionRaw =
    typeof data?.winCondition === "number"
      ? data.winCondition
      : typeof data?.metadata?.winCondition === "number"
        ? data.metadata.winCondition
        : 1;
  const requiredFruitsRaw =
    typeof data?.metadata?.requiredFruits === "number" ? data.metadata.requiredFruits : undefined;
  const requiredFruits =
    typeof requiredFruitsRaw === "number" && Number.isFinite(requiredFruitsRaw)
      ? Math.max(0, Math.floor(requiredFruitsRaw))
      : undefined;

  const level: LevelDefinition = {
    id: data.id as string,
    name: data.name as string,
    width: data.width as number,
    height: data.height as number,
    layers: {
      background: data.layers.background as number[][],
      ground: data.layers.ground as number[][] | undefined,
      foreground: data.layers.foreground as number[][] | undefined,
      collision: data.layers.collision as boolean[][],
    },
    startPosition: data.startPosition as { row: number; col: number },
    goalPosition: data.goalPosition as { row: number; col: number },
    objects: (data.objects ?? []) as LevelDefinition["objects"],
    metadata: data.metadata as LevelDefinition["metadata"],
  };

  return {
    level,
    mapConfig: {
      type: "snake",
      winCondition: winConditionRaw === 2 ? 2 : 1,
      ...(requiredFruits !== undefined ? { requiredFruits } : {}),
    },
    mapDetailId: null,
    levelOrder: 0,
  };
}

async function loadSnakeLevel(options: SnakeGameLocationState): Promise<SnakeLevelLoadResult> {
  if (options.levelId) {
    return loadLevelFromAPI(options.levelId, {
      mapDetailId: options.mapDetailId,
    });
  }

  return loadSnakeLevelFromMock(options.mapUrl ?? options.levelFile);
}

function cloneObjects(level: LevelDefinition): NonNullable<LevelDefinition["objects"]> {
  return (level.objects || []).map((obj) => ({
    ...obj,
    position: { ...obj.position },
    metadata: obj.metadata ? { ...obj.metadata } : undefined,
  }));
}

export default function SnakeGameView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as SnakeGameLocationState | null;
  const levelId = routeState?.levelId;
  const mapDetailId = routeState?.mapDetailId;
  const levelFile = routeState?.levelFile;
  const mapUrl = routeState?.mapUrl;
  const multiplayerRoomId = routeState?.multiplayerRoomId;
  const roleContext = routeState?.roleContext;
  const returnTo = routeState?.returnTo;
  const isCmsPreview = roleContext === "cms";

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);

  const levelRef = useRef<LevelDefinition | null>(null);
  const initialObjectsRef = useRef<NonNullable<LevelDefinition["objects"]>>([]);
  const baseCollisionRef = useRef<boolean[][]>([]);
  const snakeSegmentsRef = useRef<CellPoint[]>([]);
  const headDirectionRef = useRef<Dir>("right");
  const logicalFacingRef = useRef<Dir>("right");
  const growthUnitsRef = useRef(0);
  const fruitCollectedPulseRef = useRef(false);
  const snakeFailedRef = useRef(false);
  const resultShownRef = useRef(false);
  const historyRecordedRef = useRef(false);
  const timeLimitTriggeredRef = useRef(false);

  const applesTargetRef = useRef(0);
  const snakeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const originalPlayerAnimationsRef = useRef<Record<string, AnimationDefinition> | null>(null);

  const timerElapsedRef = useRef(0);
  const collectedFruitsRef = useRef(0);
  const blocksUsedRef = useRef(0);
  const lastEvaluatedAstSpecRef = useRef<string | null>(null);
  const lastEvaluatedIsWinRef = useRef(false);
  const isExecutorRunningRef = useRef(false);
  const isSilentSubmitCheckRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutorRunning, setIsExecutorRunning] = useState(false);
  const [isLevelStarted, setIsLevelStarted] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  const [statusText, setStatusText] = useState(t("snake.statusPressStart"));
  const [levelTitle, setLevelTitle] = useState("Snake");
  const [levelObjective, setLevelObjective] = useState(t("snake.objectiveDefault"));
  const [collectedFruits, setCollectedFruits] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [blocksUsed, setBlocksUsed] = useState(0);
  const [mapConfig, setMapConfig] = useState<Partial<MapConfig> | null>(null);
  const [blockConstraints, setBlockConstraints] = useState<LevelBlockConstraints | null>(null);
  const [campaignLevels, setCampaignLevels] = useState<MapLevelItem[]>([]);
  const [activeMapDetailId, setActiveMapDetailId] = useState<string | null>(null);

  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showExecutionIncompleteModal, setShowExecutionIncompleteModal] = useState(false);
  const [showTrapFailedModal, setShowTrapFailedModal] = useState(false);
  const [snakeFailureReason, setSnakeFailureReason] = useState<SnakeFailureReason>("trap");
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [resultsDockVisible, setResultsDockVisible] = useState(false);
  const [showStatusDetailsModal, setShowStatusDetailsModal] = useState(false);
  const [hints, setHints] = useState<GameplayHint[]>([]);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);

  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");
  const [elapsedDisplay, setElapsedDisplay] = useState(0);

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
  const [xpToast, setXpToast] = useState<string>("");
  const [, setLastSubmissionId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(true);
  const [showWinDecisionModal, setShowWinDecisionModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [showClearBlocksConfirmModal, setShowClearBlocksConfirmModal] = useState(false);
  const [pendingSubmitIsWin] = useState(false);
  const showResultPopupRef = useRef(true);

  const nextCampaignLevelId = useMemo(() => {
    if (!campaignLevels.length || !activeMapDetailId) return null;
    const i = campaignLevels.findIndex((level) => level.id === activeMapDetailId);
    if (i < 0 || i >= campaignLevels.length - 1) return null;
    return campaignLevels[i + 1].id;
  }, [campaignLevels, activeMapDetailId]);

  const campaignProgressLabel = useMemo(() => {
    if (campaignLevels.length <= 1 || !activeMapDetailId) return null;
    const i = campaignLevels.findIndex((level) => level.id === activeMapDetailId);
    if (i < 0) return null;
    return `Level ${i + 1} / ${campaignLevels.length}`;
  }, [campaignLevels, activeMapDetailId]);

  const blockTypeLabelMap = useMemo(
    () => new Map(blocksConfig.blocks.map((block) => [block.type, block.label])),
    [],
  );

  const toBlockLabel = useCallback(
    (type: string) => {
      return blockTypeLabelMap.get(type) || type;
    },
    [blockTypeLabelMap],
  );

  const allBlockTypes = useMemo(() => blocksConfig.blocks.map((block) => block.type), []);
  const normalizedAllowedTypes = useMemo(
    () =>
      Array.from(new Set(blockConstraints?.allowedBlocks ?? [])).filter((type) =>
        allBlockTypes.includes(type),
      ),
    [allBlockTypes, blockConstraints?.allowedBlocks],
  );

  const derivedBannedTypesForWorkspace = useMemo(
    () =>
      normalizedAllowedTypes.length > 0
        ? allBlockTypes.filter((type) => !normalizedAllowedTypes.includes(type))
        : (blockConstraints?.bannedBlocks ?? []),
    [allBlockTypes, blockConstraints?.bannedBlocks, normalizedAllowedTypes],
  );

  const requiredBlocks = useMemo(
    () =>
      (blockConstraints?.requiredBlocks ?? []).map((rule) => {
        const label = toBlockLabel(rule.type);
        return rule.minCount > 1 ? `${label} x${rule.minCount}` : label;
      }),
    [blockConstraints?.requiredBlocks, toBlockLabel],
  );

  const allowedBlocks = useMemo(
    () => normalizedAllowedTypes.map((type) => toBlockLabel(type)),
    [normalizedAllowedTypes, toBlockLabel],
  );

  const bannedBlocks = useMemo(
    () => derivedBannedTypesForWorkspace.map((type) => toBlockLabel(type)),
    [derivedBannedTypesForWorkspace, toBlockLabel],
  );

  const missionGoal = useMemo(() => {
    if (mapConfig?.winCondition === 2) {
      if (mapConfig.requiredFruits && mapConfig.requiredFruits > 0) {
        return t("snake.goalCollectAndReach").replace("{n}", String(mapConfig.requiredFruits));
      }
      return t("snake.goalCollectAllAndReach");
    }
    return t("snake.goalReach");
  }, [mapConfig?.requiredFruits, mapConfig?.winCondition, t]);

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

  const currentElapsedForDetails =
    showResultsModal && gameResult ? gameResult.elapsedTime : elapsedDisplay;
  const currentStepsForDetails = showResultsModal && gameResult ? gameResult.stepCount : liveSteps;
  const currentBlocksForDetails =
    showResultsModal && gameResult ? gameResult.blocksUsed : blocksUsed;
  const currentFruitsForDetails =
    showResultsModal && gameResult ? gameResult.fruitsCollected : collectedFruits;

  const handleNextCampaignLevel = useCallback(() => {
    if (!levelId || !nextCampaignLevelId) return;

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
    campaignLevels,
    levelId,
    multiplayerRoomId,
    navigate,
    nextCampaignLevelId,
    roleContext,
    returnTo,
  ]);

  const handleBackToMapFlow = useCallback(() => {
    if (multiplayerRoomId) {
      void leaveLobbyRoom(multiplayerRoomId).then(() => navigate(ROUTES.LEARNER_LEARN));
      return;
    }
    if (isCmsPreview) {
      navigate(returnTo || ROUTES.CMS_MAPS);
      return;
    }
    navigate(-1);
  }, [isCmsPreview, multiplayerRoomId, navigate, returnTo]);

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

  const handleContinueEditingAfterWin = () => {
    const engine = engineRef.current;
    if (!engine) return;

    historyRecordedRef.current = false;
    setSubmitted(false);
    setSubmissionFeedback(null);
    setShowResultsModal(false);
    setResultsDockVisible(false);
    setGameResult(null);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);
    setSnakeFailureReason("trap");
    resultShownRef.current = false;

    resetWormRuntime();
    restoreInitialObjects();
    setCollectedFruits(0);
    collectedFruitsRef.current = 0;
    setLiveSteps(0);
    setBlocksUsed(0);
    blocksUsedRef.current = 0;

    syncSnakeBodyCollision(false);
    engine.reset();
    applyLogicalFacingToEngine(engine);
    setIsLevelStarted(true);
    setStatusText(t("snake.statusWinReadySubmit"));
  };

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

  useEffect(() => {
    if (!multiplayerRoomId) return;
    let unsubRank: (() => void) | undefined;
    let unsubEnd: (() => void) | undefined;
    void gameLobbyHub.connect().then(() => {
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

    void loadMapHints();

    return () => {
      isMounted = false;
    };
  }, [isCmsPreview, levelId]);

  useEffect(() => {
    const limit = mapConfig?.timeLimitSeconds;
    if (limit == null || !Number.isFinite(limit) || limit <= 0) return;
    if (!isLevelStarted) return;
    if (showResultsModal) return;
    if (timeLimitTriggeredRef.current) return;
    if (elapsedDisplay < limit) return;

    timeLimitTriggeredRef.current = true;
    setStatusText(t("gameTimeUpToast"));

    executorRef.current?.stop();
    setIsExecutorRunning(false);

    const engine = engineRef.current;
    if (!engine) return;
    try {
      engine.stop();
    } catch {
      // ignore stop errors during timeout transition
    }

    setGameResult({
      isWin: false,
      stepCount: engine.getStepCount(),
      blocksUsed: blocksUsedRef.current,
      elapsedTime: Math.min(elapsedDisplay, limit),
      fruitsCollected: engine.getCollectedFruitsCount(),
    });
    setShowResultsModal(false);
    setResultsDockVisible(false);
  }, [elapsedDisplay, isLevelStarted, mapConfig?.timeLimitSeconds, showResultsModal, t]);

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
            setStatusText(t("gameSubmitAutoCheckFailed"));
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
        setStatusText(t("gameSubmitAutoCheckFailed"));
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
        blocksUsed: blocksUsedRef.current,
        elapsedTime: timerElapsedRef.current,
        fruitsCollected: collectedFruitsRef.current,
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
            setLastSubmissionId(validateRes.data.submissionId);
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
      } catch (saveErr) {
        console.error("Failed to save play history", saveErr);
        historyRecordedRef.current = false;
      } finally {
        setSubmitLoading(false);
      }
    },
    [activeMapDetailId, levelId, multiplayerRoomId, navigate, submitLoading, submitted, t],
  );

  async function runAutoSubmitPrecheck(targetAstSpec: string): Promise<boolean> {
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
  }

  useEffect(() => {
    collectedFruitsRef.current = collectedFruits;
  }, [collectedFruits]);

  useEffect(() => {
    blocksUsedRef.current = blocksUsed;
  }, [blocksUsed]);

  useEffect(() => {
    isExecutorRunningRef.current = isExecutorRunning;
  }, [isExecutorRunning]);

  useEffect(() => {
    showResultPopupRef.current = showResultPopup;
  }, [showResultPopup]);

  const restoreInitialObjects = useCallback(() => {
    const level = levelRef.current;
    if (!level) return;

    level.objects = initialObjectsRef.current.map((obj) => ({
      ...obj,
      position: { ...obj.position },
      metadata: obj.metadata ? { ...obj.metadata } : undefined,
    }));
  }, []);

  const syncSnakeBodyCollision = useCallback((includeHeadSupport: boolean) => {
    const level = levelRef.current;
    if (!level || baseCollisionRef.current.length === 0) return;

    const collision = level.layers.collision;

    for (let row = 0; row < collision.length; row++) {
      const baseRow = baseCollisionRef.current[row] ?? [];
      const collisionRow = collision[row] ?? [];
      for (let col = 0; col < collisionRow.length; col++) {
        collisionRow[col] = Boolean(baseRow[col]);
      }
    }

    for (const segment of snakeSegmentsRef.current) {
      if (
        segment.row >= 0 &&
        segment.row < collision.length &&
        segment.col >= 0 &&
        segment.col < (collision[segment.row]?.length ?? 0)
      ) {
        collision[segment.row][segment.col] = true;
      }
    }

    if (includeHeadSupport && engineRef.current) {
      const head = engineRef.current.getPlayer();
      if (
        head.y >= 0 &&
        head.y < collision.length &&
        head.x >= 0 &&
        head.x < (collision[head.y]?.length ?? 0)
      ) {
        collision[head.y][head.x] = true;
      }
    }
  }, []);

  const resetWormRuntime = useCallback(() => {
    snakeSegmentsRef.current = [];
    headDirectionRef.current = "right";
    logicalFacingRef.current = "right";
    growthUnitsRef.current = 0;
    fruitCollectedPulseRef.current = false;
    snakeFailedRef.current = false;
    resultShownRef.current = false;
  }, []);

  const applyLogicalFacingToEngine = useCallback((engine: GameEngine) => {
    const player = engine.getPlayer();
    const facing = logicalFacingRef.current;
    player.facing = facing;
    if (facing === "left" || facing === "right") {
      player.direction = facing;
    }
  }, []);

  const hasSnakeSegmentAt = useCallback((col: number, row: number): boolean => {
    return snakeSegmentsRef.current.some((cell) => cell.col === col && cell.row === row);
  }, []);

  const resetTimer = useCallback(() => {
    timeLimitTriggeredRef.current = false;
    timerElapsedRef.current = 0;
    setElapsedDisplay(0);
    setTimerResetSignal((prev) => prev + 1);
  }, []);

  const appendBodyCell = useCallback((x: number, y: number) => {
    snakeSegmentsRef.current.unshift({ col: x, row: y });

    if (growthUnitsRef.current > 0) {
      growthUnitsRef.current -= 1;
      return;
    }

    snakeSegmentsRef.current.pop();
  }, []);

  const buildTraversalCells = useCallback((from: CellPoint, to: CellPoint): CellPoint[] => {
    const cells: CellPoint[] = [];
    let x = from.col;
    let y = from.row;

    while (x !== to.col) {
      x += Math.sign(to.col - x);
      cells.push({ col: x, row: y });
    }
    while (y !== to.row) {
      y += Math.sign(to.row - y);
      cells.push({ col: x, row: y });
    }

    return cells;
  }, []);

  const buildTrailCells = useCallback((from: CellPoint, to: CellPoint): CellPoint[] => {
    const cells: CellPoint[] = [];
    let x = from.col;
    let y = from.row;

    // Always leave a segment at the position the head just left.
    cells.push({ col: x, row: y });

    while (x !== to.col) {
      x += Math.sign(to.col - x);
      if (x === to.col && y === to.row) break;
      cells.push({ col: x, row: y });
    }
    while (y !== to.row) {
      y += Math.sign(to.row - y);
      if (x === to.col && y === to.row) break;
      cells.push({ col: x, row: y });
    }

    return cells;
  }, []);

  const appendBodyPath = useCallback(
    (fromX: number, fromY: number, toX: number, toY: number) => {
      const trail = buildTrailCells({ col: fromX, row: fromY }, { col: toX, row: toY });
      for (const cell of trail) {
        appendBodyCell(cell.col, cell.row);
      }
    },
    [appendBodyCell, buildTrailCells],
  );

  const finishRunAsResult = useCallback(
    (isWin: boolean) => {
      if (resultShownRef.current) return;

      const engine = engineRef.current;
      if (!engine) return;

      if (isWin) {
        resultShownRef.current = true;
        setShowWinDecisionModal(true);
        return;
      }

      resultShownRef.current = true;
      setIsExecutorRunning(false);
      setGameResult({
        isWin,
        stepCount: engine.getStepCount(),
        blocksUsed: blocksUsedRef.current,
        elapsedTime: timerElapsedRef.current,
        fruitsCollected: collectedFruitsRef.current,
      });
      setShowResultsModal(false);
      setResultsDockVisible(false);
    },
    [t],
  );

  const triggerSnakeFailure = useCallback(
    (message: string, reason: SnakeFailureReason = "trap") => {
      if (snakeFailedRef.current) return;

      snakeFailedRef.current = true;
      setSnakeFailureReason(reason);
      executorRef.current?.stop();
      setIsExecutorRunning(false);
      setShowExecutionIncompleteModal(false);
      setShowTrapFailedModal(true);
      setStatusText(message);
    },
    [],
  );

  const executeResultOnEngine = useCallback(
    (result: ExecutionResult): number => {
      const engine = engineRef.current;
      if (!engine) return 420;

      const isMovementType =
        result.command.type === "move" ||
        result.command.type === "moveForward" ||
        result.command.type === "moveToCell" ||
        result.command.type === "jump" ||
        result.command.type === "wait";

      if (result.command.type === "turn") {
        logicalFacingRef.current = rotateDirection90(
          logicalFacingRef.current,
          result.command.rotation,
        );
        headDirectionRef.current = logicalFacingRef.current;
      } else if (result.command.type === "move") {
        logicalFacingRef.current = result.command.direction as Dir;
        headDirectionRef.current = logicalFacingRef.current;
      } else if (result.command.type === "moveForward") {
        headDirectionRef.current = logicalFacingRef.current;
      }

      applyLogicalFacingToEngine(engine);

      const before = engine.getPlayer();
      const beforeCell = { col: before.x, row: before.y };

      // Treat current head cell as temporary support for this step so upward moves can climb.
      syncSnakeBodyCollision(isMovementType);

      if (result.command.type === "moveForward") {
        engine.executeCommand({ type: "move", direction: logicalFacingRef.current });
      } else {
        engine.executeCommand(result.command);
      }

      applyLogicalFacingToEngine(engine);

      const after = engine.getPlayer();
      const afterCell = { col: after.x, row: after.y };
      const moved = beforeCell.col !== afterCell.col || beforeCell.row !== afterCell.row;

      if (moved && isMovementType) {
        const dx = afterCell.col - beforeCell.col;
        const dy = afterCell.row - beforeCell.row;
        if (dy !== 0) {
          headDirectionRef.current = dy > 0 ? "down" : "up";
        } else if (dx !== 0) {
          headDirectionRef.current = dx > 0 ? "right" : "left";
        }

        const traversed = buildTraversalCells(beforeCell, afterCell);
        const hitBody = traversed.some((cell) => hasSnakeSegmentAt(cell.col, cell.row));
        if (hitBody) {
          triggerSnakeFailure(t("snake.errorGameOverSelf"), "self");
          return 420;
        }

        appendBodyPath(beforeCell.col, beforeCell.row, afterCell.col, afterCell.row);
      }

      // Keep collision grid in sync with the latest snake body state.
      syncSnakeBodyCollision(false);

      setLiveSteps(engine.getStepCount());

      const dist = Math.max(
        Math.abs(after.targetPixelX - after.pixelX),
        Math.abs(after.targetPixelY - after.pixelY),
      );
      return Math.max(420, dist / 0.5);
    },
    [
      appendBodyPath,
      applyLogicalFacingToEngine,
      buildTraversalCells,
      hasSnakeSegmentAt,
      syncSnakeBodyCollision,
      triggerSnakeFailure,
    ],
  );

  const hideDefaultPlayerSprite = useCallback(async () => {
    const playerMap = animationRegistry["player"];
    if (!playerMap) return;

    if (!originalPlayerAnimationsRef.current) {
      originalPlayerAnimationsRef.current = Object.fromEntries(
        Object.entries(playerMap).map(([state, def]) => [state, { ...def }]),
      );
    }

    const tinyCanvas = document.createElement("canvas");
    tinyCanvas.width = 1;
    tinyCanvas.height = 1;
    const tinyCtx = tinyCanvas.getContext("2d");
    if (!tinyCtx) return;
    tinyCtx.clearRect(0, 0, 1, 1);

    const transparentImage = await loadImage(tinyCanvas.toDataURL("image/png"));

    for (const [state, def] of Object.entries(playerMap)) {
      playerMap[state] = {
        ...def,
        image: transparentImage,
        frameWidth: 1,
        frameHeight: 1,
        frames: [0],
        row: 0,
        columns: 1,
      };
    }
  }, []);

  const restoreDefaultPlayerSprite = useCallback(() => {
    const original = originalPlayerAnimationsRef.current;
    if (!original) return;

    animationRegistry["player"] = Object.fromEntries(
      Object.entries(original).map(([state, def]) => [state, { ...def }]),
    );
    originalPlayerAnimationsRef.current = null;
  }, []);

  const handleTimerElapsedChange = useCallback((seconds: number) => {
    timerElapsedRef.current = seconds;
    setElapsedDisplay(seconds);
  }, []);

  const handleStartLevel = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    resetTimer();
    engine.start();
    setIsLevelStarted(true);
    setShowMissionModal(false);
    setStatusText(t("snake.statusLevelStarted"));
  }, [resetTimer, t]);

  useEffect(() => {
    const allPaths = [
      snakeAsset.parts.head.up,
      snakeAsset.parts.head.down,
      snakeAsset.parts.head.left,
      snakeAsset.parts.head.right,
      snakeAsset.parts.body.horizontal,
      snakeAsset.parts.body.vertical,
      snakeAsset.parts.body.topLeft,
      snakeAsset.parts.body.topRight,
      snakeAsset.parts.body.bottomLeft,
      snakeAsset.parts.body.bottomRight,
      snakeAsset.parts.tail.up,
      snakeAsset.parts.tail.down,
      snakeAsset.parts.tail.left,
      snakeAsset.parts.tail.right,
    ];

    const uniquePaths = Array.from(new Set(allPaths));

    const load = async () => {
      const loaded = await Promise.all(
        uniquePaths.map(async (path) => {
          const img = await loadImage(path);
          return [path, img] as const;
        }),
      );

      snakeImagesRef.current = new Map(loaded);
    };

    void load();
  }, []);

  useEffect(() => {
    const drawSnakeOverlay = () => {
      const canvas = overlayCanvasRef.current;
      const engine = engineRef.current;
      const images = snakeImagesRef.current;

      if (!canvas || !engine || images.size === 0) {
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const fw = snakeAsset.frameWidth;
      const fh = snakeAsset.frameHeight;
      const offsetX = (TILE_SIZE - fw) / 2;
      const offsetY = (TILE_SIZE - fh) / 2;

      const head = engine.getPlayer();
      const headDir = headDirectionRef.current;
      const headPath = snakeAsset.parts.head[headDir];
      const headImage = images.get(headPath);
      if (headImage) {
        ctx.drawImage(headImage, head.pixelX + offsetX, head.pixelY + offsetY, fw, fh);
      }

      const segments = snakeSegmentsRef.current;
      if (segments.length === 0) return;

      for (let i = 0; i < segments.length; i++) {
        const current = segments[i];
        const x = current.col * TILE_SIZE + offsetX;
        const y = current.row * TILE_SIZE + offsetY;

        const prev = i === 0 ? { col: head.x, row: head.y } : segments[i - 1];
        const next = i === segments.length - 1 ? null : segments[i + 1];

        if (!next) {
          const towardHead = directionFromTo(current, prev);
          if (!towardHead) continue;
          const tailFacing = oppositeDirection(towardHead);
          const tailPath = snakeAsset.parts.tail[tailFacing];
          const tailImage = images.get(tailPath);
          if (tailImage) {
            ctx.drawImage(tailImage, x, y, fw, fh);
          }
          continue;
        }

        const d1 = directionFromTo(current, prev);
        const d2 = directionFromTo(current, next);
        if (!d1 || !d2) continue;

        const bodyKey = resolveBodySpriteKey(d1, d2);
        const bodyPath = snakeAsset.parts.body[bodyKey];
        const bodyImage = images.get(bodyPath);
        if (bodyImage) {
          ctx.drawImage(bodyImage, x, y, fw, fh);
        }
      }
    };

    let rafId = 0;
    const tick = () => {
      drawSnakeOverlay();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let engine: GameEngine | null = null;
    let onFruitCollected:
      | ((event: Extract<EngineEvent, { type: "fruitCollected" }>) => void)
      | null = null;
    let onWin: (() => void) | null = null;
    let onFailed: (() => void) | null = null;
    setIsLoading(true);
    setError(null);

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
        resultShownRef.current = false;

        const loaded = await loadSnakeLevel({ levelId, mapDetailId, levelFile, mapUrl });
        if (disposed) return;

        const level = loaded.level;
        const resolvedWinCondition = loaded.mapConfig?.winCondition === 2 ? 2 : 1;
        const activeMapDetailIdNext = loaded.mapDetailId;

        setMapConfig(loaded.mapConfig ?? null);
        setCampaignLevels(loaded.levels ?? []);
        setActiveMapDetailId(activeMapDetailIdNext);
        if (levelId && activeMapDetailIdNext) {
          markCampaignLevelStarted(levelId, activeMapDetailIdNext);
        }

        // Count fruits from loaded map
        const fruitCount = (level.objects ?? []).filter((o) => o.type === "fruit").length;
        const configRequiredFruits =
          typeof loaded.mapConfig?.requiredFruits === "number" &&
          Number.isFinite(loaded.mapConfig.requiredFruits)
            ? Math.max(0, Math.floor(loaded.mapConfig.requiredFruits))
            : undefined;
        const requiredFruitsTarget =
          resolvedWinCondition === 2
            ? configRequiredFruits !== undefined && configRequiredFruits > 0
              ? Math.min(configRequiredFruits, fruitCount)
              : fruitCount
            : 0;
        applesTargetRef.current = resolvedWinCondition === 2 ? requiredFruitsTarget : fruitCount;
        setLevelTitle(level.name || "Snake");
        const objectiveFromMap = (level.metadata?.levelObjective ?? "").trim();
        setLevelObjective(
          objectiveFromMap.length > 0
            ? objectiveFromMap
            : resolvedWinCondition === 2
              ? t("snake.objectiveCollectRequiredThenGoal")
              : t("snake.objectiveReachGoal"),
        );

        levelRef.current = level;
        setBlockConstraints(level.blockConstraints ?? null);
        initialObjectsRef.current = cloneObjects(level);
        baseCollisionRef.current = level.layers.collision.map((row) => [...row]);

        canvas.width = level.width * TILE_SIZE;
        canvas.height = level.height * TILE_SIZE;
        if (overlayCanvas) {
          overlayCanvas.width = canvas.width;
          overlayCanvas.height = canvas.height;
        }
        setCanvasRenderSize({ width: canvas.width, height: canvas.height });

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context is not available.");

        const config = createGameConfig(LevelType.Platform, {
          winCondition: resolvedWinCondition,
          ...(resolvedWinCondition === 2 ? { requiredFruits: requiredFruitsTarget } : {}),
        });
        engine = new GameEngine(level, TILE_SIZE, ctx, config, "platformer");
        engineRef.current = engine;

        onFruitCollected = (event: Extract<EngineEvent, { type: "fruitCollected" }>) => {
          setCollectedFruits(event.totalCollected);
          fruitCollectedPulseRef.current = true;
          growthUnitsRef.current += 1;
          setStatusText(t("snake.statusAppleCollected"));
        };

        onWin = () => {
          executorRef.current?.stop();
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          lastEvaluatedIsWinRef.current = true;
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          setStatusText(t("snake.statusWinReadySubmit"));
          if (levelId && activeMapDetailIdNext) {
            markCampaignLevelCompleted(levelId, activeMapDetailIdNext);
          }
          finishRunAsResult(true);
        };

        onFailed = () => {
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          triggerSnakeFailure(t("snake.errorGameOverTrap"), "trap");
        };

        engine.on("fruitCollected", onFruitCollected);
        engine.on("win", onWin);
        engine.on("engine:failed", onFailed);

        await engine.initialize();
        await hideDefaultPlayerSprite();
        if (disposed) return;
        engine.reset();
        syncSnakeBodyCollision(false);
        applyLogicalFacingToEngine(engine);
        setAudioSystem(engine.getAudioSystem() ?? null);
        setShowMissionModal(true);
        setIsLoading(false);
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : t("snake.errorInit"));
        setIsLoading(false);
      }
    };

    void initGame();

    return () => {
      disposed = true;
      if (engine) {
        if (onFruitCollected) {
          engine.off("fruitCollected", onFruitCollected);
        }
        if (onWin) {
          engine.off("win", onWin);
        }
        if (onFailed) {
          engine.off("engine:failed", onFailed);
        }
        engine.stop();
      }
      executorRef.current?.stop();
      restoreDefaultPlayerSprite();
    };
  }, [
    applyLogicalFacingToEngine,
    finishRunAsResult,
    hideDefaultPlayerSprite,
    levelFile,
    levelId,
    mapDetailId,
    mapUrl,
    restoreDefaultPlayerSprite,
    syncSnakeBodyCollision,
    t,
    triggerSnakeFailure,
  ]);

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

  const handleWorkspaceReady = useCallback((workspace: Blockly.WorkspaceSvg) => {
    workspaceRef.current = workspace;
  }, []);

  const getAheadCell = useCallback((engine: GameEngine): CellPoint => {
    const player = engine.getPlayer();
    const delta = DIR_DELTA[logicalFacingRef.current];
    return {
      col: player.x + delta.dx,
      row: player.y + delta.dy,
    };
  }, []);

  const handleRunProgram = useCallback(() => {
    const engine = engineRef.current;
    const workspace = workspaceRef.current;
    if (!engine || !workspace) {
      window.alert(t("gameNotReadyYet"));
      return;
    }

    if (!isLevelStarted) {
      handleStartLevel();
    }

    const existingExecutor = executorRef.current;
    if (existingExecutor && existingExecutor.hasNext()) {
      isExecutorRunningRef.current = true;
      setIsExecutorRunning(true);
      existingExecutor.run(
        (result) => executeResultOnEngine(result),
        420,
        () => {
          isExecutorRunningRef.current = false;
          setIsExecutorRunning(false);
          if (isSilentSubmitCheckRef.current) {
            return;
          }
          if (
            !snakeFailedRef.current &&
            !resultShownRef.current &&
            !engine.hasWon() &&
            engine.getState() !== EngineState.Failed
          ) {
            setShowExecutionIncompleteModal(true);
            setStatusText(t("snake.statusProgramEndedBeforeWin"));
          }
        },
      );
      return;
    }

    const program: BlockProgram = generateAST(workspace);
    lastEvaluatedAstSpecRef.current = JSON.stringify(program);
    lastEvaluatedIsWinRef.current = false;
    if (program.length === 0) {
      window.alert(t("noBlocksInWorkspace"));
      return;
    }

    const placedBlocks = workspace.getAllBlocks(false).filter((block) => !block.isShadow());
    const blockUsage = placedBlocks.reduce<Record<string, number>>((acc, block) => {
      acc[block.type] = (acc[block.type] ?? 0) + 1;
      return acc;
    }, {});

    const constraints = engine.getBlockConstraints();
    if (constraints) {
      const allowedTypes = Array.from(new Set(constraints.allowedBlocks ?? [])).filter((type) =>
        allBlockTypes.includes(type),
      );

      if (allowedTypes.length > 0) {
        for (const usedType of Object.keys(blockUsage)) {
          if (!allowedTypes.includes(usedType)) {
            setStatusText(`${t("blockNotAllowed")}: ${toBlockLabel(usedType)}.`);
            return;
          }
        }
      } else {
        for (const bannedType of constraints.bannedBlocks || []) {
          const used = blockUsage[bannedType] ?? 0;
          if (used > 0) {
            setStatusText(`${t("blockNotAllowed")}: ${toBlockLabel(bannedType)}.`);
            return;
          }
        }
      }

      for (const rule of constraints.requiredBlocks || []) {
        const used = blockUsage[rule.type] ?? 0;
        if (used < rule.minCount) {
          setStatusText(
            `${t("requiredBlockMissing")}: ${toBlockLabel(rule.type)} (${used}/${rule.minCount}).`,
          );
          return;
        }
      }

      const blockLimit = constraints.blockLimit;
      if (typeof blockLimit === "number" && Number.isFinite(blockLimit) && blockLimit > 0) {
        const totalUsed = Object.values(blockUsage).reduce((sum, count) => sum + (count || 0), 0);
        if (totalUsed > blockLimit) {
          setStatusText(
            `${t("blockLimitExceeded")} (${totalUsed}/${blockLimit}). ${t("runningAnyway")}.`,
          );
        }
      }
    }

    const conditionChecker = (condition: ConditionType): boolean => {
      applyLogicalFacingToEngine(engine);
      const ahead = getAheadCell(engine);
      const snakeAhead = hasSnakeSegmentAt(ahead.col, ahead.row);

      switch (condition) {
        case "pathAhead":
          return !engine.isWallAhead() && !engine.isObstacleAhead() && !snakeAhead;
        case "wallAhead":
          return engine.isWallAhead();
        case "obstacleAhead":
          return engine.isObstacleAhead() || snakeAhead;
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
          return snakeAhead;
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

    const positionResolver: PositionResolver = {
      getStartCell: () => engine.getStartCell(),
      getGoalCell: () => engine.getGoalCell(),
      getCurrentCell: () => engine.getCurrentCell(),
      getNeighbors: (cell: string) => engine.getNeighbors(cell),
      getCharacterAtCurrentCell: () => engine.getCharacterAtCurrentCell(),
      hasCharacterAtCurrentCell: () => engine.hasCharacterAtCurrentCell(),
    };

    executorRef.current?.stop();
    fruitCollectedPulseRef.current = false;
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);

    const executor = new StepExecutor(program, conditionChecker, undefined, positionResolver);
    executor.setWarningCallback((message) => {
      setStatusText(message);
    });
    executorRef.current = executor;

    isExecutorRunningRef.current = true;
    setIsExecutorRunning(true);
    setStatusText(t("snake.statusRunningProgram"));

    executor.run(
      (result) => executeResultOnEngine(result),
      420,
      () => {
        isExecutorRunningRef.current = false;
        setIsExecutorRunning(false);
        if (isSilentSubmitCheckRef.current) {
          return;
        }
        if (
          !snakeFailedRef.current &&
          !resultShownRef.current &&
          !engine.hasWon() &&
          engine.getState() !== EngineState.Failed
        ) {
          setShowExecutionIncompleteModal(true);
          setStatusText(t("snake.statusProgramEndedBeforeWin"));
        }
      },
    );
  }, [
    allBlockTypes,
    applyLogicalFacingToEngine,
    executeResultOnEngine,
    getAheadCell,
    handleStartLevel,
    hasSnakeSegmentAt,
    isLevelStarted,
    t,
    toBlockLabel,
  ]);

  const handleStepExecution = useCallback(() => {
    const engine = engineRef.current;
    const executor = executorRef.current;

    if (!engine || !executor) {
      window.alert(t("runProgramFirst"));
      return;
    }

    if (!isLevelStarted) {
      handleStartLevel();
    }

    if (!executor.hasNext()) {
      setStatusText(t("snake.statusNoMoreSteps"));
      return;
    }

    const result = executor.next();
    if (result) {
      executeResultOnEngine(result);
    }

    if (!executor.hasNext()) {
      setIsExecutorRunning(false);
      if (
        !snakeFailedRef.current &&
        !resultShownRef.current &&
        !engine.hasWon() &&
        engine.getState() !== EngineState.Failed
      ) {
        setShowExecutionIncompleteModal(true);
      }
    }
  }, [executeResultOnEngine, handleStartLevel, isLevelStarted, t]);

  const handleStopProgram = useCallback(() => {
    executorRef.current?.stop();
    setIsExecutorRunning(false);
    setStatusText(t("snake.statusExecutionStopped"));
  }, [t]);

  const handleReset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    executorRef.current?.stop();
    executorRef.current = null;

    resetWormRuntime();
    restoreInitialObjects();
    resetTimer();

    setCollectedFruits(0);
    setLiveSteps(0);
    setBlocksUsed(0);
    setIsExecutorRunning(false);
    setIsLevelStarted(false);
    setShowMissionModal(true);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(false);
    setSnakeFailureReason("trap");
    setShowResultsModal(false);
    setResultsDockVisible(false);
    setShowWinDecisionModal(false);
    setShowSubmitConfirmModal(false);
    setShowClearBlocksConfirmModal(false);
    setGameResult(null);
    setSubmissionFeedback(null);
    setStatusText(t("snake.statusResetComplete"));
    setLastSubmissionId(null);
    setSubmitted(false);
    historyRecordedRef.current = false;

    syncSnakeBodyCollision(false);
    engine.reset();
    applyLogicalFacingToEngine(engine);
  }, [
    applyLogicalFacingToEngine,
    resetTimer,
    resetWormRuntime,
    restoreInitialObjects,
    syncSnakeBodyCollision,
    t,
  ]);

  const handlePlayAgain = useCallback(() => {
    setResultsDockVisible(false);
    setSubmitted(false);
    workspaceRef.current?.clear();
    handleReset();
  }, [handleReset]);

  const handleClearBlocks = useCallback(() => {
    if (!workspaceRef.current) return;
    setShowClearBlocksConfirmModal(true);
  }, []);

  const controlButtonStyle = (
    variant: "neutral" | "primary" | "danger" | "warning",
    disabled: boolean,
  ): CSSProperties => {
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
      {xpToast ? (
        <AlertToast type="success" message={xpToast} onClose={() => setXpToast("")} />
      ) : null}

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
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <button onClick={handleBackToMapFlow} style={controlButtonStyle("neutral", false)}>
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
            )}
          >
            <Send size={15} /> {submitted ? t("submitted") : t("submitSolution")}
          </button>

          {multiplayerRoomId && (
            <button onClick={handleEndMultiplayerGame} style={controlButtonStyle("warning", false)}>
              <Flag size={15} /> {t("endGame")}
            </button>
          )}

          <button
            onClick={handleRunProgram}
            disabled={isLoading || !!error || isExecutorRunning}
            style={controlButtonStyle("primary", isLoading || !!error || isExecutorRunning)}
          >
            <Play size={15} /> {t("runProgram")}
          </button>
          <button
            onClick={handleStepExecution}
            disabled={isLoading || !!error || isExecutorRunning}
            style={controlButtonStyle("primary", isLoading || !!error || isExecutorRunning)}
          >
            <SkipForward size={15} /> {t("stepExecution")}
          </button>
          <button
            onClick={handleStopProgram}
            disabled={isLoading || !!error}
            style={controlButtonStyle("danger", isLoading || !!error)}
          >
            <Pause size={15} /> {t("stop")}
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading || !!error}
            style={controlButtonStyle("warning", isLoading || !!error)}
          >
            <RotateCcw size={15} /> {t("reset")}
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)" }}>
          {t("loadingLevel")}
        </div>
      )}

      {error && (
        <div style={{ padding: "20px", color: "var(--danger)" }}>
          <h3>{t("errorLoadingGame")}</h3>
          <p>{error}</p>
        </div>
      )}

      <div
        style={{
          display: isLoading || error ? "none" : "flex",
          flexDirection: isCompactLayout ? "column" : "row",
          gap: "14px",
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: isCompactLayout ? "1 1 auto" : "6 1 0",
            minHeight: 0,
            borderRadius: "18px",
            border: "1px solid var(--border)",
            background: "color-mix(in srgb, var(--surface) 92%, transparent)",
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}
              >
                ⏱️
                <GameTimer
                  engineRef={engineRef}
                  isLoading={isLoading}
                  error={error}
                  resetSignal={timerResetSignal}
                  onElapsedTimeChange={handleTimerElapsedChange}
                  compact
                  isActive={isLevelStarted && !showResultsModal}
                />
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}
              >
                👣 <strong>{liveSteps}</strong>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}
              >
                🍎 <strong>{collectedFruits}</strong> / {applesTargetRef.current}
              </div>

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

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
              <div style={{ fontSize: "12px", color: "var(--text-2)" }}>{statusText}</div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowHintsModal(true);
                }}
                style={{
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
          </div>

          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
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
            <strong>{t("gameObjectiveLabel")}:</strong> {levelObjective}
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

            <div
              ref={canvasViewportRef}
              style={{
                flex: 1,
                minHeight: 0,
                borderRadius: "16px",
                border: "1px solid var(--border)",
                background: "linear-gradient(180deg, var(--surface-2), var(--surface))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                overflow: zoomMode === "fit" ? "hidden" : "auto",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: `${Math.round(canvasRenderSize.width * canvasScale)}px`,
                  height: `${Math.round(canvasRenderSize.height * canvasScale)}px`,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                <canvas
                  ref={canvasRef}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    display: "block",
                    background: "var(--surface)",
                    width: "100%",
                    height: "100%",
                  }}
                />
                <canvas
                  ref={overlayCanvasRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "10px",
                    width: "100%",
                    height: "100%",
                    pointerEvents: "none",
                  }}
                />
              </div>
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
              }}
              title={t("clearBlocks")}
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
              onBlockCountChange={setBlocksUsed}
              onConstraintViolation={setStatusText}
              blockLimit={null}
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
        fruitsTotal={applesTargetRef.current || null}
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
        title={
          snakeFailureReason === "self" ? t("snake.failureSelfTitle") : t("snake.failureTrapTitle")
        }
        description={
          snakeFailureReason === "self"
            ? t("snake.failureSelfDescription")
            : t("snake.failureTrapDescription")
        }
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
          void handleSubmitRun({ skipConfirm: true });
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
          void handleSubmitRun({ skipConfirm: true });
        }}
        onSecondary={() => {
          setShowSubmitConfirmModal(false);
        }}
      />

      <RunDecisionModal
        isOpen={showClearBlocksConfirmModal}
        title={t("clearWorkspace")}
        description={t("clearAllBlocksConfirm")}
        primaryLabel={t("gameSubmitConfirmYes")}
        secondaryLabel={t("gameSubmitConfirmNo")}
        onPrimary={() => {
          setShowClearBlocksConfirmModal(false);
          workspaceRef.current?.clear();
        }}
        onSecondary={() => {
          setShowClearBlocksConfirmModal(false);
        }}
      />

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
          stepEstimated={mapConfig?.estimatedSteps ?? 120}
          blockLimit={blockConstraints?.blockLimit ?? null}
          onNextLevel={
            gameResult.isWin && nextCampaignLevelId ? handleNextCampaignLevel : undefined
          }
          nextLevelLabel="Next level"
          multiplayerFooterNote={multiplayerRoomId && submitted ? t("multiplayerWaitOthers") : null}
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
          onReset={() => {
            setShowResultsModal(false);
            handlePlayAgain();
          }}
          onBackToMenu={handleBackToMapFlow}
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
