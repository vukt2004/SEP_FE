import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Scan, ArrowLeft } from "lucide-react";
import { EditorStore } from "../../tools/map-editor/store/editorStore";
import { EditorCanvas } from "../../tools/map-editor/components/EditorCanvas";
import { createEmptyMap } from "../../tools/map-editor/utils/createEmptyMap";
import type { MapUploadLevelInput } from "../../tools/map-editor/utils/buildMapUploadJson";
import { MapEditorControls } from "./MapEditorControls";
import type { MapData } from "../../shared/types/MapSchema";
import { learnerMapsApi } from "../../services/api/learner/maps.api";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import { tokenStorage } from "../../lib/storage/tokenStorage";
import type { MapDetail, MapLevelItem } from "@/types/api/learner/maps";
import type { RequiredBlockRule } from "../../shared/types/MapSchema";
import blocksConfig from "../../shared/block/blocks-config.json";
import {
  canCreateMaps,
  getCurrentUserPlan,
  type SubscriptionPlan,
} from "@/lib/auth/subscriptionPlan";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";
import { extractLearnedTags } from "@/lib/maps/learnedTags";

type MapEditorRouteState = {
  mapId?: string;
  mode?: "edit" | "view";
  roleContext?: "learner" | "cms";
};

type MapDetailLike = {
  title: string;
  description: string;
  type: "Topdown" | "Platform" | "Snake";
  difficulty: number;
  timeLimitMs: number;
  estimatedSteps?: number;
  winCondition: number;
  price: number;
  hints?: Array<{ orderNo: number; content: string }>;
  tagNames?: string[];
  avatarUrl?: string | null;
  mapDetailJson?: unknown;
  activeSpec?: {
    gridSpec?: string;
  };
};

const normalizeApiLevelType = (value: unknown): "Topdown" | "Platform" | "Snake" => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "platform") return "Platform";
  if (normalized === "snake") return "Snake";
  return "Topdown";
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const clampDifficulty = (value: number): 1 | 2 | 3 | 4 | 5 => {
  if (value <= 1) return 1;
  if (value >= 5) return 5;
  return value as 1 | 2 | 3 | 4 | 5;
};

const clampWinCondition = (value: number): 1 | 2 => {
  return value === 2 ? 2 : 1;
};

const clampTimeStarThresholdPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 100;
  return Math.max(1, Math.min(100, Math.floor(value)));
};

const normalizeNumberLayer = (
  layer: unknown,
  width: number,
  height: number,
  fallbackValue: number = 0,
): number[][] => {
  if (!Array.isArray(layer)) {
    return Array.from({ length: height }, () => Array(width).fill(fallbackValue));
  }

  return Array.from({ length: height }, (_, rowIndex) => {
    const row = Array.isArray(layer[rowIndex]) ? (layer[rowIndex] as unknown[]) : [];
    return Array.from({ length: width }, (_, colIndex) => {
      const cell = row[colIndex];
      if (typeof cell === "boolean") return cell ? 1 : 0;
      return toNumber(cell, fallbackValue);
    });
  });
};

const normalizeBlockLimit = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.floor(value));
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  );
};

const normalizeRequiredBlocks = (value: unknown): RequiredBlockRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { type: string; minCount: number } =>
        isRecord(item) && typeof item.type === "string" && typeof item.minCount === "number",
    )
    .map((item) => ({
      type: item.type,
      minCount: Math.max(1, Math.floor(item.minCount)),
    }));
};

const toNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeRemoteMediaUrl = (rawUrl: string): string => {
  const url = rawUrl.trim();
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  const apiBase = toNonEmptyString(import.meta.env.VITE_API_BASE_URL);
  if (apiBase) {
    try {
      return new URL(url, apiBase).toString();
    } catch {
      // Fall through to next strategy.
    }
  }

  if (typeof window !== "undefined") {
    try {
      return new URL(url, window.location.origin).toString();
    } catch {
      return url;
    }
  }

  return url;
};

const extractMapAvatarUrl = (detail: unknown): string | null => {
  if (!isRecord(detail)) {
    return null;
  }

  const directAvatar =
    toNonEmptyString(detail.avatarUrl) ??
    toNonEmptyString(detail.AvatarUrl) ??
    toNonEmptyString(detail.avatarURL) ??
    toNonEmptyString(detail.thumbnailUrl) ??
    toNonEmptyString(detail.ThumbnailUrl) ??
    toNonEmptyString(detail.imageUrl) ??
    toNonEmptyString(detail.ImageUrl);

  if (directAvatar) {
    return normalizeRemoteMediaUrl(directAvatar);
  }

  const gallery = Array.isArray(detail.gallery)
    ? detail.gallery
    : Array.isArray(detail.Gallery)
      ? detail.Gallery
      : [];

  for (const item of gallery) {
    if (!isRecord(item)) {
      continue;
    }
    const kind = (toNonEmptyString(item.kind) ?? toNonEmptyString(item.Kind) ?? "").toLowerCase();
    if (kind === "video") {
      continue;
    }
    const itemUrl = toNonEmptyString(item.url) ?? toNonEmptyString(item.Url);
    if (itemUrl) {
      return normalizeRemoteMediaUrl(itemUrl);
    }
  }

  for (const item of gallery) {
    if (!isRecord(item)) {
      continue;
    }
    const itemUrl = toNonEmptyString(item.url) ?? toNonEmptyString(item.Url);
    if (itemUrl) {
      return normalizeRemoteMediaUrl(itemUrl);
    }
  }

  return null;
};

const normalizeBlockConstraints = (
  source: Record<string, unknown> | null,
): {
  blockLimit: number | null;
  allowedBlocks: string[];
  requiredBlocks: RequiredBlockRule[];
} => {
  const allBlockTypes = blocksConfig.blocks.map((block) => block.type);
  if (!source) {
    return {
      blockLimit: 30,
      allowedBlocks: [],
      requiredBlocks: [],
    };
  }

  const explicitAllowed = normalizeStringList(source.allowedBlocks);
  const legacyBanned = normalizeStringList(source.bannedBlocks);
  const allowedBlocks =
    explicitAllowed.length > 0
      ? explicitAllowed
      : legacyBanned.length > 0
        ? allBlockTypes.filter((type) => !legacyBanned.includes(type))
        : [];

  const requiredBlocks = normalizeRequiredBlocks(source.requiredBlocks).filter(
    (rule) => allowedBlocks.length === 0 || allowedBlocks.includes(rule.type),
  );

  return {
    blockLimit: normalizeBlockLimit(source.blockLimit),
    allowedBlocks,
    requiredBlocks,
  };
};

const mapDetailToEditorMapData = (detail: MapDetailLike): MapData => {
  let sourceJson: unknown = detail.mapDetailJson;

  if (!sourceJson && detail.activeSpec?.gridSpec) {
    try {
      sourceJson = JSON.parse(detail.activeSpec.gridSpec);
    } catch {
      sourceJson = null;
    }
  }

  const fallbackType =
    detail.type === "Platform" ? "platform" : detail.type === "Snake" ? "snake" : "topdown";

  if (
    isRecord(sourceJson) &&
    isRecord(sourceJson.config) &&
    isRecord(sourceJson.layers) &&
    isRecord(sourceJson.objects)
  ) {
    const configRaw = sourceJson.config;
    const layersRaw = sourceJson.layers;
    const objectsRaw = sourceJson.objects;

    const width = Math.max(1, toNumber(configRaw.width, 20));
    const height = Math.max(1, toNumber(configRaw.height, 15));
    const tileSize = Math.max(8, toNumber(configRaw.tileSize, 32));

    const itemsRaw = Array.isArray(objectsRaw.items) ? objectsRaw.items : [];

    return {
      config: {
        type:
          configRaw.type === "topdown"
            ? "topdown"
            : configRaw.type === "snake"
              ? "snake"
              : fallbackType,
        width,
        height,
        tileSize,
        name:
          detail.title || (typeof configRaw.name === "string" ? configRaw.name : "Untitled Map"),
        description:
          detail.description ||
          (typeof configRaw.description === "string" ? configRaw.description : ""),
        difficulty: clampDifficulty(toNumber(detail.difficulty, toNumber(configRaw.difficulty, 1))),
        timeLimitSeconds: Math.max(
          1,
          Math.floor(
            toNumber(detail.timeLimitMs, toNumber(configRaw.timeLimitSeconds, 60) * 1000) / 1000,
          ),
        ),
        timeStarThresholdPercent: clampTimeStarThresholdPercent(
          toNumber(
            isRecord(sourceJson.metadata)
              ? sourceJson.metadata.timeStarThresholdPercent
              : undefined,
            toNumber(configRaw.timeStarThresholdPercent, 100),
          ),
        ),
        estimatedSteps: Math.max(
          1,
          Math.floor(
            toNumber(
              detail.estimatedSteps,
              toNumber(
                isRecord(sourceJson.metadata) ? sourceJson.metadata.estimatedSteps : undefined,
                toNumber(configRaw.estimatedSteps, 50),
              ),
            ),
          ),
        ),
        winCondition: clampWinCondition(
          toNumber(detail.winCondition, toNumber(configRaw.winCondition, 1)),
        ),
        levelObjective:
          isRecord(sourceJson.metadata) && typeof sourceJson.metadata.levelObjective === "string"
            ? sourceJson.metadata.levelObjective
            : typeof configRaw.levelObjective === "string"
              ? configRaw.levelObjective
              : "",
        requiredFruits: Math.max(
          0,
          toNumber(
            isRecord(sourceJson.metadata) ? sourceJson.metadata.requiredFruits : undefined,
            toNumber(configRaw.requiredFruits, 0),
          ),
        ),
        price: Math.max(0, toNumber(detail.price, toNumber(configRaw.price, 0))),
      },
      layers: {
        background: normalizeNumberLayer(layersRaw.background, width, height),
        ground: normalizeNumberLayer(layersRaw.ground, width, height),
        foreground: normalizeNumberLayer(layersRaw.foreground, width, height),
        collision: normalizeNumberLayer(layersRaw.collision, width, height),
      },
      objects: {
        items: itemsRaw
          .filter(
            (
              item,
            ): item is {
              id: number;
              type: string;
              x: number;
              y: number;
              metadata?: Record<string, unknown>;
            } =>
              isRecord(item) &&
              typeof item.id === "number" &&
              typeof item.type === "string" &&
              typeof item.x === "number" &&
              typeof item.y === "number",
          )
          .map((item) => ({
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            ...(isRecord(item.metadata) ? { metadata: item.metadata } : {}),
          })),
      },
      blockConstraints: normalizeBlockConstraints(
        isRecord(sourceJson.blockConstraints) ? sourceJson.blockConstraints : null,
      ),
    };
  }

  if (isRecord(sourceJson) && isRecord(sourceJson.layers)) {
    const width = Math.max(1, toNumber(sourceJson.width, 20));
    const height = Math.max(1, toNumber(sourceJson.height, 15));
    const layersRaw = sourceJson.layers;

    const objectsRaw = Array.isArray(sourceJson.objects) ? sourceJson.objects : [];
    const blockConstraintsRaw = isRecord(sourceJson.blockConstraints)
      ? sourceJson.blockConstraints
      : null;

    const items: Array<{
      id: number;
      type: string;
      x: number;
      y: number;
      metadata?: Record<string, unknown>;
    }> = [];

    if (
      isRecord(sourceJson.startPosition) &&
      typeof sourceJson.startPosition.col === "number" &&
      typeof sourceJson.startPosition.row === "number"
    ) {
      items.push({
        id: 1,
        type: "player",
        x: sourceJson.startPosition.col,
        y: sourceJson.startPosition.row,
      });
    }

    if (
      isRecord(sourceJson.goalPosition) &&
      typeof sourceJson.goalPosition.col === "number" &&
      typeof sourceJson.goalPosition.row === "number"
    ) {
      items.push({
        id: 2,
        type: "goal",
        x: sourceJson.goalPosition.col,
        y: sourceJson.goalPosition.row,
      });
    }

    objectsRaw.forEach((obj) => {
      if (
        isRecord(obj) &&
        typeof obj.type === "string" &&
        isRecord(obj.position) &&
        typeof obj.position.col === "number" &&
        typeof obj.position.row === "number"
      ) {
        if (obj.type === "fruit") {
          items.push({ id: 3, type: "fruit", x: obj.position.col, y: obj.position.row });
        } else if (obj.type === "enemy" || obj.type === "slime") {
          items.push({ id: 4, type: obj.type, x: obj.position.col, y: obj.position.row });
        } else {
          const metaId =
            isRecord(obj.metadata) && typeof obj.metadata.objectId === "number"
              ? obj.metadata.objectId
              : 5;
          items.push({
            id: metaId,
            type: obj.type,
            x: obj.position.col,
            y: obj.position.row,
            ...(isRecord(obj.metadata) ? { metadata: obj.metadata } : {}),
          });
        }
      }
    });

    return {
      config: {
        type: fallbackType,
        width,
        height,
        tileSize: 32,
        name:
          detail.title || (typeof sourceJson.name === "string" ? sourceJson.name : "Untitled Map"),
        description: detail.description || "",
        difficulty: clampDifficulty(detail.difficulty),
        timeLimitSeconds: Math.max(1, Math.floor(detail.timeLimitMs / 1000)),
        timeStarThresholdPercent: clampTimeStarThresholdPercent(
          toNumber(
            isRecord(sourceJson.metadata)
              ? sourceJson.metadata.timeStarThresholdPercent
              : undefined,
            100,
          ),
        ),
        estimatedSteps: Math.max(
          1,
          Math.floor(
            toNumber(
              detail.estimatedSteps,
              toNumber(
                isRecord(sourceJson.metadata) ? sourceJson.metadata.estimatedSteps : undefined,
                50,
              ),
            ),
          ),
        ),
        winCondition: clampWinCondition(detail.winCondition),
        levelObjective:
          isRecord(sourceJson.metadata) && typeof sourceJson.metadata.levelObjective === "string"
            ? sourceJson.metadata.levelObjective
            : typeof sourceJson.levelObjective === "string"
              ? sourceJson.levelObjective
              : "",
        requiredFruits: Math.max(
          0,
          toNumber(
            isRecord(sourceJson.metadata) ? sourceJson.metadata.requiredFruits : undefined,
            0,
          ),
        ),
        price: Math.max(0, detail.price),
      },
      layers: {
        background: normalizeNumberLayer(layersRaw.background, width, height),
        ground: normalizeNumberLayer(layersRaw.ground, width, height),
        foreground: normalizeNumberLayer(layersRaw.foreground, width, height),
        collision: normalizeNumberLayer(layersRaw.collision, width, height),
      },
      objects: {
        items,
      },
      blockConstraints: normalizeBlockConstraints(blockConstraintsRaw),
    };
  }

  return createEmptyMap(fallbackType, 20, 15, 32);
};

