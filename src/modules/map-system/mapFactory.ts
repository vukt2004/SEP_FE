import type { LevelDefinition, TileType, GridPos } from "./types";

// ============================================================================
// GRID-BASED LEVEL FACTORY
// ============================================================================

/**
 * Create a basic bordered level for algorithm learning
 * Grid-based coordinates only, no pixel/rendering data
 *
 * @param width - Grid width in tiles (must be at least 3)
 * @param height - Grid height in tiles (must be at least 3)
 * @param id - Unique level identifier
 * @param name - Display name for the level
 * @returns Immutable LevelDefinition
 */
export function createBorderedLevel(
  width: number,
  height: number,
  id: string = "level-bordered",
  name: string = "Bordered Level",
): LevelDefinition {
  if (width < 3 || height < 3) {
    throw new Error("Level dimensions must be at least 3x3");
  }

  // Create tile grid with borders as walls
  const tiles: TileType[][] = [];
  for (let row = 0; row < height; row++) {
    const rowData: TileType[] = [];
    for (let col = 0; col < width; col++) {
      const isBorder = row === 0 || row === height - 1 || col === 0 || col === width - 1;
      rowData.push(isBorder ? "wall" : "empty");
    }
    tiles.push(rowData);
  }

  // Define start position (top-left inside border)
  const startPosition: GridPos = { row: 1, col: 1 };

  // Define goal position (bottom-right inside border)
  const goalPosition: GridPos = { row: height - 2, col: width - 2 };

  // Mark start and goal tiles
  tiles[startPosition.row][startPosition.col] = "start";
  tiles[goalPosition.row][goalPosition.col] = "goal";

  return {
    id,
    name,
    width,
    height,
    tiles,
    startPosition,
    goalPosition,
    metadata: {
      difficulty: "easy",
      description: "A simple bordered level for learning basic pathfinding",
      targetAlgorithm: "BFS",
    },
  };
}

/**
 * Create an empty level with no walls
 * Useful for free-form algorithm demonstrations
 */
export function createEmptyLevel(
  width: number,
  height: number,
  id: string = "level-empty",
  name: string = "Empty Grid",
): LevelDefinition {
  if (width < 2 || height < 2) {
    throw new Error("Level dimensions must be at least 2x2");
  }

  // Create empty tile grid
  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => "empty" as TileType),
  );

  const startPosition: GridPos = { row: 0, col: 0 };
  const goalPosition: GridPos = { row: height - 1, col: width - 1 };

  tiles[startPosition.row][startPosition.col] = "start";
  tiles[goalPosition.row][goalPosition.col] = "goal";

  return {
    id,
    name,
    width,
    height,
    tiles,
    startPosition,
    goalPosition,
    metadata: {
      difficulty: "easy",
      description: "An empty grid with no obstacles",
    },
  };
}

/**
 * Create a maze-like level with wall patterns
 * Deterministic patterns for algorithm teaching
 */
export function createMazeLevel(
  width: number,
  height: number,
  id: string = "level-maze",
  name: string = "Maze Level",
): LevelDefinition {
  if (width < 5 || height < 5) {
    throw new Error("Maze level dimensions must be at least 5x5");
  }

  // Create bordered level as base
  const tiles: TileType[][] = [];
  for (let row = 0; row < height; row++) {
    const rowData: TileType[] = [];
    for (let col = 0; col < width; col++) {
      const isBorder = row === 0 || row === height - 1 || col === 0 || col === width - 1;
      rowData.push(isBorder ? "wall" : "empty");
    }
    tiles.push(rowData);
  }

  // Add deterministic wall pattern
  // Vertical walls with gaps (creates corridors)
  for (let col = 2; col < width - 1; col += 3) {
    for (let row = 1; row < height - 1; row++) {
      // Leave gaps every 2 rows
      if (row % 2 !== 0) {
        tiles[row][col] = "wall";
      }
    }
  }

  const startPosition: GridPos = { row: 1, col: 1 };
  const goalPosition: GridPos = { row: height - 2, col: width - 2 };

  tiles[startPosition.row][startPosition.col] = "start";
  tiles[goalPosition.row][goalPosition.col] = "goal";

  return {
    id,
    name,
    width,
    height,
    tiles,
    startPosition,
    goalPosition,
    metadata: {
      difficulty: "medium",
      description: "A maze with corridors for pathfinding algorithms",
      targetAlgorithm: "DFS",
    },
  };
}

/**
 * Create a level from custom tile data
 * For loading levels from API or custom definitions
 */
export function createCustomLevel(
  id: string,
  name: string,
  tiles: TileType[][],
  startPosition: GridPos,
  goalPosition: GridPos,
  metadata?: LevelDefinition["metadata"],
): LevelDefinition {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;

  if (height === 0 || width === 0) {
    throw new Error("Level must have at least 1x1 tiles");
  }

  // Validate consistent row lengths
  for (const row of tiles) {
    if (row.length !== width) {
      throw new Error("All rows must have the same width");
    }
  }

  // Validate positions
  if (
    startPosition.row < 0 ||
    startPosition.row >= height ||
    startPosition.col < 0 ||
    startPosition.col >= width
  ) {
    throw new Error("Start position is out of bounds");
  }

  if (
    goalPosition.row < 0 ||
    goalPosition.row >= height ||
    goalPosition.col < 0 ||
    goalPosition.col >= width
  ) {
    throw new Error("Goal position is out of bounds");
  }

  return {
    id,
    name,
    width,
    height,
    tiles,
    startPosition,
    goalPosition,
    metadata,
  };
}
