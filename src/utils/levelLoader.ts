import type { LevelDefinition } from "../modules/map-system/types";

/**
 * Load level data from mock JSON files in the public/mock-data folder
 * In production, this will be replaced with API calls
 *
 * Note: Files are served from public/mock-data/ and accessible at /mock-data/
 */
export async function loadLevelFromMockData(levelId: string): Promise<LevelDefinition> {
  try {
    const response = await fetch(`/mock-data/${levelId}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load level: ${levelId}`);
    }
    const data = await response.json();
    return data as LevelDefinition;
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
    const response = await fetch("/mock-data/levels-index.json");
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
export async function getLevelById(levelId: string): Promise<LevelDefinition> {
  const index = await loadLevelsIndex();
  const levelInfo = index.levels.find((level) => level.id === levelId);

  if (!levelInfo) {
    throw new Error(`Level not found: ${levelId}`);
  }

  const fileName = levelInfo.file.replace(".json", "");
  return loadLevelFromMockData(fileName);
}
