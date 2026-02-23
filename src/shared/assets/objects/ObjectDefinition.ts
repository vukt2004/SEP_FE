/**
 * Object sprite definition for rendering game objects in the map editor
 * Similar to TileDefinition but for game objects
 */
export interface ObjectDefinition {
  /** Path to the sprite image */
  imagePath: string;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Frame index to use (for sprite sheets, 0 = first frame) */
  frameIndex: number;
}
