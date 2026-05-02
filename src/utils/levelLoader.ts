import type { LevelDefinition } from "../modules/map-system/types";
import type { MapConfig } from "../shared/types/MapSchema";
import type { MapLevelItem } from "../types/api/learner/maps";
import { cmsMapsApi } from "../services/api/cms/maps.api";
import { learnerMapsApi } from "../services/api/learner/maps.api";
import { tokenStorage } from "../lib/storage/tokenStorage";

export type { MapLevelItem };

/**
 * Result of loading a level from API
 */
export interface LevelLoadResult {
  level: LevelDefinition;
  mapConfig?: Partial<MapConfig>;
  /** MapDetails.Id for validate / lobby submit (null if legacy response without levels). */
  mapDetailId: string | null;
  /** Sorted by levelOrder; omitted for mock files. */
  levels?: MapLevelItem[];
  levelOrder: number;
}

export type LoadLevelOptions = {
  /** Play this MapDetails row; if omitted, first level (lowest order) is used. */
  mapDetailId?: string;
  /** Use latest-version detail endpoint when available. */
  useLatest?: boolean;
};

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function parseLevelsFromPayload(mapDetail: unknown): MapLevelItem[] {
  if (!mapDetail || typeof mapDetail !== "object") return [];
  const m = mapDetail as Record<string, unknown>;
  const raw = m.levels ?? m.Levels;
  if (!Array.isArray(raw)) return [];
  const out: MapLevelItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = o.id ?? o.Id;
    if (typeof id !== "string" || !id) continue;
    const order = Number(o.levelOrder ?? o.LevelOrder ?? 0);
    out.push({
      id,
      levelOrder: Number.isFinite(order) ? order : 0,
      title: (o.title ?? o.Title) as string | null | undefined,
      detailJson: o.detailJson ?? o.DetailJson,
      timeLimitMs: num(o.timeLimitMs ?? o.TimeLimitMs),
      winCondition: num(o.winCondition ?? o.WinCondition),
      type: typeof (o.type ?? o.Type) === "string" ? String(o.type ?? o.Type) : undefined,
    });
  }
  return out.sort((a, b) => a.levelOrder - b.levelOrder);
}

/** "Topdown" | "Platform" | "Snake" (any casing) → MapConfig engine type */
function apiTypeToMapConfigType(apiType: string | undefined): "platform" | "topdown" | "snake" {
  const s = (apiType ?? "").trim().toLowerCase();
  if (s === "snake") return "snake";
  return s === "platform" ? "platform" : "topdown";
}

function inferSnakeFromLevelData(levelData: unknown): boolean {
  if (!levelData || typeof levelData !== "object") {
    return false;
  }

  const ld = levelData as Record<string, unknown>;
  const configType =
    ld.config && typeof ld.config === "object"
      ? (ld.config as Record<string, unknown>).type
      : undefined;

  if (typeof configType === "string" && configType.trim().toLowerCase() === "snake") {
    return true;
  }

  const levelId = typeof ld.id === "string" ? ld.id.trim().toLowerCase() : "";
  if (levelId.includes("snake")) {
    return true;
  }

  return false;
}

/**
 * First MapDetails id after GET map (for lobby / deep link). Returns undefined if no levels array.
 */
export function getFirstMapDetailIdFromPayload(mapDetail: unknown): string | undefined {
  const levels = parseLevelsFromPayload(mapDetail);
  return levels[0]?.id;
}

/**
 * Route + first level id: dùng khi map không còn `type` ở root, chỉ có trên từng level.
 */
