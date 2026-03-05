/**
 * Object sprite definition for rendering game objects in the map editor
 * Similar to TileDefinition but for game objects
 */
export interface ObjectDefinition {
  /** Object name (used for identification and display) */
  name: string;
  /** Path to the sprite image */
  imagePath: string;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Frame index to use (for sprite sheets, 0 = first frame) */
  frameIndex: number;
}

/**
 * Reserved object names used for gameplay mechanics
 * These objects have special behavior in the game engine
 */
export const RESERVED_OBJECT_NAMES = ["player", "goal", "fruit", "enemy"] as const;
export type ReservedObjectName = (typeof RESERVED_OBJECT_NAMES)[number];
