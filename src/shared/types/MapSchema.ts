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
  /** Map type: platform (side-scrolling) or topdown (overhead view) */
  type: "platform" | "topdown";
  /** Map width in tiles */
  width: number;
  /** Map height in tiles */
  height: number;
  /** Size of each tile in pixels */
  tileSize: number;
}

/**
 * Layer data structure
 * Each layer is a 2D array where numbers represent tile IDs
 */
export interface Layers {
  /** Visual background tiles */
  background: number[][];
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
 * Game objects and entities placed on the map
 */
export interface Objects {
  /** Player starting position */
  playerSpawn: TilePosition | null;
  /** Goal/finish position */
  goal: TilePosition | null;
  /** Collectible coins */
  coins: TilePosition[];
  /** Enemy spawns */
  enemies: Enemy[];
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
}
