import type { LevelDefinition } from "../modules/map-system/types";
import type { MapConfig } from "../shared/types/MapSchema";
import { cmsMapsApi } from "../services/api/cms/maps.api";
import { learnerMapsApi } from "../services/api/learner/maps.api";
import { tokenStorage } from "../lib/storage/tokenStorage";

/**
 * Result of loading a level from API
 */
export interface LevelLoadResult {
  level: LevelDefinition;
  mapConfig?: Partial<MapConfig>;
}

/**
 * Load level data from API (context-aware: uses learner or CMS API based on authentication)
 *
 * @param levelId - Level map ID from API
 * @returns Level definition with map config
 */
export async function loadLevelFromAPI(levelId: string): Promise<LevelLoadResult> {
  try {
    // Detect which user is authenticated
    const learnerToken = tokenStorage.getLearnerToken();
    const cmsToken = tokenStorage.getCmsToken();

    const isLearner = !!learnerToken;
    const isCms = !!cmsToken;

    // Use the appropriate API
    const mapsApi = isLearner ? learnerMapsApi : isCms ? cmsMapsApi : null;

    if (!mapsApi) {
      throw new Error("No authentication found. Please log in to play.");
    }

    const response = await mapsApi.getMapById(levelId, false);

    if (!response.data.isSuccess || !response.data.data) {
      throw new Error(response.data.message || "Failed to load level");
    }

    const mapDetail = response.data.data;

    console.log("Map detail from API:", mapDetail);

    // Check if mapDetailJson exists (might be added by backend)
    let levelData: unknown;
    if ("mapDetailJson" in mapDetail && mapDetail.mapDetailJson) {
      console.log("Using mapDetailJson property");
      levelData = mapDetail.mapDetailJson;
    } else if (mapDetail.activeSpec?.gridSpec) {
      // Parse the gridSpec JSON string
      console.log("Parsing gridSpec:", mapDetail.activeSpec.gridSpec.substring(0, 100) + "...");
      try {
        levelData = JSON.parse(mapDetail.activeSpec.gridSpec);
        console.log("Parsed level data:", levelData);
      } catch (e) {
        console.error("Failed to parse gridSpec:", e);
        throw new Error("Invalid map data format");
      }
    } else {
      throw new Error("No map data found in response");
    }

    // Extract map config from API response (stored at top level, not in JSON)
    const mapConfig: Partial<MapConfig> = {
      name: mapDetail.title,
      description: mapDetail.description,
      type: mapDetail.type === "Platform" ? "platform" : "topdown", // Convert API format to MapConfig format
      difficulty: mapDetail.difficulty as 1 | 2 | 3 | 4 | 5,
      timeLimitSeconds: Math.floor(mapDetail.timeLimitMs / 1000), // Convert ms to seconds
      estimatedSteps: (levelData as LevelDefinition).metadata?.estimatedSteps as number | undefined,
      winCondition: mapDetail.winCondition as 1 | 2,
      price: mapDetail.price,
      requiredFruits: (levelData as LevelDefinition).metadata?.requiredFruits as number | undefined,
      width: (levelData as LevelDefinition).width,
      height: (levelData as LevelDefinition).height,
    };

    console.log("Extracted map config:", mapConfig);

    return {
      level: levelData as LevelDefinition,
      mapConfig,
    };
  } catch (error) {
    console.error("Error loading level from API:", error);
    throw error;
  }
}

/**
 * Load level data from mock JSON files in the public/mock-data folder
 * In production, this will be replaced with API calls
 *
 * Note: Files are served from public/mock-data/ and accessible at /mock-data/
 */
export async function loadLevelFromMockData(levelId: string): Promise<LevelLoadResult> {
  try {
    const response = await fetch(`/mock-data/test-view/${levelId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load level: ${levelId}`);
    }
    const data = await response.json();

    // Extract map config if available
    let mapConfig: Partial<MapConfig> | undefined;
    if (data.config) {
      mapConfig = data.config;
    } else if (data.metadata || (data.width && data.height)) {
      mapConfig = {
        estimatedSteps: data.metadata?.estimatedSteps,
        requiredFruits: data.metadata?.requiredFruits,
        width: data.width,
        height: data.height,
      };
    }

    return {
      level: data as LevelDefinition,
      mapConfig,
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
