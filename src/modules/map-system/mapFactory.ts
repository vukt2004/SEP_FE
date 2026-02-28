import type { LevelDefinition, GridPos } from "./types";

// ============================================================================
// GRID-BASED LEVEL FACTORY
// ============================================================================

/**
 * Tile ID constants for numeric tile system
 */
const TILE_ID = {
  EMPTY: 0,
  WALL: 1,
  GRASS: 2,
  TERRAIN_BLOCK: 3,
} as const;

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

  // Create background and collision layers
  const background: number[][] = [];
  const collision: boolean[][] = [];

  for (let row = 0; row < height; row++) {
    const bgRow: number[] = [];
    const collisionRow: boolean[] = [];

    for (let col = 0; col < width; col++) {
      const isBorder = row === 0 || row === height - 1 || col === 0 || col === width - 1;

      // Background tiles (numeric IDs)
      bgRow.push(isBorder ? TILE_ID.WALL : TILE_ID.EMPTY);

      // Collision map
      collisionRow.push(isBorder);
    }

    background.push(bgRow);
    collision.push(collisionRow);
  }

  // Define start position (top-left inside border)
  const startPosition: GridPos = { row: 1, col: 1 };

  // Define goal position (bottom-right inside border)
  const goalPosition: GridPos = { row: height - 2, col: width - 2 };

  return {
    id,
    name,
    width,
    height,
    layers: {
      background,
      collision,
    },
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

  // Create empty background and collision layers (numeric IDs)
  const background: number[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => TILE_ID.EMPTY),
  );

  const collision: boolean[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => false),
  );

  const startPosition: GridPos = { row: 0, col: 0 };
  const goalPosition: GridPos = { row: height - 1, col: width - 1 };

  return {
    id,
    name,
    width,
    height,
    layers: {
      background,
      collision,
    },
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

  // Create layers starting with borders (numeric IDs)
  const background: number[][] = [];
  const collision: boolean[][] = [];

  for (let row = 0; row < height; row++) {
    const bgRow: number[] = [];
    const collisionRow: boolean[] = [];

    for (let col = 0; col < width; col++) {
      const isBorder = row === 0 || row === height - 1 || col === 0 || col === width - 1;
      bgRow.push(isBorder ? TILE_ID.WALL : TILE_ID.EMPTY);
      collisionRow.push(isBorder);
    }

    background.push(bgRow);
    collision.push(collisionRow);
  }

  // Add deterministic wall pattern
  // Vertical walls with gaps (creates corridors)
  for (let col = 2; col < width - 1; col += 3) {
    for (let row = 1; row < height - 1; row++) {
      // Leave gaps every 2 rows
      if (row % 2 !== 0) {
        background[row][col] = TILE_ID.WALL;
        collision[row][col] = true;
      }
    }
  }

  const startPosition: GridPos = { row: 1, col: 1 };
  const goalPosition: GridPos = { row: height - 2, col: width - 2 };

  return {
    id,
    name,
    width,
    height,
    layers: {
      background,
      collision,
    },
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
 * Create a level from custom layer data
 * For loading levels from API or custom definitions
 */
export function createCustomLevel(
  id: string,
  name: string,
  background: number[][],
  collision: boolean[][],
  startPosition: GridPos,
  goalPosition: GridPos,
  metadata?: LevelDefinition["metadata"],
  ground?: number[][],
  foreground?: number[][],
): LevelDefinition {
  const height = background.length;
  const width = background[0]?.length ?? 0;

  if (height === 0 || width === 0) {
    throw new Error("Level must have at least 1x1 tiles");
  }

  // Validate consistent row lengths for background
  for (const row of background) {
    if (row.length !== width) {
      throw new Error("All background rows must have the same width");
    }
  }

  // Validate ground layer if provided
  if (ground) {
    if (ground.length !== height) {
      throw new Error("Ground layer must match background height");
    }
    for (const row of ground) {
      if (row.length !== width) {
        throw new Error("All ground rows must have the same width");
      }
    }
  }

  // Validate foreground layer if provided
  if (foreground) {
    if (foreground.length !== height) {
      throw new Error("Foreground layer must match background height");
    }
    for (const row of foreground) {
      if (row.length !== width) {
        throw new Error("All foreground rows must have the same width");
      }
    }
  }

  // Validate consistent row lengths for collision
  if (collision.length !== height) {
    throw new Error("Collision layer must match background height");
  }

  for (const row of collision) {
    if (row.length !== width) {
      throw new Error("All collision rows must have the same width");
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
    layers: {
      background,
      collision,
      ...(ground && { ground }),
      ...(foreground && { foreground }),
    },
    startPosition,
    goalPosition,
    metadata,
  };
}
