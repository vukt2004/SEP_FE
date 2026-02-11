import type { TileMap } from "./types";

export function createBorderedMap(width: number, height: number, tileSize: number): TileMap {
  if (width < 3 || height < 3) {
    throw new Error("Map dimensions must be at least 3x3");
  }

  const tiles: number[][] = [];

  for (let row = 0; row < height; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < width; col++) {
      const isBorder = row === 0 || row === height - 1 || col === 0 || col === width - 1;
      rowData.push(isBorder ? 1 : 0);
    }
    tiles.push(rowData);
  }

  // Add goal object at bottom-right inside border
  const objects = [
    {
      id: "goal-1",
      type: "goal",
      x: (width - 2) * tileSize,
      y: (height - 2) * tileSize,
    },
    {
      id: "door-1",
      type: "door",
      x: 2 * tileSize,
      y: 1 * tileSize,
      state: "closed",
    },
  ];

  return { width, height, tileSize, tiles, objects };
}
