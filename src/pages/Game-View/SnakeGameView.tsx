import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as Blockly from "blockly";
import { ArrowLeft, Eraser, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { EngineState, GameEngine } from "@/modules/engine/core/GameEngine";
import { LevelType, createGameConfig } from "@/modules/engine/core/GameConfig";
import type { LevelDefinition } from "@/modules/map-system/types";
import type { ExecutionResult } from "@/modules/executor/commands";
import type { BlockProgram, ConditionType, PositionResolver } from "@/modules/executor/types";
import type { EngineEvent } from "@/modules/engine/core/engineEvents";
import { StepExecutor } from "@/modules/executor/StepExecutor";
import { animationRegistry } from "@/modules/engine/systems/animation/animationRegistry";
import type { AnimationDefinition } from "@/modules/engine/systems/animation/animationTypes";
import BlocklyWorkspace from "@/tools/block-editor/components/BlocklyWorkspace";
import { generateAST } from "@/tools/block-editor/blocks/registerGenerators";
import { loadLevelFromAPI } from "@/utils/levelLoader";
import snakeAssetRaw from "@/shared/assets/platformer/snake/object/snake.json";
import { BlockCounter } from "./BlockCounter";
import GameTimer from "./GameTimer";
import { AudioControls } from "./AudioControls";
import { LevelMissionModal } from "./LevelMissionModal";
import { ExecutionIncompleteModal } from "./ExecutionIncompleteModal";
import { TrapFailedModal } from "./TrapFailedModal";
import { GameResultsModal } from "./GameResultsModal";

interface CellPoint {
  row: number;
  col: number;
}

type Dir = "up" | "down" | "left" | "right";

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
  basePath?: string;
  frameWidth: number;
  frameHeight: number;
  parts: SnakePartSet;
};

const snakeAsset = snakeAssetRaw as SnakeAssetDefinition;

const TILE_SIZE = 48;

const DIR_DELTA: Record<Dir, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

const DEFAULT_SNAKE_MAP_FILE = "snakemap";