function extractHintsFromDetailJson(detailJson: unknown): string[] {
  if (!detailJson || typeof detailJson !== "object") return [];
  const rec = detailJson as Record<string, unknown>;
  if (!("hints" in rec)) return [];
  const h = rec.hints;
  if (!Array.isArray(h)) return [];
  const out: string[] = [];
  for (const el of h) {
    if (typeof el === "string") {
      if (el.trim()) out.push(el);
    } else if (el && typeof el === "object" && "content" in el) {
      const c = (el as { content?: unknown }).content;
      if (typeof c === "string" && c.trim()) out.push(c);
    }
  }
  return out.slice(0, 3);
}

function levelItemToMapDetailLike(map: MapDetail, level: MapLevelItem): MapDetailLike {
  const apiType = normalizeApiLevelType(level.type ?? map.type ?? "Topdown");
  return {
    title: level.title ?? map.title,
    description: map.description,
    type: apiType,
    difficulty: map.difficulty,
    timeLimitMs: level.timeLimitMs ?? map.timeLimitMs ?? 60_000,
    estimatedSteps: undefined,
    winCondition: level.winCondition ?? map.winCondition ?? 1,
    price: map.price,
    hints: [],
    mapDetailJson: level.detailJson,
    activeSpec: map.activeSpec,
  };
}

type EditorStep = 1 | 2 | 3 | 4 | 5 | 6;

type StepDefinition = {
  id: EditorStep;
  titleKey: string;
  titleFallback: string;
  summaryKey: string;
  summaryFallback: string;
};

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    id: 1,
    titleKey: "mapEditorWizardStep1Title",
    titleFallback: "Game info",
    summaryKey: "mapEditorWizardStep1Summary",
    summaryFallback: "Catalog metadata",
  },
  {
    id: 2,
    titleKey: "mapEditorWizardStep2Title",
    titleFallback: "Level management",
    summaryKey: "mapEditorWizardStep2Summary",
    summaryFallback: "Order and minimap",
  },
  {
    id: 3,
    titleKey: "mapEditorWizardStep3Title",
    titleFallback: "Map design",
    summaryKey: "mapEditorWizardStep3Summary",
    summaryFallback: "Tile editor and conditions",
  },
  {
    id: 4,
    titleKey: "mapEditorWizardStep4Title",
    titleFallback: "Block rules",
    summaryKey: "mapEditorWizardStep4Summary",
    summaryFallback: "Allowed, required, and limit",
  },
  {
    id: 5,
    titleKey: "mapEditorWizardStep5Title",
    titleFallback: "Hints",
    summaryKey: "mapEditorWizardStep5Summary",
    summaryFallback: "Hint setup",
  },
  {
    id: 6,
    titleKey: "mapEditorWizardStep6Title",
    titleFallback: "Review and submit",
    summaryKey: "mapEditorWizardStep6Summary",
    summaryFallback: "Checklist and save",
  },
];

const MAX_FREE_TRIAL_ATTEMPTS = 10;
const MAX_MAP_PRICE = 10000;

export type EditorLevelSlot = {
  id: string;
  hints: string[];
  hintUnlockFailures: number[];
  sampleSolution: string;
  sampleSolutionUnlockFailures: number;
  mapData: MapData;
};

const normalizeHintUnlockFailures = (value: unknown, hintCount: number): number[] => {
  if (hintCount <= 0) {
    return [];
  }

  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: hintCount }, (_, index) => {
    const raw = source[index];
    return Math.max(1, Math.floor(typeof raw === "number" ? raw : index + 1));
  });
};

const extractHintUnlockFailuresFromDetailJson = (detailJson: unknown, hintCount: number): number[] => {
  if (!detailJson || typeof detailJson !== "object") {
    return normalizeHintUnlockFailures([], hintCount);
  }

  const rec = detailJson as Record<string, unknown>;
  return normalizeHintUnlockFailures(rec.hintUnlockFailures, hintCount);
};

const extractSampleSolutionFromDetailJson = (
  detailJson: unknown,
): { sampleSolution: string; sampleSolutionUnlockFailures: number } => {
  if (!detailJson || typeof detailJson !== "object") {
    return { sampleSolution: "", sampleSolutionUnlockFailures: 3 };
  }

  const rec = detailJson as Record<string, unknown>;
  const sampleSolution = typeof rec.sampleSolution === "string" ? rec.sampleSolution : "";
  const sampleSolutionUnlockFailures = Math.max(
    1,
    Math.floor(typeof rec.sampleSolutionUnlockFailures === "number" ? rec.sampleSolutionUnlockFailures : 3),
  );

  return {
    sampleSolution,
    sampleSolutionUnlockFailures,
  };
};

const extractCatalogMetaFromDetailJson = (
  detailJson: unknown,
): { theme: string; targetAudience: string; programmingConcepts: string[] } => {
  if (!detailJson || typeof detailJson !== "object") {
    return { theme: "", targetAudience: "", programmingConcepts: [] };
  }

  const rec = detailJson as Record<string, unknown>;
  const rawCatalogMeta = isRecord(rec.catalogMeta) ? rec.catalogMeta : null;
  const theme = rawCatalogMeta && typeof rawCatalogMeta.theme === "string" ? rawCatalogMeta.theme : "";
  const targetAudience =
    rawCatalogMeta && typeof rawCatalogMeta.targetAudience === "string"
      ? rawCatalogMeta.targetAudience
      : "";
  const programmingConcepts =
    rawCatalogMeta && Array.isArray(rawCatalogMeta.programmingConcepts)
      ? rawCatalogMeta.programmingConcepts
          .filter((concept): concept is string => typeof concept === "string" && concept.trim().length > 0)
          .map((concept) => concept.trim())
      : [];

  return {
    theme,
    targetAudience,
    programmingConcepts,
  };
};

const hasConfiguredMap = (mapData: MapData): boolean => {
  const hasPlayer = mapData.objects.items.some((item) => item.type === "player");
  const hasGoal = mapData.objects.items.some((item) => item.type === "goal");
  const hasTerrain =
    mapData.layers.ground.some((row) => row.some((cell) => cell > 0)) ||
    mapData.layers.collision.some((row) => row.some((cell) => cell > 0));

  return hasPlayer && hasGoal && hasTerrain;
};

const hasValidBlockRules = (mapData: MapData): boolean => {
  const allowed = Array.from(new Set(mapData.blockConstraints.allowedBlocks ?? []));
  const required = Array.from(
    new Map(
      (mapData.blockConstraints.requiredBlocks ?? []).map((rule) => [rule.type, rule]),
    ).values(),
  );

  if (mapData.blockConstraints.blockLimit !== null && mapData.blockConstraints.blockLimit < 1) {
    return false;
  }

  if (allowed.length === 0) {
    return true;
  }

  return required.every((rule) => allowed.includes(rule.type) && rule.minCount >= 1);
};

const clampFreeTrialAttemptLimit = (value: number): number => {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(MAX_FREE_TRIAL_ATTEMPTS, Math.max(0, Math.floor(safe)));
};

const clampMapPrice = (value: number): number => {
  const safe = Number.isFinite(value) ? value : 0;
  return Math.min(MAX_MAP_PRICE, Math.max(0, Math.floor(safe)));
};

interface EditorState {
  store: EditorStore | null;
  mapData: MapData | null;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedObjectId: number | null; // Changed to numeric ID
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | null;
  canUndo: boolean;
  canRedo: boolean;
}

const newEmptySlot = (): EditorLevelSlot => ({
  id: crypto.randomUUID(),
  hints: [""],
  hintUnlockFailures: [1],
  sampleSolution: "",
  sampleSolutionUnlockFailures: 3,
  mapData: createEmptyMap("platform", 20, 15, 32),
});

