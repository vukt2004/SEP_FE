import type { Player } from "../core/types";
import type { TileMap } from "../../map-system/types";

/**
 * Interface for player movement controllers
 * Different implementations handle different game types (TopDown, Platform)
 */
export interface IPlayerController {
  /**
   * Execute movement forward based on player's facing direction
   * @returns true if movement was successful, false if blocked
   */
  moveForward(player: Player, map: TileMap): boolean;

  /**
   * Apply physics/gravity if needed for this controller type
   * Called after each movement command
   */
  applyPhysics(player: Player, map: TileMap): void;

  /**
   * Check if there's an obstacle ahead in the facing direction
   */
  isObstacleAhead(player: Player, map: TileMap): boolean;

  /**
   * Check if a tile position is solid (wall or collidable object)
   */
  isSolidTile(x: number, y: number, map: TileMap): boolean;
}
