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
 * @param width - Map width in tiles
 * @param height - Map height in tiles
 * @param tileSize - Size of each tile in pixels
 * @returns Complete MapData object ready for editing
 */
export function createEmptyMap(
  type: "platform" | "topdown",
  width: number,
  height: number,
  tileSize: number,
): MapData {
  return {
    config: {
      type,
      width,
      height,
      tileSize,
    },
    layers: {
      background: createEmptyLayer(width, height, 0),
      ground: createEmptyLayer(width, height, 0),
      foreground: createEmptyLayer(width, height, 0),
      collision: createEmptyLayer(width, height, 0),
    },
    objects: {
      playerSpawn: null,
      goal: null,
      coins: [],
      enemies: [],
    },
  };
}
