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
    ground: number[][];
    foreground: number[][];
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
  blockConstraints?: {
    blockLimit: number | null;
    bannedBlocks: string[];
    requiredBlocks: Array<{
      type: string;
      minCount: number;
    }>;
  };
}

/**
 * Convert editor MapData to game level format
 *
 * Exports all 4 layers (background, ground, foreground, collision) separately
 * for better visual layering in the game engine.
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

  // Export all visual layers separately (no merging)
  const backgroundLayer = mapData.layers.background;
  const groundLayer = mapData.layers.ground;
  const foregroundLayer = mapData.layers.foreground;

  // Convert collision layer from numbers to booleans
  // Non-zero values = true (collidable), 0 = false (passable)
  const collisionLayer: boolean[][] = mapData.layers.collision.map((row) =>
    row.map((tile) => tile !== 0),
  );

  // Find player and goal for specific positions if any
  const playerItem = mapData.objects.items?.find((item) => item.type === "player" || item.id === 1);
  const goalItem = mapData.objects.items?.find((item) => item.type === "goal" || item.id === 2);

  // Convert player spawn from {x, y} to {row, col}
  const startPosition = playerItem
    ? {
        row: playerItem.y,
        col: playerItem.x,
      }
    : null;

  // Convert goal from {x, y} to {row, col}
  const goalPosition = goalItem
    ? {
        row: goalItem.y,
        col: goalItem.x,
      }
    : null;

  // Convert other items to objects array
  const objects: GameLevelFormat["objects"] = [];

  let fruitCount = 1;
  let enemyCount = 1;
  let decoCount = 1;

  mapData.objects.items?.forEach((item) => {
    // Skip player and goal as they are handled by startPosition/goalPosition
    if (item.type === "player" || item.id === 1 || item.type === "goal" || item.id === 2) {
      return;
    }

    if (item.type === "fruit" || item.id === 3) {
      objects.push({
        id: `fruit-${fruitCount++}`,
        type: "fruit",
        position: { row: item.y, col: item.x },
        metadata: { points: 10 },
      });
    } else if (item.id === 4 || item.type === "enemy" || item.type === "slime") {
      objects.push({
        id: `enemy-${enemyCount++}`,
        type: item.type === "enemy" ? "slime" : item.type,
        position: { row: item.y, col: item.x },
        metadata: { difficulty: "normal" },
      });
    } else {
      objects.push({
        id: `deco-${decoCount++}`,
        type: item.type,
        position: { row: item.y, col: item.x },
        metadata: { objectId: item.id },
      });
    }
  });

  return {
    id,
    name,
    width: mapData.config.width,
    height: mapData.config.height,
    tileset: "default",
    layers: {
      background: backgroundLayer,
      ground: groundLayer,
      foreground: foregroundLayer,
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
    blockConstraints: {
      blockLimit: mapData.blockConstraints.blockLimit,
      bannedBlocks: mapData.blockConstraints.bannedBlocks,
      requiredBlocks: mapData.blockConstraints.requiredBlocks,
    },
  };
}