export function getFirstLevelPlayHint(mapDetail: unknown): {
  mapDetailId?: string;
  mapType: "platform" | "topdown" | "snake";
  isPlatform: boolean;
  winCondition?: number;
  timeLimitMs?: number;
} {
  const levels = parseLevelsFromPayload(mapDetail);
  const first = levels[0];
  const md = mapDetail as Record<string, unknown>;
  const rootType = md.type ?? md.Type;
  const fromLevelType = (() => {
    const t = first?.type;
    if (t == null || t === "") return undefined;
    const s = String(t).trim().toLowerCase();
    if (s === "platform") return "platform" as const;
    if (s === "topdown") return "topdown" as const;
    if (s === "snake") return "snake" as const;
    return undefined;
  })();
  const fromRootType = (() => {
    const s = typeof rootType === "string" ? rootType.trim().toLowerCase() : "";
    if (s === "platform") return "platform" as const;
    if (s === "topdown") return "topdown" as const;
    if (s === "snake") return "snake" as const;
    return undefined;
  })();
  const mapType = fromLevelType ?? fromRootType ?? "topdown";
  const isPlatform = mapType === "platform";
  const winCondition =
    typeof first?.winCondition === "number" ? first.winCondition : num(md.winCondition);
  const timeLimitMs =
    typeof first?.timeLimitMs === "number" ? first.timeLimitMs : num(md.timeLimitMs);
  return { mapDetailId: first?.id, mapType, isPlatform, winCondition, timeLimitMs };
}

function pickLevel(
  levels: MapLevelItem[],
  requestedMapDetailId: string | undefined,
  mapDetailJson: unknown,
): {
  levelData: unknown;
  activeLevel: MapLevelItem | null;
  mapDetailId: string | null;
  levelOrder: number;
} {
  if (levels.length === 0) {
    return { levelData: mapDetailJson, activeLevel: null, mapDetailId: null, levelOrder: 0 };
  }
  if (requestedMapDetailId) {
    const row = levels.find((l) => l.id === requestedMapDetailId);
    if (row && row.detailJson != null) {
      return { levelData: row.detailJson, activeLevel: row, mapDetailId: row.id, levelOrder: row.levelOrder };
    }
  }
  const first = levels[0];
  if (first?.detailJson != null) {
    return { levelData: first.detailJson, activeLevel: first, mapDetailId: first.id, levelOrder: first.levelOrder };
  }
  return {
    levelData: mapDetailJson,
    activeLevel: first ?? null,
    mapDetailId: first?.id ?? null,
    levelOrder: first?.levelOrder ?? 0,
  };
}

/**
 * Load level data from API (context-aware: uses learner or CMS API based on authentication)
 *
 * @param mapId - Map entity id from API
 * @param options.mapDetailId - Which MapDetails row to play (defaults to first level)
 */
