/**
 * Shared Map Schema
 * Used by both the Map Editor and Game Engine
 *
 * This schema ensures type safety and consistency across the application.
 */

/**
 * Map configuration defining basic properties
 */
export interface MapConfig {
  /** Map type: platform (side-scrolling), topdown (overhead), or snake */
  type: "platform" | "topdown" | "snake";
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
  /** Size of each tile in pixels */
  tileSize: number;
  /** Map name */
  name: string;
  /** Map description */
  description: string;
  /** Difficulty level: 1..5 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Time limit in seconds */
  timeLimitSeconds: number;
  /** Time threshold for earning the time star, as percent of timeLimitSeconds (1..100) */
  timeStarThresholdPercent?: number;
  /** Estimated algorithm steps to complete the level */
  estimatedSteps: number;
  /** Win condition: 1 (reach goal), 2 (collect all fruits) */
  winCondition: 1 | 2;
  /** Optional user-authored level objective text */
  levelObjective?: string;
  /** Number of required fruits to collect for winCondition 2 (0 or undefined means all fruits) */
  requiredFruits?: number;
  /** Map price */
  price: number;
}

/**
 * Layer data structure
 * Each layer is a 2D array where numbers represent tile IDs
 */
export interface Layers {
  /** Visual background tiles (rendered first) */
  background: number[][];
  /** Ground tiles (rendered second) */
  ground: number[][];
  /** Foreground tiles (rendered after objects) */
  foreground: number[][];
  /** Collision/physics tiles */
  collision: number[][];
}

/**
 * Position in tile coordinates
 */
export interface TilePosition {
  x: number;
  y: number;
}

/**
 * Enemy definition with position and type
 */
export interface Enemy {
  x: number;
  y: number;
  type: string;
}

/**
 * Decorative object placement
 */
export interface DecorativeObject {
  /** Object ID from objects.json */
  id: number;
  /** Tile x coordinate */
  x: number;
  /** Tile y coordinate */
  y: number;
}

/**
 * Required block rule for a level
 */
export interface RequiredBlockRule {
  /** Block type from blocks-config.json */
  type: string;
  /** Minimum number of times this block must be used */
  minCount: number;
}

/**
 * Block usage constraints for a level
 */
export interface BlockConstraints {
  /** Maximum total number of blocks allowed. Null means unlimited */
  blockLimit: number | null;
  /** Block types that are allowed. Empty means all blocks are allowed */
  allowedBlocks: string[];
  /** Legacy compatibility field. Avoid writing new data with this field. */
  bannedBlocks?: string[];
  /** Block types that must be used at least minCount times */
  requiredBlocks: RequiredBlockRule[];
}

export interface PlacedObject {
  /** Object definition ID from objects.json */
  id: number;
  /** Logical object type (e.g. "player", "goal", "fruit", "enemy", "box1", etc) */
  type: string;
  /** Tile x coordinate */
  x: number;
  /** Tile y coordinate */
  y: number;
  /** Optional object-specific data (e.g. door isOpen, box hardness) */
  metadata?: Record<string, unknown>;
}

/**
 * Game objects and entities placed on the map
 */
export interface Objects {
  /** Unified array of all placed objects */
  items: PlacedObject[];
}

/**
 * Complete map data structure
 * This is the main export format for maps
 */
export interface MapData {
  /** Map configuration */
  config: MapConfig;
  /** Tile layers */
  layers: Layers;
  /** Game objects */
  objects: Objects;
  /** Block programming constraints */
  blockConstraints: BlockConstraints;
}