export default function MapEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as MapEditorRouteState | null;
  const mapId = routeState?.mapId;
  const { locale } = useLanguageStore();
  const t = useMemo(() => getT(locale), [locale]);
  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const stepDefinitions = useMemo(
    () =>
      STEP_DEFINITIONS.map((step) => ({
        id: step.id,
        title: tt(step.titleKey, step.titleFallback),
        summary: tt(step.summaryKey, step.summaryFallback),
      })),
    [tt],
  );
  const [userPlan, setUserPlan] = useState<SubscriptionPlan>("free");
  const [planLoading, setPlanLoading] = useState(true);
  const canCreateMap = canCreateMaps(userPlan);
  const isCreateMode = !mapId;
  const [zoom, setZoom] = useState(1);
  const [currentStep, setCurrentStep] = useState<EditorStep>(1);
  const [, setLoadingMap] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingMapTagNames, setEditingMapTagNames] = useState<string[]>([]);
  const [editingMapLearnedTagNames, setEditingMapLearnedTagNames] = useState<string[]>([]);
  const [editingMapAvatarUrl, setEditingMapAvatarUrl] = useState<string | null>(null);
  const [draftAvatarFile, setDraftAvatarFile] = useState<File | null>(null);
  const [draftGalleryFiles, setDraftGalleryFiles] = useState<File[]>([]);
  const [editingMapContentVersion, setEditingMapContentVersion] = useState<number | null>(null);
  const [mapFreeTrialAttemptLimit, setMapFreeTrialAttemptLimit] = useState(0);
  const [mapCatalogTitle, setMapCatalogTitle] = useState("");
  const [gameTheme, setGameTheme] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [programmingConceptsCsv, setProgrammingConceptsCsv] = useState("");
  const [draggingLevelIndex, setDraggingLevelIndex] = useState<number | null>(null);
  const [dragOverLevelIndex, setDragOverLevelIndex] = useState<number | null>(null);
  const [, setRegisteredSaveLevelContent] = useState<
    (() => Promise<void>) | null
  >(null);
  const [, setSavingLevelContent] = useState(false);
  const handleRegisterSaveLevelContent = useCallback((save: () => Promise<void>) => {
    setRegisteredSaveLevelContent((prev) => (prev === save ? prev : save));
  }, []);
  const handleSavingLevelContentChange = useCallback((busy: boolean) => {
    setSavingLevelContent((prev) => (prev === busy ? prev : busy));
  }, []);
  const [levelSlots, setLevelSlots] = useState<EditorLevelSlot[]>(() => {
    const slot = newEmptySlot();
    return [slot];
  });
  const [activeLevelIndex, setActiveLevelIndex] = useState(0);
  const levelSlotsRef = useRef(levelSlots);
  levelSlotsRef.current = levelSlots;
  const parsedProgrammingConcepts = useMemo(
    () =>
      programmingConceptsCsv
        .split(",")
        .map((concept) => concept.trim())
        .filter((concept) => concept.length > 0),
    [programmingConceptsCsv],
  );

  // Lazy initialization of editor state with store
  const [editorState, setEditorState] = useState<EditorState>(() => {
    const initialMap = createEmptyMap("platform", 20, 15, 32);
    const store = new EditorStore(initialMap);

    return {
      store,
      mapData: store.getState(),
      activeLayer: store.getActiveLayer(),
      selectedTile: store.getSelectedTile(),
      selectedObjectId: store.getSelectedObjectId(),
      selectedTool: store.getSelectedTool(),
      canUndo: store.canUndo(),
      canRedo: store.canRedo(),
    };
  });

  const { store } = editorState;
  const storeRef = useRef(store);
  storeRef.current = store;

  const selectLevel = useCallback(
    (idx: number) => {
      const s = storeRef.current;
      if (!s || idx === activeLevelIndex || idx < 0 || idx >= levelSlotsRef.current.length) {
        return;
      }
      setLevelSlots((prev) => {
        const copy = [...prev];
        copy[activeLevelIndex] = {
          ...copy[activeLevelIndex],
          mapData: structuredClone(s.getState()),
        };
        return copy;
      });
      setActiveLevelIndex(idx);
    },
    [activeLevelIndex],
  );

  const updateLevelSlot = useCallback(
    (index: number, updater: (slot: EditorLevelSlot) => EditorLevelSlot) => {
      setLevelSlots((prev) => {
        if (!prev[index]) {
          return prev;
        }
        const copy = [...prev];
        copy[index] = updater(copy[index]);
        return copy;
      });
    },
    [],
  );

  const reorderLevels = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      const s = storeRef.current;
      if (!s) return;

      let nextActiveIndex = activeLevelIndex;
      setLevelSlots((prev) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.length ||
          toIndex >= prev.length ||
          fromIndex === toIndex
        ) {
          return prev;
        }

        const copy = [...prev];
        copy[activeLevelIndex] = {
          ...copy[activeLevelIndex],
          mapData: structuredClone(s.getState()),
        };

        const [moving] = copy.splice(fromIndex, 1);
        copy.splice(toIndex, 0, moving);

        if (activeLevelIndex === fromIndex) {
          nextActiveIndex = toIndex;
        } else if (fromIndex < activeLevelIndex && toIndex >= activeLevelIndex) {
          nextActiveIndex = activeLevelIndex - 1;
        } else if (fromIndex > activeLevelIndex && toIndex <= activeLevelIndex) {
          nextActiveIndex = activeLevelIndex + 1;
        }

        return copy;
      });

      setActiveLevelIndex(nextActiveIndex);
    },
    [activeLevelIndex],
  );

  const addLevel = useCallback(() => {
    const s = storeRef.current;
    if (!s) return;
    setLevelSlots((prev) => {
      const copy = [...prev];
      copy[activeLevelIndex] = {
        ...copy[activeLevelIndex],
        mapData: structuredClone(s.getState()),
      };
      const base = copy[0]?.mapData;
      const newMap = createEmptyMap(
        base?.config.type === "topdown"
          ? "topdown"
          : base?.config.type === "snake"
            ? "snake"
            : "platform",
        20,
        15,
        32,
      );
      if (base) {
        newMap.config.difficulty = base.config.difficulty;
        newMap.config.price = base.config.price;
        newMap.config.description = base.config.description;
      }
      newMap.config.name = `Level ${copy.length + 1}`;
      const nextSlot: EditorLevelSlot = {
        id: crypto.randomUUID(),
        hints: [""],
        hintUnlockFailures: [1],
        sampleSolution: "",
        sampleSolutionUnlockFailures: 3,
        mapData: newMap,
      };
      const next = [...copy, nextSlot];
      setActiveLevelIndex(next.length - 1);
      return next;
    });
  }, [activeLevelIndex]);

  const removeLevel = useCallback(
    (idx: number) => {
      const s = storeRef.current;
      if (!s) return;
      setLevelSlots((prev) => {
        if (prev.length <= 1) return prev;
        const copy = [...prev];
        if (copy[activeLevelIndex]) {
          copy[activeLevelIndex] = {
            ...copy[activeLevelIndex],
            mapData: structuredClone(s.getState()),
          };
        }
        const next = copy.filter((_, i) => i !== idx);
        setActiveLevelIndex((i) => {
          if (next.length === 0) return 0;
          if (idx === activeLevelIndex) return Math.min(i, next.length - 1);
          if (idx < i) return i - 1;
          return i;
        });
        return next;
      });
    },
    [activeLevelIndex],
  );

  const updateLevelHints = useCallback(
    (hints: string[]) => {
      setLevelSlots((prev) => {
        const copy = [...prev];
        if (!copy[activeLevelIndex]) return prev;
        copy[activeLevelIndex] = {
          ...copy[activeLevelIndex],
          hints,
          hintUnlockFailures: normalizeHintUnlockFailures(
            copy[activeLevelIndex].hintUnlockFailures,
            hints.length,
          ),
        };
        return copy;
      });
    },
    [activeLevelIndex],
  );

  const updateLevelObjectiveByIndex = useCallback(
    (index: number, levelObjective: string) => {
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            levelObjective,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapLevelObjective(levelObjective);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelTimeLimitByIndex = useCallback(
    (index: number, seconds: number) => {
      const nextTimeLimit = Math.max(30, Math.min(3600, Math.floor(seconds || 30)));
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            timeLimitSeconds: nextTimeLimit,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapTimeLimitSeconds(nextTimeLimit);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelTimeStarThresholdByIndex = useCallback(
    (index: number, percent: number) => {
      const nextThreshold = Math.max(1, Math.min(100, Math.floor(percent || 100)));
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            timeStarThresholdPercent: nextThreshold,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapTimeStarThresholdPercent(nextThreshold);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelEstimatedStepsByIndex = useCallback(
    (index: number, steps: number) => {
      const nextSteps = Math.max(1, Math.min(1000, Math.floor(steps || 1)));
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            estimatedSteps: nextSteps,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapEstimatedSteps(nextSteps);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelBlockLimitByIndex = useCallback(
    (index: number, rawValue: string) => {
      const trimmed = rawValue.trim();
      if (trimmed.length > 0 && !Number.isFinite(Number(trimmed))) {
        return;
      }

      const nextBlockLimit =
        trimmed.length === 0 ? null : Math.max(1, Math.floor(Number(trimmed) || 1));

      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          blockConstraints: {
            ...slot.mapData.blockConstraints,
            blockLimit: nextBlockLimit,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setBlockLimit(nextBlockLimit);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelWinConditionByIndex = useCallback(
    (index: number, winCondition: 1 | 2) => {
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            winCondition,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapWinCondition(winCondition);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const updateLevelRequiredFruitsByIndex = useCallback(
    (index: number, requiredFruits: number) => {
      const nextRequiredFruits = Math.max(0, Math.floor(requiredFruits || 0));
      updateLevelSlot(index, (slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: {
            ...slot.mapData.config,
            requiredFruits: nextRequiredFruits,
          },
        },
      }));

      if (index === activeLevelIndex) {
        store?.setMapRequiredFruits(nextRequiredFruits);
      }
    },
    [activeLevelIndex, store, updateLevelSlot],
  );

  const buildUploadLevels = useCallback((): MapUploadLevelInput[] => {
    const s = storeRef.current;
    const slots = levelSlots.map((slot) => ({ ...slot }));
    if (s) {
      slots[activeLevelIndex] = {
        ...slots[activeLevelIndex],
        mapData: structuredClone(s.getState()),
      };
    }
    return slots.map((slot, i) => ({
      levelOrder: i,
      mapData: slot.mapData,
      hints: slot.hints,
      hintUnlockFailures: normalizeHintUnlockFailures(slot.hintUnlockFailures, slot.hints.length),
      sampleSolution: slot.sampleSolution,
      sampleSolutionUnlockFailures: Math.max(1, Math.floor(slot.sampleSolutionUnlockFailures || 3)),
      catalogMeta:
        i === 0
          ? {
              theme: gameTheme.trim(),
              targetAudience: targetAudience.trim(),
              pricingModel: slot.mapData.config.price > 0 ? "paid" : "free",
              programmingConcepts: parsedProgrammingConcepts,
            }
          : undefined,
    }));
  }, [
    levelSlots,
    activeLevelIndex,
    gameTheme,
    targetAudience,
    parsedProgrammingConcepts,
  ]);

  const getMapFormMeta = useCallback(() => {
    const built = buildUploadLevels();
    const first = built[0];
    if (!first) {
      return {
        title: "",
        description: "",
        difficulty: 1 as const,
        price: clampMapPrice(0),
        freeTrialAttemptLimit: clampFreeTrialAttemptLimit(mapFreeTrialAttemptLimit),
      };
    }
    return {
      title: mapCatalogTitle.trim() || first.mapData.config.name || "Untitled",
      description: first.mapData.config.description || "",
      difficulty: first.mapData.config.difficulty,
      price: clampMapPrice(first.mapData.config.price),
      freeTrialAttemptLimit: clampFreeTrialAttemptLimit(mapFreeTrialAttemptLimit),
    };
  }, [buildUploadLevels, mapCatalogTitle, mapFreeTrialAttemptLimit]);

  useEffect(() => {
    let cancelled = false;

    const loadUserPlan = async () => {
      try {
        const plan = await getCurrentUserPlan(false, routeState?.roleContext);
        if (!cancelled) {
          setUserPlan(plan);
        }
      } finally {
        if (!cancelled) {
          setPlanLoading(false);
        }
      }
    };

    loadUserPlan();

    return () => {
      cancelled = true;
    };
  }, [routeState?.roleContext]);

  useEffect(() => {
    if (!mapId) {
      setEditingMapTagNames([]);
      setEditingMapLearnedTagNames([]);
      setEditingMapAvatarUrl(null);
      setDraftAvatarFile(null);
      setDraftGalleryFiles([]);
      setMapCatalogTitle("");
      setMapFreeTrialAttemptLimit(0);
      setGameTheme("");
      setTargetAudience("");
      setProgrammingConceptsCsv("");
      return;
    }

    let cancelled = false;

    const loadMapForEdit = async () => {
      try {
        setLoadingMap(true);
        setLoadError(null);
        setDraftAvatarFile(null);
        setDraftGalleryFiles([]);

        const learnerToken = tokenStorage.getLearnerToken();
        const cmsToken = tokenStorage.getCmsToken();

        const mapsApi = learnerToken ? learnerMapsApi : cmsToken ? cmsMapsApi : null;
        if (!mapsApi) {
          throw new Error("You must be logged in to edit a map");
        }

        const response = await mapsApi.getMapById(mapId, false);
        if (!response.data.isSuccess || !response.data.data) {
          throw new Error(response.data.message || "Failed to load map");
        }

        if (cancelled) return;

        const raw = response.data.data as MapDetail;
        setEditingMapTagNames(Array.isArray(raw.tagNames) ? raw.tagNames : []);
        setEditingMapLearnedTagNames(extractLearnedTags(raw));
        setEditingMapAvatarUrl(extractMapAvatarUrl(raw));
        setMapCatalogTitle(raw.title ?? "");
        setEditingMapContentVersion(
          typeof raw.contentVersion === "number" && Number.isFinite(raw.contentVersion)
            ? raw.contentVersion
            : null,
        );
        setMapFreeTrialAttemptLimit(
          clampFreeTrialAttemptLimit(Number(raw.freeTrialAttemptLimit ?? 0)),
        );

        const levels = raw.levels?.filter(Boolean) ?? [];
        const firstLevelDetailJson = levels[0]?.detailJson;
        const catalogMetaFromJson = extractCatalogMetaFromDetailJson(firstLevelDetailJson);
        setGameTheme(catalogMetaFromJson.theme);
        setTargetAudience(catalogMetaFromJson.targetAudience);
        setProgrammingConceptsCsv(
          (catalogMetaFromJson.programmingConcepts.length > 0
            ? catalogMetaFromJson.programmingConcepts
            : Array.isArray(raw.tagNames)
              ? raw.tagNames
              : []
          ).join(", "),
        );

        let slots: EditorLevelSlot[];

        if (levels.length > 0) {
          const sorted = [...levels].sort((a, b) => a.levelOrder - b.levelOrder);
          slots = sorted.map((level) => {
            const detailLike = levelItemToMapDetailLike(raw, level);
            const mapData = mapDetailToEditorMapData(detailLike);
            const fromJson = extractHintsFromDetailJson(level.detailJson);
            const hintList =
              fromJson.length > 0
                ? fromJson
                : Array.isArray(raw.hints)
                  ? raw.hints.map((h) => h.content).filter((c) => c.trim().length > 0)
                  : [];
            const normalizedHints = hintList.length > 0 ? hintList : [""];
            const sampleSolution = extractSampleSolutionFromDetailJson(level.detailJson);
            return {
              id: level.id,
              hints: normalizedHints,
              hintUnlockFailures: extractHintUnlockFailuresFromDetailJson(
                level.detailJson,
                normalizedHints.length,
              ),
              sampleSolution: sampleSolution.sampleSolution,
              sampleSolutionUnlockFailures: sampleSolution.sampleSolutionUnlockFailures,
              mapData,
            };
          });
        } else {
          const legacyHints = Array.isArray(raw.hints)
            ? raw.hints.map((h) => h.content).filter((c) => c.trim().length > 0)
            : [];
          const normalizedHints = legacyHints.length > 0 ? legacyHints : [""];
          slots = [
            {
              id: mapId,
              hints: normalizedHints,
              hintUnlockFailures: normalizeHintUnlockFailures([], normalizedHints.length),
              sampleSolution: "",
              sampleSolutionUnlockFailures: 3,
              mapData: mapDetailToEditorMapData(raw as MapDetailLike),
            },
          ];
        }

        setLevelSlots(slots);
        setActiveLevelIndex(0);

        const loadedStore = new EditorStore(structuredClone(slots[0].mapData));
        setEditorState({
          store: loadedStore,
          mapData: loadedStore.getState(),
          activeLayer: loadedStore.getActiveLayer(),
          selectedTile: loadedStore.getSelectedTile(),
          selectedObjectId: loadedStore.getSelectedObjectId(),
          selectedTool: loadedStore.getSelectedTool(),
          canUndo: loadedStore.canUndo(),
          canRedo: loadedStore.canRedo(),
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load map";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoadingMap(false);
        }
      }
    };

    loadMapForEdit();

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  useEffect(() => {
    const s = storeRef.current;
    if (!s) return;
    const slot = levelSlotsRef.current[activeLevelIndex];
    if (!slot) return;
    s.loadMap(structuredClone(slot.mapData));
  }, [activeLevelIndex]);

  // Subscribe to store changes
  useEffect(() => {
    if (!store) return;

    const unsubscribe = store.subscribe(() => {
      setEditorState({
        store,
        mapData: store.getState(),
        activeLayer: store.getActiveLayer(),
        selectedTile: store.getSelectedTile(),
        selectedObjectId: store.getSelectedObjectId(),
        selectedTool: store.getSelectedTool(),
        canUndo: store.canUndo(),
        canRedo: store.canRedo(),
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [store]);

  const handleTileSelect = (tileId: number | null) => {
    store?.setSelectedTile(tileId);
  };

  const handleObjectSelect = (objectId: number | null) => {
    store?.setSelectedObjectId(objectId);
  };

  const handlePortalColorChange = (color: "blue" | "green" | "orange" | "purple") => {
    store?.setSelectedPortalColor(color);
  };

  const handleToolSelect = (tool: "paint" | "erase" | "fill" | "player" | "goal" | null) => {
    store?.setSelectedTool(tool);
  };

  const handleResize = (width: number, height: number, tileSize: number) => {
    store?.resize(width, height, tileSize);
  };

  const handleTypeChange = (type: "platform" | "topdown" | "snake") => {
    store?.setMapType(type);
  };

  const handleNameChange = (name: string) => {
    store?.setMapName(name);
    if (levelSlots.length === 1) {
      setMapCatalogTitle(name);
    }
  };

  const handleMapCatalogTitleChange = useCallback(
    (title: string) => {
      setMapCatalogTitle(title);
      if (levelSlots.length === 1) {
        store?.setMapName(title);
      }
    },
    [levelSlots.length, store],
  );

  const handleSelectedTagNamesChange = useCallback((names: string[]) => {
    setEditingMapTagNames((prev) => {
      if (
        prev.length === names.length &&
        prev.every((name, index) => name.toLowerCase() === (names[index] ?? "").toLowerCase())
      ) {
        return prev;
      }
      return [...names];
    });
  }, []);

  const handleSelectedLearnedTagNamesChange = useCallback((names: string[]) => {
    setEditingMapLearnedTagNames((prev) => {
      if (
        prev.length === names.length &&
        prev.every((name, index) => name.toLowerCase() === (names[index] ?? "").toLowerCase())
      ) {
        return prev;
      }
      return [...names];
    });
  }, []);

  const handleDescriptionChange = (description: string) => {
    store?.setMapDescription(description);
    setLevelSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: { ...slot.mapData.config, description },
        },
      })),
    );
  };

  const handleDifficultyChange = (difficulty: 1 | 2 | 3 | 4 | 5) => {
    store?.setMapDifficulty(difficulty);
    setLevelSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: { ...slot.mapData.config, difficulty },
        },
      })),
    );
  };

  const handleTimeLimitChange = (seconds: number) => {
    store?.setMapTimeLimitSeconds(seconds);
  };

  const handleTimeStarThresholdChange = (percent: number) => {
    store?.setMapTimeStarThresholdPercent(percent);
  };

  const handleEstimatedStepsChange = (steps: number) => {
    store?.setMapEstimatedSteps(steps);
  };

  const handleWinConditionChange = (winCondition: 1 | 2) => {
    store?.setMapWinCondition(winCondition);
  };

  const handleLevelObjectiveChange = (objective: string) => {
    store?.setMapLevelObjective(objective);
  };

  const handleRequiredFruitsChange = (requiredFruits: number) => {
    store?.setMapRequiredFruits(requiredFruits);
  };

  const handlePriceChange = (price: number) => {
    const nextPrice = clampMapPrice(price);
    store?.setMapPrice(nextPrice);
    setLevelSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        mapData: {
          ...slot.mapData,
          config: { ...slot.mapData.config, price: nextPrice },
        },
      })),
    );
  };

  const handleFreeTrialAttemptLimitChange = useCallback((value: number) => {
    setMapFreeTrialAttemptLimit(clampFreeTrialAttemptLimit(value));
  }, []);

  const handleBlockLimitChange = (blockLimit: number | null) => {
    store?.setBlockLimit(blockLimit);
  };

  const handleAllowedBlocksChange = (allowedBlocks: string[]) => {
    store?.setAllowedBlocks(allowedBlocks);
  };

  const handleRequiredBlocksChange = (requiredBlocks: RequiredBlockRule[]) => {
    store?.setRequiredBlocks(requiredBlocks);
  };

  const handleObjectDefinitionsLoaded = useCallback(
    (defs: Record<string, import("../../modules/engine/assets").ObjectDefinition>) => {
      store?.setObjectDefinitions(defs);
    },
    [store],
  );

  const handleObjectMetadataChange = useCallback(
    (index: number, metadata: Record<string, unknown>) => {
      store?.updateObjectMetadataByIndex(index, metadata);
    },
    [store],
  );

  const handleUndo = () => {
    store?.undo();
  };

  const handleRedo = () => {
    store?.redo();
  };

  const { mapData, activeLayer, selectedTile, selectedObjectId, selectedTool, canUndo, canRedo } =
    editorState;

  const hydratedLevelSlots = useMemo(() => {
    return levelSlots.map((slot, index) => {
      if (index === activeLevelIndex && mapData) {
        return {
          ...slot,
          mapData,
        };
      }

      return slot;
    });
  }, [activeLevelIndex, levelSlots, mapData]);

  const activeLevel = hydratedLevelSlots[activeLevelIndex] ?? null;

  const stepCompletion = useMemo(() => {
    const step1 =
      mapCatalogTitle.trim().length > 0 &&
      (mapData?.config.description ?? "").trim().length > 0;

    const step2 =
      hydratedLevelSlots.length > 0 &&
      hydratedLevelSlots.every((slot) => slot.mapData.config.name.trim().length > 0);

    const step3 =
      hydratedLevelSlots.length > 0 && hydratedLevelSlots.every((slot) => hasConfiguredMap(slot.mapData));

    const step4 = hydratedLevelSlots.every((slot) => hasValidBlockRules(slot.mapData));

    const step5 = hydratedLevelSlots.every((slot) =>
      slot.hints.some((hint) => hint.trim().length > 0),
    );

    return {
      1: step1,
      2: step2,
      3: step3,
      4: step4,
      5: step5,
      6: step1 && step2 && step3 && step4 && step5,
    } as Record<EditorStep, boolean>;
  }, [
    mapCatalogTitle,
    mapData,
    hydratedLevelSlots,
  ]);

  const reviewLevelChecks = hydratedLevelSlots.map((slot, index) => ({
    id: slot.id,
    levelNumber: index + 1,
    levelName: slot.mapData.config.name,
    checks: [
      {
        label: tt("mapEditorWizardChecklistLevelName", "Level name"),
        pass: slot.mapData.config.name.trim().length > 0,
      },
      {
        label: tt("mapEditorWizardChecklistMapDesigned", "Map is designed"),
        pass: hasConfiguredMap(slot.mapData),
      },
      {
        label: tt("mapEditorWizardChecklistBlockRules", "Block rules are valid"),
        pass: hasValidBlockRules(slot.mapData),
      },
      {
        label: tt("mapEditorWizardChecklistHints", "Hints"),
        pass: slot.hints.some((hint) => hint.trim().length > 0),
      },
    ],
  }));

  const reviewMissingCriteria: string[] = [];
  if (mapCatalogTitle.trim().length === 0) {
    reviewMissingCriteria.push(
      locale.startsWith("vi") ? "Thông tin game: Tiêu đề game" : "Game info: Game title",
    );
  }
  if ((mapData?.config.description ?? "").trim().length === 0) {
    reviewMissingCriteria.push(
      locale.startsWith("vi") ? "Thông tin game: Mô tả" : "Game info: Description",
    );
  }

  for (const level of reviewLevelChecks) {
    const levelPrefix = tt("mapEditorLevelButton", "Level {n}").replace(
      "{n}",
      String(level.levelNumber),
    );
    for (const check of level.checks) {
      if (!check.pass) {
        reviewMissingCriteria.push(`${levelPrefix}: ${check.label}`);
      }
    }
  }

  const canSubmitForReview = reviewMissingCriteria.length === 0;

  const blockTypeToLabel = useMemo(
    () =>
      new Map(
        blocksConfig.blocks.map((block) => {
          const key = `block.${block.type}`;
          const translated = t(key);
          return [block.type, translated === key ? block.label : translated] as const;
        }),
      ),
    [t],
  );

  const mandatoryTopdownBlockLabels = useMemo(
    () =>
      ["move_forward", "turn_left", "turn_right"]
        .map((type) => blockTypeToLabel.get(type) ?? type)
        .filter((label, index, arr) => arr.indexOf(label) === index),
    [blockTypeToLabel],
  );

  const mandatoryPlatformBlockLabels = useMemo(
    () =>
      ["move_forward", "turn_left", "turn_right", "jump"]
        .map((type) => blockTypeToLabel.get(type) ?? type)
        .filter((label, index, arr) => arr.indexOf(label) === index),
    [blockTypeToLabel],
  );

  const mandatoryPlatformBlocksText = mandatoryPlatformBlockLabels.join(", ");
  const mandatoryTopdownBlocksText = mandatoryTopdownBlockLabels.join(", ");

  const goNextStep = () => {
    setCurrentStep((prev) => (prev < 6 ? ((prev + 1) as EditorStep) : prev));
  };

  const goPreviousStep = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as EditorStep) : prev));
  };

  if (isCreateMode && planLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> {tt("back", "Back")}
          </button>
        </div>
        <div style={styles.planBlockCard}>
          <h1 style={styles.title}>{tt("mapEditorPageTitle", "Map Editor")}</h1>
          <p style={styles.subtitle}>
            {tt("mapEditorCheckingSubscription", "Checking subscription...")}
          </p>
        </div>
      </div>
    );
  }

  if (isCreateMode && !canCreateMap) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> {tt("back", "Back")}
          </button>
        </div>
        <div style={styles.planBlockCard}>
          <h1 style={styles.title}>{tt("mapEditorPageTitle", "Map Editor")}</h1>
          <p style={styles.subtitle}>
            {tt("mapEditorUpgradeToCreateMaps", "Upgrade to Pro to create maps")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button type="button" style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> {tt("back", "Back")}
          </button>
        </div>
        <div style={styles.headerCenter}>
          <h1 style={styles.title}>{tt("mapEditorPageTitle", "Map Editor")}</h1>
          {loadError && <p style={styles.errorText}>{loadError}</p>}
        </div>
        <div style={styles.headerRight}>
          <span style={styles.headerRightSpacer} aria-hidden />
        </div>
      </div>

      {mapData && store && (
        <>
          <div style={styles.stepperRow}>
            {stepDefinitions.map((step) => {
              const isActive = currentStep === step.id;
              const isDone = stepCompletion[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  style={{
                    ...styles.stepCard,
                    ...(isActive ? styles.stepCardActive : {}),
                    ...(isDone ? styles.stepCardDone : {}),
                  }}
                  onClick={() => setCurrentStep(step.id)}
                >
                  <span style={styles.stepBadge}>
                    {tt("mapEditorWizardStepLabel", "Step {n}").replace("{n}", String(step.id))}
                  </span>
                  <strong style={styles.stepTitle}>{step.title}</strong>
                </button>
              );
            })}
          </div>

          {currentStep === 1 && (
            <div style={styles.stepContentPanel}>
              <div style={styles.stepIntroCard}>
                <h2 style={styles.stepHeading}>
                  {tt("mapEditorWizardStep1Heading", "Step 1 - Game info")}
                </h2>
                <p style={styles.stepNote}>{tt("mapEditorWizardStep1Note", "")}</p>
              </div>

              <MapEditorControls
                sectionMode="right"
                editorStore={store}
                editingMapId={mapId}
                loadedMapContentVersion={editingMapContentVersion}
                editorMode={routeState?.mode}
                initialSelectedTagNames={editingMapTagNames}
                initialSelectedLearnedTagNames={editingMapLearnedTagNames}
                onSelectedTagNamesChange={handleSelectedTagNamesChange}
                onSelectedLearnedTagNamesChange={handleSelectedLearnedTagNamesChange}
                initialAvatarUrl={editingMapAvatarUrl}
                initialHints={activeLevel?.hints ?? [""]}
                mapCatalogTitle={mapCatalogTitle}
                onMapCatalogTitleChange={handleMapCatalogTitleChange}
                levelHints={activeLevel?.hints ?? [""]}
                onLevelHintsChange={updateLevelHints}
                buildUploadLevels={buildUploadLevels}
                getMapFormMeta={getMapFormMeta}
                levelSlotCount={levelSlots.length}
                mapData={mapData}
                userPlan={userPlan}
                activeLayer={activeLayer}
                selectedTile={selectedTile}
                selectedObjectId={selectedObjectId}
                selectedTool={selectedTool}
                canUndo={canUndo}
                canRedo={canRedo}
                onTileSelect={handleTileSelect}
                onObjectSelect={handleObjectSelect}
                onPortalColorChange={handlePortalColorChange}
                onToolSelect={handleToolSelect}
                onResize={handleResize}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onTypeChange={handleTypeChange}
                onNameChange={handleNameChange}
                onDescriptionChange={handleDescriptionChange}
                onDifficultyChange={handleDifficultyChange}
                onTimeLimitChange={handleTimeLimitChange}
                onTimeStarThresholdChange={handleTimeStarThresholdChange}
                onEstimatedStepsChange={handleEstimatedStepsChange}
                onWinConditionChange={handleWinConditionChange}
                onLevelObjectiveChange={handleLevelObjectiveChange}
                onRequiredFruitsChange={handleRequiredFruitsChange}
                onPriceChange={handlePriceChange}
                freeTrialAttemptLimit={mapFreeTrialAttemptLimit}
                onFreeTrialAttemptLimitChange={handleFreeTrialAttemptLimitChange}
                onBlockLimitChange={handleBlockLimitChange}
                onAllowedBlocksChange={handleAllowedBlocksChange}
                onRequiredBlocksChange={handleRequiredBlocksChange}
                onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
                onObjectMetadataChange={handleObjectMetadataChange}
                allowedRightTabs={["map"]}
                initialRightTab="map"
                hideRightPanelTabBar
                showCatalogEditorInlineInMapTab
                avatarDraftFile={draftAvatarFile}
                onAvatarDraftFileChange={setDraftAvatarFile}
                galleryDraftFiles={draftGalleryFiles}
                onGalleryDraftFilesChange={setDraftGalleryFiles}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div style={styles.stepContentPanel}>
              <div style={styles.stepIntroCard}>
                <h2 style={styles.stepHeading}>
                  {tt("mapEditorWizardStep2Heading", "Step 2 - Level management")}
                </h2>
              </div>

              <div style={styles.levelHeaderRow}>
                <button type="button" style={styles.primaryButton} onClick={addLevel}>
                  {tt("mapEditorAddLevel", "+ Level")}
                </button>
              </div>

              <div style={styles.levelListGrid}>
                {hydratedLevelSlots.map((slot, index) => {
                  const mapMissing = !hasConfiguredMap(slot.mapData);
                  const isActive = index === activeLevelIndex;
                  const isDragOver = dragOverLevelIndex === index;
                  const levelTimeStarThresholdPercent = Math.max(
                    1,
                    Math.min(100, Math.floor(slot.mapData.config.timeStarThresholdPercent ?? 100)),
                  );

                  return (
                    <div
                      key={slot.id}
                      style={{
                        ...styles.levelCard,
                        ...(isActive ? styles.levelCardActive : {}),
                        ...(mapMissing ? styles.levelCardWarning : {}),
                        ...(isDragOver ? styles.levelCardDragOver : {}),
                      }}
                      draggable
                      onDragStart={() => setDraggingLevelIndex(index)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverLevelIndex(index);
                      }}
                      onDragLeave={() => {
                        if (dragOverLevelIndex === index) {
                          setDragOverLevelIndex(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingLevelIndex !== null) {
                          reorderLevels(draggingLevelIndex, index);
                        }
                        setDraggingLevelIndex(null);
                        setDragOverLevelIndex(null);
                      }}
                      onDragEnd={() => {
                        setDraggingLevelIndex(null);
                        setDragOverLevelIndex(null);
                      }}
                    >
                      <div style={styles.levelCardTop}>
                        <span style={styles.levelOrderBadge}>
                          {tt("mapEditorLevelButton", "Level {n}").replace(
                            "{n}",
                            String(index + 1),
                          )}
                        </span>
                        {mapMissing && (
                          <span style={styles.warningBadge}>
                            {tt("mapEditorWizardMapMissing", "Map not configured")}
                          </span>
                        )}
                      </div>

                      <div style={styles.levelFieldStack}>
                        <div style={{ ...styles.levelFieldItem, ...styles.levelFieldItemSpan2 }}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorLevelObjective", "Level Objective")}
                          </label>
                          <textarea
                            rows={2}
                            value={slot.mapData.config.levelObjective ?? ""}
                            onChange={(e) => updateLevelObjectiveByIndex(index, e.target.value)}
                            style={styles.fieldTextarea}
                          />
                        </div>

                        <div style={styles.levelFieldItem}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorTimeLimitSeconds", "Time Limit (seconds)")}
                          </label>
                          <input
                            type="number"
                            min={30}
                            max={3600}
                            value={slot.mapData.config.timeLimitSeconds}
                            onChange={(e) => updateLevelTimeLimitByIndex(index, Number(e.target.value))}
                            style={styles.fieldInput}
                          />
                        </div>

                        <div style={styles.levelFieldItem}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorTimeStarThreshold", "Time Star Threshold (%)")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={levelTimeStarThresholdPercent}
                            onChange={(e) =>
                              updateLevelTimeStarThresholdByIndex(index, Number(e.target.value))
                            }
                            style={styles.fieldInput}
                          />
                        </div>

                        <div style={styles.levelFieldItem}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorEstimatedSteps", "Estimated Steps")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={1000}
                            value={slot.mapData.config.estimatedSteps}
                            onChange={(e) =>
                              updateLevelEstimatedStepsByIndex(index, Number(e.target.value))
                            }
                            style={styles.fieldInput}
                          />
                        </div>

                        <div style={styles.levelFieldItem}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorBlockLimitLabel", "Block Limit:")}
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={slot.mapData.blockConstraints.blockLimit ?? ""}
                            onChange={(e) => updateLevelBlockLimitByIndex(index, e.target.value)}
                            placeholder="30"
                            style={styles.fieldInput}
                          />
                        </div>

                        <div style={styles.levelFieldItem}>
                          <label style={styles.fieldLabel}>
                            {tt("mapEditorWinCondition", "Win Condition")}
                          </label>
                          <select
                            value={slot.mapData.config.winCondition}
                            onChange={(e) =>
                              updateLevelWinConditionByIndex(
                                index,
                                Number(e.target.value) as 1 | 2,
                              )
                            }
                            style={styles.fieldSelect}
                          >
                            <option value={1}>{tt("mapEditorReachGoal", "Reach Goal")}</option>
                            <option value={2}>{tt("mapEditorCollectFruits", "Collect Fruits")}</option>
                          </select>
                        </div>

                        {slot.mapData.config.winCondition === 2 && (
                          <div style={styles.levelFieldItem}>
                            <label style={styles.fieldLabel}>
                              {tt("mapEditorRequiredFruits", "Required Fruits")}
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={slot.mapData.config.requiredFruits ?? 0}
                              onChange={(e) =>
                                updateLevelRequiredFruitsByIndex(index, Number(e.target.value))
                              }
                              style={styles.fieldInput}
                            />
                          </div>
                        )}

                        <div style={{ ...styles.levelActionRow, ...styles.levelActionRowSpan2 }}>
                          <button
                            type="button"
                            style={{ ...styles.smallButton, ...styles.dangerButton }}
                            onClick={() => removeLevel(index)}
                            disabled={hydratedLevelSlots.length <= 1}
                          >
                            {tt("mapEditorRemove", "Remove")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div style={styles.mainContent}>
              <aside style={styles.leftSidebar}>
                <MapEditorControls
                  sectionMode="left"
                  editingMapId={mapId}
                  loadedMapContentVersion={editingMapContentVersion}
                  editorMode={routeState?.mode}
                  initialSelectedTagNames={editingMapTagNames}
                  initialSelectedLearnedTagNames={editingMapLearnedTagNames}
                  onSelectedTagNamesChange={handleSelectedTagNamesChange}
                  onSelectedLearnedTagNamesChange={handleSelectedLearnedTagNamesChange}
                  initialAvatarUrl={editingMapAvatarUrl}
                  initialHints={activeLevel?.hints ?? [""]}
                  mapCatalogTitle={mapCatalogTitle}
                  onMapCatalogTitleChange={handleMapCatalogTitleChange}
                  levelHints={activeLevel?.hints ?? [""]}
                  onLevelHintsChange={updateLevelHints}
                  buildUploadLevels={buildUploadLevels}
                  getMapFormMeta={getMapFormMeta}
                  levelSlotCount={levelSlots.length}
                  currentLevelIndex={activeLevelIndex}
                  onCurrentLevelIndexChange={selectLevel}
                  mapData={mapData}
                  userPlan={userPlan}
                  activeLayer={activeLayer}
                  selectedTile={selectedTile}
                  selectedObjectId={selectedObjectId}
                  selectedTool={selectedTool}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onTileSelect={handleTileSelect}
                  onObjectSelect={handleObjectSelect}
                  onPortalColorChange={handlePortalColorChange}
                  onToolSelect={handleToolSelect}
                  onResize={handleResize}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onTypeChange={handleTypeChange}
                  onNameChange={handleNameChange}
                  onDescriptionChange={handleDescriptionChange}
                  onDifficultyChange={handleDifficultyChange}
                  onTimeLimitChange={handleTimeLimitChange}
                  onTimeStarThresholdChange={handleTimeStarThresholdChange}
                  onEstimatedStepsChange={handleEstimatedStepsChange}
                  onWinConditionChange={handleWinConditionChange}
                  onLevelObjectiveChange={handleLevelObjectiveChange}
                  onPriceChange={handlePriceChange}
                  freeTrialAttemptLimit={mapFreeTrialAttemptLimit}
                  onFreeTrialAttemptLimitChange={handleFreeTrialAttemptLimitChange}
                  onBlockLimitChange={handleBlockLimitChange}
                  onAllowedBlocksChange={handleAllowedBlocksChange}
                  onRequiredBlocksChange={handleRequiredBlocksChange}
                  onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
                  onObjectMetadataChange={handleObjectMetadataChange}
                  avatarDraftFile={draftAvatarFile}
                  onAvatarDraftFileChange={setDraftAvatarFile}
                  galleryDraftFiles={draftGalleryFiles}
                  onGalleryDraftFilesChange={setDraftGalleryFiles}
                />
              </aside>

              <section style={styles.canvasPanel}>
                <div style={styles.canvasToolbar}>
                  <div style={styles.zoomGroup}>
                    <button
                      style={styles.zoomButton}
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <span style={styles.zoomText}>{Math.round(zoom * 100)}%</span>
                    <button
                      style={styles.zoomButton}
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      style={styles.zoomButton}
                      onClick={() => setZoom(1)}
                      title={tt("mapEditorResetZoom", "Reset zoom")}
                    >
                      <Scan size={14} />
                    </button>
                  </div>
                </div>

                <div style={styles.canvasContainer}>
                  <div style={styles.canvasGridBackdrop}>
                    <EditorCanvas store={store} zoom={zoom} />
                  </div>
                </div>
              </section>

              <aside style={styles.rightSidebar}>
                <MapEditorControls
                  sectionMode="right"
                  editorStore={store}
                  editingMapId={mapId}
                  loadedMapContentVersion={editingMapContentVersion}
                  editorMode={routeState?.mode}
                  initialSelectedTagNames={editingMapTagNames}
                  initialSelectedLearnedTagNames={editingMapLearnedTagNames}
                  onSelectedTagNamesChange={handleSelectedTagNamesChange}
                  onSelectedLearnedTagNamesChange={handleSelectedLearnedTagNamesChange}
                  initialAvatarUrl={editingMapAvatarUrl}
                  initialHints={activeLevel?.hints ?? [""]}
                  mapCatalogTitle={mapCatalogTitle}
                  onMapCatalogTitleChange={handleMapCatalogTitleChange}
                  levelHints={activeLevel?.hints ?? [""]}
                  onLevelHintsChange={updateLevelHints}
                  buildUploadLevels={buildUploadLevels}
                  getMapFormMeta={getMapFormMeta}
                  levelSlotCount={levelSlots.length}
                  currentLevelIndex={activeLevelIndex}
                  onCurrentLevelIndexChange={selectLevel}
                  mapData={mapData}
                  userPlan={userPlan}
                  activeLayer={activeLayer}
                  selectedTile={selectedTile}
                  selectedObjectId={selectedObjectId}
                  selectedTool={selectedTool}
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onTileSelect={handleTileSelect}
                  onObjectSelect={handleObjectSelect}
                  onPortalColorChange={handlePortalColorChange}
                  onToolSelect={handleToolSelect}
                  onResize={handleResize}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onTypeChange={handleTypeChange}
                  onNameChange={handleNameChange}
                  onDescriptionChange={handleDescriptionChange}
                  onDifficultyChange={handleDifficultyChange}
                  onTimeLimitChange={handleTimeLimitChange}
                  onTimeStarThresholdChange={handleTimeStarThresholdChange}
                  onEstimatedStepsChange={handleEstimatedStepsChange}
                  onWinConditionChange={handleWinConditionChange}
                  onLevelObjectiveChange={handleLevelObjectiveChange}
                  onRequiredFruitsChange={handleRequiredFruitsChange}
                  onPriceChange={handlePriceChange}
                  freeTrialAttemptLimit={mapFreeTrialAttemptLimit}
                  onFreeTrialAttemptLimitChange={handleFreeTrialAttemptLimitChange}
                  onBlockLimitChange={handleBlockLimitChange}
                  onAllowedBlocksChange={handleAllowedBlocksChange}
                  onRequiredBlocksChange={handleRequiredBlocksChange}
                  onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
                  onObjectMetadataChange={handleObjectMetadataChange}
                  avatarDraftFile={draftAvatarFile}
                  onAvatarDraftFileChange={setDraftAvatarFile}
                  galleryDraftFiles={draftGalleryFiles}
                  onGalleryDraftFilesChange={setDraftGalleryFiles}
                  allowedRightTabs={["canvas", "level", "objects"]}
                  initialRightTab="level"
                />
              </aside>
            </div>
          )}

          {currentStep === 4 && (
            <div style={styles.stepContentPanel}>
              <div style={styles.stepIntroCard}>
                <h2 style={styles.stepHeading}>
                  {tt("mapEditorWizardStep4Heading", "Step 4 - Block rules")}
                </h2>
                <p style={styles.stepNote}>
                  {tt(
                    "mapEditorWizardStep4MandatoryBlocksHintIntro",
                    "Mandatory blocks by level type:",
                  )}
                </p>
                <ul style={styles.stepHintList}>
                  <li>
                    {tt(
                      "mapEditorWizardStep4MandatoryBlocksHintPlatform",
                      "If level type is Platform, required blocks are: {blocks}",
                    ).replace("{blocks}", mandatoryPlatformBlocksText)}
                  </li>
                  <li>
                    {tt(
                      "mapEditorWizardStep4MandatoryBlocksHintTopdown",
                      "If level type is Top-down, required blocks are: {blocks}",
                    ).replace("{blocks}", mandatoryTopdownBlocksText)}
                  </li>
                </ul>
              </div>

              <div style={styles.rulesLayout}>
                <aside style={styles.rulesLevelList}>
                  {hydratedLevelSlots.map((slot, index) => (
                    <button
                      key={slot.id}
                      type="button"
                      style={{
                        ...styles.rulesLevelButton,
                        ...(index === activeLevelIndex ? styles.rulesLevelButtonActive : {}),
                      }}
                      onClick={() => selectLevel(index)}
                    >
                      <span>
                        {tt("mapEditorLevelButton", "Level {n}").replace(
                          "{n}",
                          String(index + 1),
                        )}
                      </span>
                    </button>
                  ))}
                </aside>

                <section style={styles.rulesControlPanel}>
                  <MapEditorControls
                    sectionMode="right"
                    editorStore={store}
                    editingMapId={mapId}
                    loadedMapContentVersion={editingMapContentVersion}
                    editorMode={routeState?.mode}
                    initialSelectedTagNames={editingMapTagNames}
                    initialSelectedLearnedTagNames={editingMapLearnedTagNames}
                    onSelectedTagNamesChange={handleSelectedTagNamesChange}
                    onSelectedLearnedTagNamesChange={handleSelectedLearnedTagNamesChange}
                    initialAvatarUrl={editingMapAvatarUrl}
                    initialHints={activeLevel?.hints ?? [""]}
                    mapCatalogTitle={mapCatalogTitle}
                    onMapCatalogTitleChange={handleMapCatalogTitleChange}
                    levelHints={activeLevel?.hints ?? [""]}
                    onLevelHintsChange={updateLevelHints}
                    buildUploadLevels={buildUploadLevels}
                    getMapFormMeta={getMapFormMeta}
                    levelSlotCount={levelSlots.length}
                    mapData={mapData}
                    userPlan={userPlan}
                    activeLayer={activeLayer}
                    selectedTile={selectedTile}
                    selectedObjectId={selectedObjectId}
                    selectedTool={selectedTool}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onTileSelect={handleTileSelect}
                    onObjectSelect={handleObjectSelect}
                    onPortalColorChange={handlePortalColorChange}
                    onToolSelect={handleToolSelect}
                    onResize={handleResize}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onTypeChange={handleTypeChange}
                    onNameChange={handleNameChange}
                    onDescriptionChange={handleDescriptionChange}
                    onDifficultyChange={handleDifficultyChange}
                    onTimeLimitChange={handleTimeLimitChange}
                    onTimeStarThresholdChange={handleTimeStarThresholdChange}
                    onEstimatedStepsChange={handleEstimatedStepsChange}
                    onWinConditionChange={handleWinConditionChange}
                    onLevelObjectiveChange={handleLevelObjectiveChange}
                    onRequiredFruitsChange={handleRequiredFruitsChange}
                    onPriceChange={handlePriceChange}
                    freeTrialAttemptLimit={mapFreeTrialAttemptLimit}
                    onFreeTrialAttemptLimitChange={handleFreeTrialAttemptLimitChange}
                    onBlockLimitChange={handleBlockLimitChange}
                    onAllowedBlocksChange={handleAllowedBlocksChange}
                    onRequiredBlocksChange={handleRequiredBlocksChange}
                    onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
                    onObjectMetadataChange={handleObjectMetadataChange}
                    avatarDraftFile={draftAvatarFile}
                    onAvatarDraftFileChange={setDraftAvatarFile}
                    galleryDraftFiles={draftGalleryFiles}
                    onGalleryDraftFilesChange={setDraftGalleryFiles}
                    allowedRightTabs={["rules"]}
                    initialRightTab="rules"
                    hideRightPanelTabBar
                  />
                </section>
              </div>
            </div>
          )}

          {currentStep === 5 && activeLevel && (
            <div style={styles.stepContentPanel}>
              <div style={styles.stepIntroCard}>
                <h2 style={styles.stepHeading}>
                  {tt("mapEditorWizardStep5Heading", "Step 5 - Hints")}
                </h2>
              </div>

              <div style={styles.hintsLayout}>
                <aside style={styles.rulesLevelList}>
                  {hydratedLevelSlots.map((slot, index) => (
                    <button
                      key={slot.id}
                      type="button"
                      style={{
                        ...styles.rulesLevelButton,
                        ...(index === activeLevelIndex ? styles.rulesLevelButtonActive : {}),
                      }}
                      onClick={() => selectLevel(index)}
                    >
                      <span>
                        {tt("mapEditorLevelButton", "Level {n}").replace(
                          "{n}",
                          String(index + 1),
                        )}
                      </span>
                    </button>
                  ))}
                </aside>

                <section style={styles.hintsPanel}>
                  <h3 style={styles.sectionTitlePlain}>
                    {tt("mapEditorWizardHintScheduleTitle", "Hint schedule - Level {n}").replace(
                      "{n}",
                      String(activeLevelIndex + 1),
                    )}
                  </h3>
                  {activeLevel.hints.map((hint, hintIndex) => (
                    <div key={`hint-row-${hintIndex}`} style={styles.hintRow}>
                      <div style={styles.hintInputWrap}>
                        <label style={styles.fieldLabel}>
                          {tt("mapEditorHintNumber", "Hint {n}").replace(
                            "{n}",
                            String(hintIndex + 1),
                          )}
                        </label>
                        <input
                          value={hint}
                          onChange={(e) => {
                            const nextHints = [...activeLevel.hints];
                            nextHints[hintIndex] = e.target.value;
                            updateLevelHints(nextHints);
                          }}
                          style={styles.fieldInput}
                          placeholder={tt("mapEditorHintNumber", "Hint {n}").replace(
                            "{n}",
                            String(hintIndex + 1),
                          )}
                        />
                      </div>
                    </div>
                  ))}

                  <div style={styles.levelActionRow}>
                    {activeLevel.hints.length < 3 && (
                      <button
                        type="button"
                        style={styles.smallButton}
                        onClick={() => updateLevelHints([...activeLevel.hints, ""])}
                      >
                        {tt("mapEditorAddHint", "Add Hint")}
                      </button>
                    )}
                    {activeLevel.hints.length > 1 && (
                      <button
                        type="button"
                        style={{ ...styles.smallButton, ...styles.dangerButton }}
                        onClick={() => updateLevelHints(activeLevel.hints.slice(0, -1))}
                      >
                        {tt("mapEditorWizardRemoveHint", "Remove Hint")}
                      </button>
                    )}
                  </div>

                </section>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div style={styles.stepContentPanel}>
              <div style={styles.stepIntroCard}>
                <h2 style={styles.stepHeading}>
                  {tt("mapEditorWizardStep6Heading", "Step 6 - Review and submit")}
                </h2>
                <p style={styles.stepNote}>{tt("mapEditorWizardStep6Note", "")}</p>
              </div>

              <div style={styles.reviewLayout}>
                <section style={styles.reviewMainPanel}>
                  {reviewLevelChecks.map((level) => {
                    return (
                      <div key={level.id} style={styles.reviewLevelCard}>
                        <h4 style={styles.reviewLevelTitle}>
                          {tt("mapEditorLevelButton", "Level {n}").replace(
                            "{n}",
                            String(level.levelNumber),
                          )}
                          : {level.levelName || tt("mapEditorUntitledMap", "Untitled")}
                        </h4>
                        <div style={styles.reviewChecklist}>
                          {level.checks.map((check) => (
                            <div
                              key={`${level.id}-${check.label}`}
                              style={{
                                ...styles.reviewCheckItem,
                                ...(check.pass ? styles.reviewCheckPass : styles.reviewCheckFail),
                              }}
                            >
                              {check.pass
                                ? tt("mapEditorWizardChecklistPass", "PASS")
                                : tt("mapEditorWizardChecklistTodo", "TODO")} - {check.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                </section>

                <aside style={styles.reviewSidePanel}>
                  {!canSubmitForReview ? (
                    <section style={styles.reviewMissingPanel}>
                      <h3 style={styles.reviewMissingTitle}>
                        {locale.startsWith("vi")
                          ? "Mục chưa đạt để gửi duyệt"
                          : "Incomplete criteria before submit"}
                      </h3>
                      <p style={styles.reviewMissingDesc}>
                        {locale.startsWith("vi")
                          ? "Hoàn thành tất cả tiêu chí sau trước khi bấm Lưu và gửi duyệt."
                          : "Complete all criteria below before clicking Save and submit for review."}
                      </p>
                      <ul style={styles.reviewMissingList}>
                        {reviewMissingCriteria.map((item, index) => (
                          <li key={`${item}-${index}`} style={styles.reviewMissingItem}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  <MapEditorControls
                    sectionMode="right"
                    editorStore={store}
                    editingMapId={mapId}
                    loadedMapContentVersion={editingMapContentVersion}
                    editorMode={routeState?.mode}
                    initialSelectedTagNames={editingMapTagNames}
                    initialSelectedLearnedTagNames={editingMapLearnedTagNames}
                    onSelectedTagNamesChange={handleSelectedTagNamesChange}
                    onSelectedLearnedTagNamesChange={handleSelectedLearnedTagNamesChange}
                    initialAvatarUrl={editingMapAvatarUrl}
                    initialHints={activeLevel?.hints ?? [""]}
                    mapCatalogTitle={mapCatalogTitle}
                    onMapCatalogTitleChange={handleMapCatalogTitleChange}
                    levelHints={activeLevel?.hints ?? [""]}
                    onLevelHintsChange={updateLevelHints}
                    buildUploadLevels={buildUploadLevels}
                    getMapFormMeta={getMapFormMeta}
                    levelSlotCount={levelSlots.length}
                    mapData={mapData}
                    userPlan={userPlan}
                    activeLayer={activeLayer}
                    selectedTile={selectedTile}
                    selectedObjectId={selectedObjectId}
                    selectedTool={selectedTool}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onTileSelect={handleTileSelect}
                    onObjectSelect={handleObjectSelect}
                    onPortalColorChange={handlePortalColorChange}
                    onToolSelect={handleToolSelect}
                    onResize={handleResize}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onTypeChange={handleTypeChange}
                    onNameChange={handleNameChange}
                    onDescriptionChange={handleDescriptionChange}
                    onDifficultyChange={handleDifficultyChange}
                    onTimeLimitChange={handleTimeLimitChange}
                    onTimeStarThresholdChange={handleTimeStarThresholdChange}
                    onEstimatedStepsChange={handleEstimatedStepsChange}
                    onWinConditionChange={handleWinConditionChange}
                    onLevelObjectiveChange={handleLevelObjectiveChange}
                    onRequiredFruitsChange={handleRequiredFruitsChange}
                    onPriceChange={handlePriceChange}
                    freeTrialAttemptLimit={mapFreeTrialAttemptLimit}
                    onFreeTrialAttemptLimitChange={handleFreeTrialAttemptLimitChange}
                    onBlockLimitChange={handleBlockLimitChange}
                    onAllowedBlocksChange={handleAllowedBlocksChange}
                    onRequiredBlocksChange={handleRequiredBlocksChange}
                    onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
                    onObjectMetadataChange={handleObjectMetadataChange}
                    avatarDraftFile={draftAvatarFile}
                    onAvatarDraftFileChange={setDraftAvatarFile}
                    galleryDraftFiles={draftGalleryFiles}
                    onGalleryDraftFilesChange={setDraftGalleryFiles}
                    allowedRightTabs={["map"]}
                    initialRightTab="map"
                    registerSaveLevelContent={handleRegisterSaveLevelContent}
                    onSavingLevelContentChange={handleSavingLevelContentChange}
                    canSubmitForReview={canSubmitForReview}
                    submitForReviewRequirements={reviewMissingCriteria}
                  />
                </aside>
              </div>
            </div>
          )}

          <div style={styles.stepFooterNav}>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={goPreviousStep}
              disabled={currentStep <= 1}
            >
              {tt("mapEditorWizardPreviousStep", "Previous step")}
            </button>
            {currentStep < 6 ? (
              <button
                type="button"
                style={styles.primaryButton}
                onClick={goNextStep}
              >
                {tt("mapEditorWizardNextStep", "Next step")}
              </button>
            ) : (
              <span aria-hidden style={styles.stepFooterSpacer} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "18px",
    gap: "14px",
    minHeight: "100vh",
    background: "var(--bg)",
    boxSizing: "border-box",
  },
  header: {
    display: "grid",
    gridTemplateColumns: "minmax(0, auto) minmax(0, 1fr) minmax(0, auto)",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    maxWidth: "1800px",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--bg) 34%, transparent)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  headerCenter: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
    textAlign: "center",
    gap: "4px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: "120px",
  },
  headerRightSpacer: {
    display: "block",
    width: "1px",
    height: "1px",
  },
  title: {
    fontSize: "30px",
    fontWeight: "800",
    margin: 0,
    color: "var(--text)",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "14px",
    color: "var(--text-2)",
    margin: 0,
  },
  errorText: {
    fontSize: "13px",
    color: "var(--danger)",
    margin: "6px 0 0",
  },
  planBlockCard: {
    display: "grid",
    gap: "10px",
    width: "100%",
    maxWidth: "1800px",
    padding: "20px",
    borderRadius: "16px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--bg) 34%, transparent)",
    textAlign: "center",
  },
  backButton: {
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  },
  stepperRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: "10px",
    width: "100%",
    maxWidth: "1800px",
  },
  stepCard: {
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    cursor: "pointer",
    textAlign: "left",
    color: "var(--text)",
  },
  stepCardActive: {
    border: "1px solid var(--primary)",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--primary) 28%, transparent)",
  },
  stepCardDone: {
    background:
      "linear-gradient(180deg, color-mix(in srgb, var(--success) 12%, var(--surface)), var(--surface-2))",
  },
  stepBadge: {
    fontSize: "11px",
    color: "var(--text-2)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 700,
  },
  stepTitle: {
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text)",
  },
  stepSummary: {
    fontSize: "12px",
    color: "var(--text-2)",
  },
  stepContentPanel: {
    width: "100%",
    maxWidth: "1800px",
    display: "grid",
    gap: "12px",
  },
  stepIntroCard: {
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
  },
  stepHeading: {
    margin: 0,
    fontSize: "20px",
    fontWeight: 800,
    color: "var(--text)",
  },
  stepNote: {
    margin: "6px 0 0",
    fontSize: "13px",
    color: "var(--text-2)",
  },
  stepHintList: {
    margin: "4px 0 0",
    paddingLeft: "18px",
    fontSize: "13px",
    color: "var(--text-2)",
    display: "grid",
    gap: "4px",
  },
  metadataGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "12px",
  },
  formCard: {
    padding: "14px",
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    display: "grid",
    gap: "8px",
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-2)",
  },
  fieldInput: {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "9px 10px",
    fontSize: "13px",
  },
  fieldTextarea: {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "9px 10px",
    fontSize: "13px",
    resize: "vertical",
  },
  fieldSelect: {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "9px 10px",
    fontSize: "13px",
  },
  inlineHintText: {
    fontSize: "12px",
    color: "var(--text-2)",
    margin: 0,
  },
  radioRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  radioLabel: {
    display: "inline-flex",
    gap: "6px",
    alignItems: "center",
    fontSize: "13px",
    color: "var(--text)",
  },
  levelHeaderRow: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  levelListGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  levelCard: {
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "12px",
    display: "grid",
    gap: "10px",
  },
  levelCardActive: {
    border: "1px solid var(--primary)",
    boxShadow: "0 10px 22px color-mix(in srgb, var(--primary) 25%, transparent)",
  },
  levelCardWarning: {
    border: "1px solid color-mix(in srgb, var(--warning) 40%, var(--border))",
  },
  levelCardDragOver: {
    outline: "2px dashed var(--primary)",
    outlineOffset: "2px",
  },
  levelCardTop: {
    display: "flex",
    justifyContent: "space-between",
  },
  levelOrderBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--primary)",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--primary) 40%, var(--border))",
    padding: "4px 8px",
    background: "color-mix(in srgb, var(--primary) 14%, var(--surface))",
  },
  warningBadge: {
    fontSize: "11px",
    fontWeight: 700,
    color: "var(--warning)",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--warning) 45%, var(--border))",
    padding: "4px 8px",
    background: "color-mix(in srgb, var(--warning) 16%, var(--surface))",
  },
  levelCardBody: {
    display: "grid",
    gridTemplateColumns: "96px minmax(0, 1fr)",
    gap: "10px",
    alignItems: "start",
  },
  minimapWrap: {
    width: "92px",
    height: "92px",
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  minimapImage: {
    width: "100%",
    height: "100%",
    imageRendering: "pixelated",
    objectFit: "contain",
  },
  minimapFallback: {
    fontSize: "11px",
    color: "var(--text-2)",
  },
  levelFieldStack: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  levelFieldItem: {
    display: "grid",
    gap: "6px",
    alignContent: "start",
  },
  levelFieldItemSpan2: {
    gridColumn: "1 / -1",
  },
  levelActionRow: {
    display: "flex",
    gap: "8px",
    marginTop: "4px",
    flexWrap: "wrap",
  },
  levelActionRowSpan2: {
    gridColumn: "1 / -1",
  },
  smallButton: {
    border: "1px solid var(--border)",
    borderRadius: "8px",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "7px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid color-mix(in srgb, var(--danger) 38%, var(--border))",
    color: "var(--danger)",
    background: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
  },
  primaryButton: {
    border: "1px solid var(--primary)",
    borderRadius: "10px",
    background: "var(--primary)",
    color: "#fff",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid var(--border)",
    borderRadius: "10px",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  stepFooterNav: {
    width: "100%",
    maxWidth: "1800px",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
  },
  stepFooterSpacer: {
    width: "1px",
    height: "1px",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr) 320px",
    gap: "14px",
    width: "100%",
    maxWidth: "1800px",
  },
  leftSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
    overflowX: "hidden",
  },
  rightSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
    overflowX: "hidden",
  },
  canvasPanel: {
    height: "calc(100vh - 140px)",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    borderRadius: "18px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    boxShadow: "0 12px 28px color-mix(in srgb, var(--bg) 40%, transparent)",
    overflow: "hidden",
  },
  canvasToolbar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--surface-2)",
  },
  zoomGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    padding: "4px",
  },
  zoomButton: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text-2)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomText: {
    fontSize: "12px",
    fontWeight: 700,
    color: "var(--text-2)",
    minWidth: "46px",
    textAlign: "center",
  },
  canvasContainer: {
    flex: 1,
    minHeight: 0,
    padding: "14px",
    overflow: "auto",
  },
  canvasGridBackdrop: {
    width: "max-content",
    minWidth: "100%",
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background:
      "linear-gradient(45deg, color-mix(in srgb, var(--text-2) 15%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in srgb, var(--text-2) 15%, transparent) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--text-2) 15%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--text-2) 15%, transparent) 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
  },

  rulesLayout: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: "12px",
  },
  rulesLevelList: {
    display: "grid",
    gap: "8px",
    alignContent: "start",
  },
  rulesLevelButton: {
    borderRadius: "10px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    color: "var(--text)",
    padding: "10px",
    display: "grid",
    gap: "2px",
    textAlign: "left",
    cursor: "pointer",
  },
  rulesLevelButtonActive: {
    border: "1px solid var(--primary)",
    background: "color-mix(in srgb, var(--primary) 16%, var(--surface))",
  },
  rulesControlPanel: {
    borderRadius: "14px",
    border: "1px solid var(--border)",
    padding: "10px",
    background: "var(--surface)",
  },
  hintsLayout: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: "12px",
  },
  hintsPanel: {
    borderRadius: "14px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "14px",
    display: "grid",
    gap: "8px",
  },
  sectionTitlePlain: {
    margin: "0 0 4px",
    fontSize: "16px",
    fontWeight: 700,
    color: "var(--text)",
  },
  hintRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "8px",
    alignItems: "end",
  },
  hintInputWrap: {
    display: "grid",
    gap: "4px",
  },
  failureInputWrap: {
    display: "grid",
    gap: "4px",
  },

  reviewLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 360px",
    gap: "12px",
  },
  reviewMainPanel: {
    display: "grid",
    gap: "10px",
  },
  reviewSidePanel: {
    borderRadius: "14px",
    border: "1px solid var(--border)",
    padding: "10px",
    background: "var(--surface)",
    display: "grid",
    gap: "10px",
  },
  reviewMissingPanel: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--warning) 38%, var(--border))",
    background: "color-mix(in srgb, var(--warning) 10%, var(--surface))",
    padding: "10px",
    display: "grid",
    gap: "6px",
  },
  reviewMissingTitle: {
    margin: 0,
    fontSize: "13px",
    fontWeight: 700,
    color: "var(--warning)",
  },
  reviewMissingDesc: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-2)",
    lineHeight: 1.45,
  },
  reviewMissingList: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "4px",
  },
  reviewMissingItem: {
    fontSize: "12px",
    color: "var(--text)",
    lineHeight: 1.45,
  },
  reviewLevelCard: {
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "12px",
    display: "grid",
    gap: "8px",
  },
  reviewLevelTitle: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "var(--text)",
  },
  reviewChecklist: {
    display: "grid",
    gap: "6px",
  },
  reviewCheckItem: {
    padding: "7px 9px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: 600,
  },
  reviewCheckPass: {
    border: "1px solid color-mix(in srgb, var(--success) 40%, var(--border))",
    color: "var(--success)",
    background: "color-mix(in srgb, var(--success) 10%, var(--surface))",
  },
  reviewCheckFail: {
    border: "1px solid color-mix(in srgb, var(--warning) 40%, var(--border))",
    color: "var(--warning)",
    background: "color-mix(in srgb, var(--warning) 10%, var(--surface))",
  },
  saveActionBar: {
    borderRadius: "12px",
    border: "1px solid var(--border)",
    background: "var(--surface)",
    padding: "10px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
};