export async function loadLevelFromAPI(
  mapId: string,
  options?: LoadLevelOptions,
): Promise<LevelLoadResult> {
  try {
    const learnerToken = tokenStorage.getLearnerToken();
    const cmsToken = tokenStorage.getCmsToken();

    const isLearner = !!learnerToken;
    const isCms = !!cmsToken;

    const mapsApi = isLearner ? learnerMapsApi : isCms ? cmsMapsApi : null;

    if (!mapsApi) {
      throw new Error("No authentication found. Please log in to play.");
    }

    const response = options?.useLatest
      ? await (mapsApi as typeof learnerMapsApi).getLatestMapById(mapId)
      : await mapsApi.getMapById(mapId, false);

    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Failed to load level");
    }

    const mapDetail = response.data.data;
    const md = mapDetail as unknown as Record<string, unknown>;
    const levels = parseLevelsFromPayload(mapDetail);
    const mapDetailJson =
      "mapDetailJson" in mapDetail && mapDetail.mapDetailJson != null
        ? mapDetail.mapDetailJson
        : undefined;

    const picked = pickLevel(levels, options?.mapDetailId, mapDetailJson);
    const { activeLevel, levelData: initialLevelData } = picked;

    let levelData: unknown = initialLevelData;

    const activeSpec = md.activeSpec as { gridSpec?: string } | undefined;
    if (levelData == null && activeSpec?.gridSpec) {
      try {
        levelData = JSON.parse(activeSpec.gridSpec);
      } catch {
        throw new Error("Invalid map data format");
      }
    }

    if (levelData == null) {
      throw new Error("No map data found in response");
    }

    const ld = levelData as LevelDefinition;
    const meta = ld.metadata;

    const typeFromApi =
      activeLevel?.type ?? (typeof md.type === "string" ? (md.type as string) : undefined) ?? "Topdown";
    const typeFromApiNormalized = apiTypeToMapConfigType(typeFromApi);
    const gameType = inferSnakeFromLevelData(levelData) ? "snake" : typeFromApiNormalized;

    const timeLimitMsResolved =
      (typeof activeLevel?.timeLimitMs === "number" ? activeLevel.timeLimitMs : undefined) ??
      num(md.timeLimitMs) ??
      0;

    const timeLimitSeconds =
      typeof timeLimitMsResolved === "number" && timeLimitMsResolved > 0
        ? Math.floor(timeLimitMsResolved / 1000)
        : undefined;

    const winFromMeta = meta && typeof (meta as { winCondition?: unknown }).winCondition === "number"
      ? (meta as { winCondition: number }).winCondition
      : undefined;

    const winConditionRaw =
      (typeof activeLevel?.winCondition === "number" ? activeLevel.winCondition : undefined) ??
      num(md.winCondition) ??
      winFromMeta ??
      1;
    const winCondition: 1 | 2 = winConditionRaw === 2 ? 2 : 1;

    const mapConfig: Partial<MapConfig> = {
      name: (typeof md.title === "string" ? md.title : "") || "",
      description: typeof md.description === "string" ? md.description : "",
      type: gameType,
      difficulty: (num(md.difficulty) ?? 1) as 1 | 2 | 3 | 4 | 5,
      timeLimitSeconds,
      timeStarThresholdPercent: meta?.timeStarThresholdPercent as number | undefined,
      estimatedSteps: meta?.estimatedSteps as number | undefined,
      winCondition,
      levelObjective: meta?.levelObjective as string | undefined,
      price: typeof md.price === "number" ? md.price : (md.price as number | undefined),
      requiredFruits: meta?.requiredFruits as number | undefined,
      width: ld.width,
      height: ld.height,
    };

    return {
      level: levelData as LevelDefinition,
      mapConfig,
      mapDetailId: picked.mapDetailId,
      levels: levels.length ? levels : undefined,
      levelOrder: picked.levelOrder,
    };
  } catch (error) {
    console.error("Error loading level from API:", error);
    throw error;
  }
}

/**
 * Load level data from mock JSON files in the public/mock-data folder
 */
export async function loadLevelFromMockData(levelId: string): Promise<LevelLoadResult> {
  try {
    const response = await fetch(`/mock-data/test-view/${levelId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load level: ${levelId}`);
    }
    const data = await response.json();

    let mapConfig: Partial<MapConfig> | undefined;
    if (data.config) {
      mapConfig = data.config;
    } else if (data.metadata || (data.width && data.height)) {
      mapConfig = {
        type: inferSnakeFromLevelData(data) ? "snake" : undefined,
        timeStarThresholdPercent: data.metadata?.timeStarThresholdPercent,
        estimatedSteps: data.metadata?.estimatedSteps,
        levelObjective: data.metadata?.levelObjective,
        requiredFruits: data.metadata?.requiredFruits,
        width: data.width,
        height: data.height,
      };
    }

    if (mapConfig && !mapConfig.type && inferSnakeFromLevelData(data)) {
      mapConfig.type = "snake";
    }

    return {
      level: data as LevelDefinition,
      mapConfig,
      mapDetailId: null,
      levelOrder: 0,
    };
  } catch (error) {
    console.error("Error loading level:", error);
    throw error;
  }
}

/**
 * Load levels index
 */
export async function loadLevelsIndex(): Promise<{
  levels: Array<{
    id: string;
    file: string;
    name: string;
    type: string;
    difficulty: string;
  }>;
}> {
  try {
    const response = await fetch("/mock-data/test-view/levels-index.json");
    if (!response.ok) {
      throw new Error("Failed to load levels index");
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading levels index:", error);
    throw error;
  }
}

/**
 * Get a level by ID from the index
 */
export async function getLevelById(levelId: string): Promise<LevelLoadResult> {
  const index = await loadLevelsIndex();
  const levelInfo = index.levels.find((level) => level.id === levelId);

  if (!levelInfo) {
    throw new Error(`Level not found: ${levelId}`);
  }

  const fileName = levelInfo.file.replace(".json", "");
  return loadLevelFromMockData(fileName);
}
