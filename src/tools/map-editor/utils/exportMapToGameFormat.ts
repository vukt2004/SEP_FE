import type { MapData } from "../../../shared/types/MapSchema";

/**
 * Game level format (matches public/mock-data/test-view/*.json)
 */
export interface GameLevelFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  tileset: string;
  layers: {
    background: number[][];
    collision: boolean[][];
  };
  startPosition: {
    row: number;
    col: number;
  } | null;
  goalPosition: {
    row: number;
    col: number;
  } | null;
  objects?: Array<{
    id: string;
    type: string;
    position: {
      row: number;
      col: number;
    };
    metadata?: Record<string, unknown>;
  }>;
  metadata: {
    difficulty: string;
    description: string;
    targetAlgorithm: string;
    estimatedSteps: number;
  };
}

/**
 * Convert editor MapData to game level format
 *
 * Merges multiple visual layers (background, ground, foreground) into a single
 * background layer for the game engine. Non-zero tiles from higher layers
 * override lower layers.
 *
 * @param mapData - Map data from the editor
 * @param levelName - Optional name for the level (overrides mapData.config.name)
 * @returns Game level format
 */
export function exportMapToGameFormat(mapData: MapData, levelName?: string): GameLevelFormat {
  const timestamp = Date.now();
  const id = `level-${mapData.config.type}-${timestamp}`;
  const name = levelName || mapData.config.name || `${mapData.config.type} Level`;
  const description =
    mapData.config.description ||
    `A ${mapData.config.type} level with ${mapData.config.width}x${mapData.config.height} tiles`;

  // Merge visual layers: background -> ground -> foreground
  // Later layers override earlier ones (non-zero values take priority)
  const mergedBackground: number[][] = [];
  for (let y = 0; y < mapData.config.height; y++) {
    mergedBackground[y] = [];
    for (let x = 0; x < mapData.config.width; x++) {
      // Start with background, then override with ground and foreground if they have tiles
      let tile = mapData.layers.background[y][x];

      if (mapData.layers.ground && mapData.layers.ground[y][x] !== 0) {
        tile = mapData.layers.ground[y][x];
      }

      if (mapData.layers.foreground && mapData.layers.foreground[y][x] !== 0) {
        tile = mapData.layers.foreground[y][x];
      }

      mergedBackground[y][x] = tile;
    }
  }

  // Convert collision layer from numbers to booleans
  // Non-zero values = true (collidable), 0 = false (passable)
  const collisionLayer: boolean[][] = mapData.layers.collision.map((row) =>
    row.map((tile) => tile !== 0),
  );

  // Convert player spawn from {x, y} to {row, col}
  const startPosition = mapData.objects.playerSpawn
    ? {
        row: mapData.objects.playerSpawn.y,
        col: mapData.objects.playerSpawn.x,
      }
    : null;

  // Convert goal from {x, y} to {row, col}
  const goalPosition = mapData.objects.goal
    ? {
        row: mapData.objects.goal.y,
        col: mapData.objects.goal.x,
      }
    : null;

  // Convert fruits and enemies to objects array
  const objects: GameLevelFormat["objects"] = [];

  // Add fruits as collectible objects
  mapData.objects.fruits.forEach((fruit, index) => {
    objects.push({
      id: `fruit-${index + 1}`,
      type: "fruit",
      position: {
        row: fruit.y,
        col: fruit.x,
      },
      metadata: {
        points: 10,
      },
    });
  });

  // Add enemies
  mapData.objects.enemies.forEach((enemy, index) => {
    objects.push({
      id: `enemy-${index + 1}`,
      type: enemy.type,
      position: {
        row: enemy.y,
        col: enemy.x,
      },
      metadata: {
        difficulty: "normal",
      },
    });
  });

  return {
    id,
    name,
    width: mapData.config.width,
    height: mapData.config.height,
    tileset: "default",
    layers: {
      background: mergedBackground,
      collision: collisionLayer,
    },
    startPosition,
    goalPosition,
    ...(objects.length > 0 && { objects }),
    metadata: {
      difficulty: "medium",
      description: description,
      targetAlgorithm: "manual",
      estimatedSteps: 50,
    },
  };
}
