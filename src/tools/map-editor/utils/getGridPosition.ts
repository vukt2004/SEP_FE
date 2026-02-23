import type { MapData } from "../../../shared/types/MapSchema";

/**
 * Grid position result
 */
export interface GridPosition {
  x: number;
  y: number;
}

/**
 * Convert mouse position to grid coordinates
 *
 * This utility converts pixel coordinates (from mouse events) into
 * tile grid coordinates, performing bounds checking to ensure the
 * position is within the valid map area.
 *
 * @param mouseX - Mouse X position in pixels (relative to canvas)
 * @param mouseY - Mouse Y position in pixels (relative to canvas)
 * @param mapData - The map data containing dimensions and tile size
 * @returns Grid position {x, y} or null if outside bounds
 */
export function getGridPosition(
  mouseX: number,
  mouseY: number,
  mapData: MapData,
): GridPosition | null {
  const { width, height, tileSize } = mapData.config;

  // Convert pixel position to tile position using floor division
  const tileX = Math.floor(mouseX / tileSize);
  const tileY = Math.floor(mouseY / tileSize);

  // Check if position is within grid bounds
  if (tileX < 0 || tileX >= width || tileY < 0 || tileY >= height) {
    return null;
  }

  return { x: tileX, y: tileY };
}
