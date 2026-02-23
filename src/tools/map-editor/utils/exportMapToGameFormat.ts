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
 * @param mapData - Map data from the editor
 * @param levelName - Optional name for the level
 * @returns Game level format
 */
export function exportMapToGameFormat(mapData: MapData, levelName?: string): GameLevelFormat {
  const timestamp = Date.now();
  const id = `level-${mapData.config.type}-${timestamp}`;
  const name = levelName || `${mapData.config.type} Level`;

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

  // Convert coins and enemies to objects array
  const objects: GameLevelFormat["objects"] = [];

  // Add coins as collectible objects
  mapData.objects.coins.forEach((coin, index) => {
    objects.push({
      id: `coin-${index + 1}`,
      type: "coin",
      position: {
        row: coin.y,
        col: coin.x,
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
      background: mapData.layers.background,
      collision: collisionLayer,
    },
    startPosition,
    goalPosition,
    ...(objects.length > 0 && { objects }),
    metadata: {
      difficulty: "medium",
      description: `A ${mapData.config.type} level with ${mapData.config.width}x${mapData.config.height} tiles`,
      targetAlgorithm: "manual",
      estimatedSteps: 50,
    },
  };
}
