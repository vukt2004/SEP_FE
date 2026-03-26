/**
 * Tile definition for sprite-based tile rendering
 * Defines the location of a tile in a tileset image
 */
export interface TileDefinition {
  /** Path to the tileset image */
  imagePath: string;
  /** X position in the tileset (in tiles, not pixels) */
  tileX: number;
  /** Y position in the tileset (in tiles, not pixels) */
  tileY: number;
  /** Width of a single tile in pixels */
  tileSize: number;
  group_EN: string;
  group_VI: string;
}
