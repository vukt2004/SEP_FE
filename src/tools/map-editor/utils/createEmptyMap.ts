import type { MapData } from "../../../shared/types/MapSchema";
import { createEmptyLayer } from "./createEmptyLayer";

/**
 * Factory function to create an empty map with default settings
 *
 * Initializes a complete MapData object with:
 * - Configuration based on parameters
 * - Empty background and collision layers
 * - No objects (all null/empty arrays)
 *
 * @param type - Map type: "platform" or "topdown"
 * @param width - Map width in tiles (10-30)
 * @param height - Map height in tiles (10-30)
 * @param tileSize - Size of each tile in pixels
 * @param name - Optional map name (defaults to empty string)
 * @param description - Optional map description (defaults to empty string)
 * @returns Complete MapData object ready for editing
 */
export function createEmptyMap(
  type: "platform" | "topdown",
  width: number,
  height: number,
  tileSize: number,
  name: string = "",
  description: string = "",
): MapData {
  return {
    config: {
      type,
      width,
      height,
      tileSize,
      name,
      description,
      difficulty: 1, // Default: Easy
      timeLimitSeconds: 300, // Default: 5 minutes
      timeStarThresholdPercent: 100, // Default: full time limit for time-star check
      estimatedSteps: 50, // Default estimated solution length
      winCondition: 1, // Default: Reach goal
      levelObjective: "",
      price: 0, // Default: Free
    },
    layers: {
      background: createEmptyLayer(width, height, 0),
      ground: createEmptyLayer(width, height, 0),
      foreground: createEmptyLayer(width, height, 0),
      collision: createEmptyLayer(width, height, 0),
    },
    objects: {
      items: [],
    },
    blockConstraints: {
      blockLimit: 30,
      allowedBlocks: [],
      requiredBlocks: [],
    },
  };
}
