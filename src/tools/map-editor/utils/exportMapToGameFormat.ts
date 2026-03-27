import type { MapData } from "../../../shared/types/MapSchema";
import blocksConfig from "../../../shared/block/blocks-config.json";
import { sanitizeUnlockCode } from "./unlockCode";

/**
 * Portal validation error
 */
export class PortalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PortalValidationError";
  }
}

/**
 * Validate portal placements
 * Each color must have exactly 0 or 2 portals (no orphaned portals)
 *
 * @throws PortalValidationError if validation fails
 */
function validatePortals(mapData: MapData): void {
  const portalsByColor: Record<string, number> = {
    blue: 0,
    green: 0,
    orange: 0,
    purple: 0,
  };

  mapData.objects.items?.forEach((item) => {
    if (item.type === "portal") {
      const color = (item.metadata?.color as string) || "blue";
      if (color in portalsByColor) {
        portalsByColor[color]++;
      }
    }
  });

  // Check that each color has 0 or exactly 2 portals
  const invalidColors: string[] = [];
  for (const [color, count] of Object.entries(portalsByColor)) {
    if (count !== 0 && count !== 2) {
      invalidColors.push(`${color} (${count} portal${count !== 1 ? "s" : ""})`);
    }
  }

  if (invalidColors.length > 0) {
    throw new PortalValidationError(
      `Portal validation failed: ${invalidColors.join(", ")}. Each color must have exactly 0 or 2 portals.`,
    );
  }
}

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
    levelObjective?: string;
    requiredFruits?: number;
  };
  blockConstraints?: {
    blockLimit: number | null;
    allowedBlocks: string[];
    bannedBlocks?: string[];
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
  // Validate portals before exporting
  validatePortals(mapData);

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

  mapData.objects.items?.forEach((item) => {
    const isSensor = 
      item.type === "sliding_block" || 
      item.type === "disappearing_block" || 
      item.type === "portal" ||
      [57, 58, 59].includes(item.id);

    if (isSensor) {     
      if (collisionLayer[item.y] !== undefined && collisionLayer[item.y][item.x] !== undefined) {
        collisionLayer[item.y][item.x] = false; 
      }
    }
  });

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

  const isBoxType = (type: string): boolean =>
    type === "box" || type === "box1" || type === "box2" || type === "box3";

  const defaultHardnessByType = (type: string): number => {
    if (type === "box1") return 1;
    if (type === "box2") return 2;
    if (type === "box3") return 3;
    return 1;
  };

  mapData.objects.items?.forEach((item) => {
    // Skip player and goal as they are handled by startPosition/goalPosition
    if (item.type === "player" || item.id === 1 || item.type === "goal" || item.id === 2) {
      return;
    }

    const metadata = { ...(item.metadata ?? {}) };
    if (item.type === "door") {
      if (typeof metadata.isOpen !== "boolean") {
        metadata.isOpen = false;
      }
      if (typeof metadata.isLocked !== "boolean") {
        metadata.isLocked = false;
      }
      const rawUnlockCode = typeof metadata.unlockCode === "string" ? metadata.unlockCode : "";
      metadata.unlockCode = sanitizeUnlockCode(rawUnlockCode, mapData.config.type);
    }
    if (isBoxType(item.type) && typeof metadata.hardness !== "number") {
      metadata.hardness = defaultHardnessByType(item.type);
    }

    if (item.type === "fruit" || item.id === 3) {
      objects.push({
        id: `fruit-${fruitCount++}`,
        type: "fruit",
        position: { row: item.y, col: item.x },
        metadata: { ...metadata, points: 10 },
      });
    } else if (item.id === 4 || item.type === "enemy" || item.type === "slime") {
      objects.push({
        id: `enemy-${enemyCount++}`,
        type: item.type === "enemy" ? "slime" : item.type,
        position: { row: item.y, col: item.x },
        metadata: { ...metadata, difficulty: "normal" },
      });
    } else {
      objects.push({
        id: `deco-${decoCount++}`,
        type: item.type,
        position: { row: item.y, col: item.x },
        metadata: { objectId: item.id, ...metadata },
      });
    }
  });

  // Add sliding and disappearing blocks
  mapData.objects.items.forEach((obj, index) => {
    if (obj.type === "sliding_block" || obj.type === "disappearing_block") {
      objects.push({
        id: `block-${index + 1}`,
        type: obj.type,
        position: {
          row: obj.y,
          col: obj.x,
        },
      });
    }
  });

  // Add portals with color metadata
  let portalCount = 1;
  mapData.objects.items.forEach((obj) => {
    if (obj.type === "portal") {
      objects.push({
        id: `portal-${portalCount++}`,
        type: "portal",
        position: {
          row: obj.y,
          col: obj.x,
        },
        metadata: { color: (obj.metadata?.color as string) || "blue" },
      });
    }
  });
  const allBlockTypes = blocksConfig.blocks.map((block) => block.type);
  const allowedBlocks = Array.from(new Set(mapData.blockConstraints.allowedBlocks));
  const bannedBlocks =
    allowedBlocks.length === 0 ? [] : allBlockTypes.filter((type) => !allowedBlocks.includes(type));

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
      estimatedSteps: mapData.config.estimatedSteps,
      levelObjective: mapData.config.levelObjective ?? "",
      requiredFruits: mapData.config.requiredFruits,
    },
    blockConstraints: {
      blockLimit: mapData.blockConstraints.blockLimit,
      allowedBlocks,
      bannedBlocks,
      requiredBlocks: mapData.blockConstraints.requiredBlocks,
    },
  };
}
