/**
 * Create an empty layer for the map editor
 *
 * Generates a 2D array (grid) filled with a default value.
 * Used to initialize background and collision layers.
 *
 * @param width - Number of tiles horizontally
 * @param height - Number of tiles vertically
 * @param defaultValue - Value to fill each cell with (default: 0)
 * @returns 2D array representing the layer
 */
export function createEmptyLayer(
  width: number,
  height: number,
  defaultValue: number = 0,
): number[][] {
  const layer: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      row.push(defaultValue);
    }
    layer.push(row);
  }

  return layer;
}