type SnakeGameLocationState = {
  levelId?: string;
  mapDetailId?: string;
  levelFile?: string;
  mapUrl?: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function directionFromTo(from: CellPoint, to: CellPoint): Dir | null {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  if (dx === 1 && dy === 0) return "right";
  if (dx === -1 && dy === 0) return "left";
  if (dx === 0 && dy === 1) return "down";
  if (dx === 0 && dy === -1) return "up";
  return null;
}

function oppositeDirection(dir: Dir): Dir {
  switch (dir) {
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

function rotateDirection90(current: Dir, rotation: "clockwise" | "counterclockwise"): Dir {
  if (rotation === "clockwise") {
    const clockwiseMap: Record<Dir, Dir> = {
      up: "right",
      right: "down",
      down: "left",
      left: "up",
    };
    return clockwiseMap[current];
  }

  const counterclockwiseMap: Record<Dir, Dir> = {
    up: "left",
    left: "down",
    down: "right",
    right: "up",
  };
  return counterclockwiseMap[current];
}

function resolveBodySpriteKey(a: Dir, b: Dir): keyof SnakePartSet["body"] {
  const key = new Set<Dir>([a, b]);
  if (key.has("left") && key.has("right")) return "horizontal";
  if (key.has("up") && key.has("down")) return "vertical";
  if (key.has("up") && key.has("left")) return "topLeft";
  if (key.has("up") && key.has("right")) return "topRight";
  if (key.has("down") && key.has("left")) return "bottomLeft";
  return "bottomRight";
}

async function loadSnakeLevelFromMock(pathOrFile?: string): Promise<LevelDefinition> {
  const raw = (pathOrFile ?? DEFAULT_SNAKE_MAP_FILE).trim();
  const resolvedUrl =
    raw.startsWith("/")
      ? raw
      : raw.endsWith(".json")
        ? `/mockdata/${raw}`
        : `/mockdata/${raw}.json`;

  const res = await fetch(resolvedUrl);
  if (!res.ok) throw new Error(`Failed to load snake map: ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await res.json()) as any;

  return {
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
}

async function loadSnakeLevel(options: SnakeGameLocationState): Promise<LevelDefinition> {
  if (options.levelId) {
    const apiLevel = await loadLevelFromAPI(options.levelId, {
      mapDetailId: options.mapDetailId,
    });
    return apiLevel.level;
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
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as SnakeGameLocationState | null;
  const levelId = routeState?.levelId;
  const mapDetailId = routeState?.mapDetailId;
  const levelFile = routeState?.levelFile;
  const mapUrl = routeState?.mapUrl;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);

  const levelRef = useRef<LevelDefinition | null>(null);
  const initialObjectsRef = useRef<NonNullable<LevelDefinition["objects"]>>([]);
  const snakeSegmentsRef = useRef<CellPoint[]>([]);
  const headDirectionRef = useRef<Dir>("right");
  const logicalFacingRef = useRef<Dir>("right");
  const growthUnitsRef = useRef(0);
  const fruitCollectedPulseRef = useRef(false);
  const snakeFailedRef = useRef(false);
  const resultShownRef = useRef(false);

  const applesTargetRef = useRef(0);
  const snakeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const originalPlayerAnimationsRef = useRef<Record<string, AnimationDefinition> | null>(null);

  const timerElapsedRef = useRef(0);
  const collectedFruitsRef = useRef(0);
  const blocksUsedRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExecutorRunning, setIsExecutorRunning] = useState(false);
  const [isLevelStarted, setIsLevelStarted] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);

  const [statusText, setStatusText] = useState("Press Start Level, then Run your block program.");
  const [levelTitle, setLevelTitle] = useState("Snake");
  const [levelObjective, setLevelObjective] = useState("Collect all apples with gravity and avoid your own body.");
  const [collectedFruits, setCollectedFruits] = useState(0);
  const [liveSteps, setLiveSteps] = useState(0);
  const [blocksUsed, setBlocksUsed] = useState(0);

  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showExecutionIncompleteModal, setShowExecutionIncompleteModal] = useState(false);
  const [showTrapFailedModal, setShowTrapFailedModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);

  const [timerResetSignal, setTimerResetSignal] = useState(0);
  const [canvasRenderSize, setCanvasRenderSize] = useState({ width: 0, height: 0 });
  const [canvasScale, setCanvasScale] = useState(1);
  const [zoomMode, setZoomMode] = useState<"fit" | "actual">("fit");

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

  useEffect(() => {
    collectedFruitsRef.current = collectedFruits;
  }, [collectedFruits]);

  useEffect(() => {
    blocksUsedRef.current = blocksUsed;
  }, [blocksUsed]);

  const restoreInitialObjects = useCallback(() => {
    const level = levelRef.current;
    if (!level) return;

    level.objects = initialObjectsRef.current.map((obj) => ({
      ...obj,
      position: { ...obj.position },
      metadata: obj.metadata ? { ...obj.metadata } : undefined,
    }));
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
    timerElapsedRef.current = 0;
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

  const finishRunAsResult = useCallback((isWin: boolean) => {
    if (resultShownRef.current) return;

    const engine = engineRef.current;
    if (!engine) return;

    resultShownRef.current = true;
    setIsExecutorRunning(false);
    setGameResult({
      isWin,
      stepCount: engine.getStepCount(),
      blocksUsed: blocksUsedRef.current,
      elapsedTime: timerElapsedRef.current,
      fruitsCollected: collectedFruitsRef.current,
    });
    setShowResultsModal(true);
  }, []);

  const triggerSnakeFailure = useCallback((message: string) => {
    if (snakeFailedRef.current) return;

    snakeFailedRef.current = true;
    executorRef.current?.stop();
    setIsExecutorRunning(false);
    setShowExecutionIncompleteModal(false);
    setShowTrapFailedModal(true);
    setStatusText(message);
  }, []);

  const executeResultOnEngine = useCallback(
    (result: ExecutionResult): number => {
      const engine = engineRef.current;
      if (!engine) return 420;

      if (result.command.type === "turn") {
        logicalFacingRef.current = rotateDirection90(logicalFacingRef.current, result.command.rotation);
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

      if (result.command.type === "moveForward") {
        engine.executeCommand({ type: "move", direction: logicalFacingRef.current });
      } else {
        engine.executeCommand(result.command);
      }

      applyLogicalFacingToEngine(engine);

      const after = engine.getPlayer();
      const afterCell = { col: after.x, row: after.y };
      const moved = beforeCell.col !== afterCell.col || beforeCell.row !== afterCell.row;

      const isMovementType =
        result.command.type === "move" ||
        result.command.type === "moveForward" ||
        result.command.type === "moveToCell" ||
        result.command.type === "jump" ||
        result.command.type === "wait";

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
          triggerSnakeFailure("Game over: your worm collided with itself.");
          return 420;
        }

        appendBodyPath(beforeCell.col, beforeCell.row, afterCell.col, afterCell.row);
      }

      setLiveSteps(engine.getStepCount());

      const dist = Math.max(
        Math.abs(after.targetPixelX - after.pixelX),
        Math.abs(after.targetPixelY - after.pixelY),
      );
      return Math.max(420, dist / 0.5);
    },
    [appendBodyPath, applyLogicalFacingToEngine, buildTraversalCells, hasSnakeSegmentAt, triggerSnakeFailure],
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
  }, []);

  const handleStartLevel = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    resetTimer();
    engine.start();
    setIsLevelStarted(true);
    setShowMissionModal(false);
    setStatusText("Level started. Press Run to execute blocks.");
  }, [resetTimer]);

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
    let onFruitCollected: ((event: Extract<EngineEvent, { type: "fruitCollected" }>) => void) | null = null;
    let onFailed: (() => void) | null = null;
    setIsLoading(true);
    setError(null);

    const initGame = async () => {
      try {
        const level = await loadSnakeLevel({ levelId, mapDetailId, levelFile, mapUrl });
        if (disposed) return;

        // Count fruits from loaded map
        const fruitCount = (level.objects ?? []).filter((o) => o.type === "fruit").length;
        applesTargetRef.current = fruitCount;
        setLevelTitle(level.name || "Snake");
        const objectiveFromMap = (level.metadata?.levelObjective ?? "").trim();
        setLevelObjective(
          objectiveFromMap.length > 0
            ? objectiveFromMap
            : "Collect all apples with gravity and avoid your own body.",
        );

        levelRef.current = level;
        initialObjectsRef.current = cloneObjects(level);

        canvas.width = level.width * TILE_SIZE;
        canvas.height = level.height * TILE_SIZE;
        if (overlayCanvas) {
          overlayCanvas.width = canvas.width;
          overlayCanvas.height = canvas.height;
        }
        setCanvasRenderSize({ width: canvas.width, height: canvas.height });

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context is not available.");

        const config = createGameConfig(LevelType.Platform, { winCondition: 1, requiredFruits: 0 });
        engine = new GameEngine(level, TILE_SIZE, ctx, config, "platformer");
        engineRef.current = engine;

        onFruitCollected = (event: Extract<EngineEvent, { type: "fruitCollected" }>) => {
          setCollectedFruits(event.totalCollected);
          fruitCollectedPulseRef.current = true;
          growthUnitsRef.current += 1;
          setStatusText("Apple collected. Worm grows.");

          if (event.totalCollected >= applesTargetRef.current) {
            executorRef.current?.stop();
            setStatusText("All apples collected. Stage complete.");
            finishRunAsResult(true);
          }
        };

        onFailed = () => {
          triggerSnakeFailure("Game over.");
        };

        engine.on("fruitCollected", onFruitCollected);
        engine.on("engine:failed", onFailed);

        await engine.initialize();
        await hideDefaultPlayerSprite();
        if (disposed) return;
        engine.reset();
        applyLogicalFacingToEngine(engine);
        setAudioSystem(engine.getAudioSystem() ?? null);
        setShowMissionModal(true);
        setIsLoading(false);
      } catch (err) {
        if (disposed) return;
        setError(err instanceof Error ? err.message : "Failed to initialize snake level.");
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
      window.alert("Game is not ready yet.");
      return;
    }

    if (!isLevelStarted) {
      handleStartLevel();
    }

    const existingExecutor = executorRef.current;
    if (existingExecutor && existingExecutor.hasNext()) {
      setIsExecutorRunning(true);
      existingExecutor.run(
        (result) => executeResultOnEngine(result),
        420,
        () => {
          setIsExecutorRunning(false);
          if (
            !snakeFailedRef.current &&
            !resultShownRef.current &&
            collectedFruitsRef.current < applesTargetRef.current &&
            engine.getState() !== EngineState.Failed
          ) {
            setShowExecutionIncompleteModal(true);
            setStatusText("Program ended before collecting all apples.");
          }
        },
      );
      return;
    }

    const program: BlockProgram = generateAST(workspace);
    if (program.length === 0) {
      window.alert("No blocks in workspace. Add blocks first.");
      return;
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
          return collectedFruitsRef.current >= applesTargetRef.current;
        case "enemyAhead":
          return engine.isEnemyAhead();
        case "trapAhead":
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

    setIsExecutorRunning(true);
    setStatusText("Running block program...");

    executor.run(
      (result) => executeResultOnEngine(result),
      420,
      () => {
        setIsExecutorRunning(false);
        if (
          !snakeFailedRef.current &&
          !resultShownRef.current &&
          collectedFruitsRef.current < applesTargetRef.current &&
          engine.getState() !== EngineState.Failed
        ) {
          setShowExecutionIncompleteModal(true);
          setStatusText("Program ended before collecting all apples.");
        }
      },
    );
  }, [
    applyLogicalFacingToEngine,
    executeResultOnEngine,
    getAheadCell,
    handleStartLevel,
    hasSnakeSegmentAt,
    isLevelStarted,
  ]);

  const handleStepExecution = useCallback(() => {
    const engine = engineRef.current;
    const executor = executorRef.current;

    if (!engine || !executor) {
      window.alert("Run Program first, then use Step.");
      return;
    }

    if (!isLevelStarted) {
      handleStartLevel();
    }

    if (!executor.hasNext()) {
      setStatusText("No more steps to execute.");
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
        collectedFruitsRef.current < applesTargetRef.current &&
        engine.getState() !== EngineState.Failed
      ) {
        setShowExecutionIncompleteModal(true);
      }
    }
  }, [executeResultOnEngine, handleStartLevel, isLevelStarted]);

  const handleStopProgram = useCallback(() => {
    executorRef.current?.stop();
    setIsExecutorRunning(false);
    setStatusText("Execution stopped.");
  }, []);

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
    setShowResultsModal(false);
    setGameResult(null);
    setStatusText("Reset complete.");

    engine.reset();
    applyLogicalFacingToEngine(engine);
  }, [applyLogicalFacingToEngine, resetTimer, resetWormRuntime, restoreInitialObjects]);

  const handlePlayAgain = useCallback(() => {
    workspaceRef.current?.clear();
    handleReset();
  }, [handleReset]);

  const handleClearBlocks = useCallback(() => {
    if (!workspaceRef.current) return;
    if (!window.confirm("Clear all blocks in workspace?")) return;
    workspaceRef.current.clear();
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
          <button onClick={() => navigate(-1)} style={controlButtonStyle("neutral", false)}>
            <ArrowLeft size={15} /> Back
          </button>
          <button
            onClick={handleRunProgram}
            disabled={isLoading || !!error || isExecutorRunning}
            style={controlButtonStyle("primary", isLoading || !!error || isExecutorRunning)}
          >
            <Play size={15} /> Run Program
          </button>
          <button
            onClick={handleStepExecution}
            disabled={isLoading || !!error || isExecutorRunning}
            style={controlButtonStyle("primary", isLoading || !!error || isExecutorRunning)}
          >
            <SkipForward size={15} /> Step
          </button>
          <button
            onClick={handleStopProgram}
            disabled={isLoading || !!error}
            style={controlButtonStyle("danger", isLoading || !!error)}
          >
            <Pause size={15} /> Stop
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading || !!error}
            style={controlButtonStyle("warning", isLoading || !!error)}
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <AudioControls key={audioSystem ? "ready" : "none"} audioSystem={audioSystem} />
        </div>
      </div>

      {isLoading && (
        <div style={{ padding: "20px", textAlign: "center", color: "var(--text)" }}>
          Loading level...
        </div>
      )}

      {error && (
        <div style={{ padding: "20px", color: "var(--danger)" }}>
          <h3>Error loading game</h3>
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
            }}
          >
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}>
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
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}>
                👣 <strong>{liveSteps}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text)" }}>
                🍎 <strong>{collectedFruits}</strong> / {applesTargetRef.current}
              </div>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-2)" }}>{statusText}</div>
          </div>

          <div
            style={{
              padding: "8px 16px",
              borderBottom: "1px solid var(--border)",
              background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
              fontSize: "13px",
              color: "var(--text)",
            }}
          >
            <strong>Objective:</strong> {levelObjective}
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
                  Actual
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
              <h3 style={{ margin: 0, color: "var(--text)", fontSize: "16px" }}>Block Editor</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-2)" }}>
                Use blocks to control the worm
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
              title="Clear all blocks"
            >
              <Eraser size={14} /> Clear
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
            <BlockCounter used={blocksUsed} limit={null} />
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
              onBlockCountChange={setBlocksUsed}
              blockLimit={null}
            />
          </div>
        </div>
      </div>

      <LevelMissionModal
        isOpen={showMissionModal && !isLoading && !error}
        levelTitle={levelTitle}
        goal="Collect all apples"
        blockLimit={null}
        requiredBlocks={[]}
        allowedBlocks={[]}
        bannedBlocks={[]}
        onStart={handleStartLevel}
        onClose={handleStartLevel}
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

      {gameResult && (
        <GameResultsModal
          isOpen={showResultsModal}
          isWin={gameResult.isWin}
          stepCount={gameResult.stepCount}
          blocksUsed={gameResult.blocksUsed}
          elapsedTime={gameResult.elapsedTime}
          fruitsCollected={gameResult.fruitsCollected}
          timeLimitSeconds={null}
          timeStarThresholdPercent={100}
          stepEstimated={120}
          blockLimit={null}
          onReset={() => {
            setShowResultsModal(false);
            handlePlayAgain();
          }}
          onBackToMenu={() => navigate(-1)}
        />
      )}
    </div>
  );
}
