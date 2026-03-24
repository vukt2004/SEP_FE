import type { Player } from "../core/types";
import type { LevelDefinition } from "../../map-system/types";

/**
 * Interface for player movement controllers
 * Different implementations handle different game types (TopDown, Platform)
 */
export interface IPlayerController {
  /**
   * Execute movement forward based on player's facing direction
   * @returns true if movement was successful, false if blocked
   */
  moveForward(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): boolean;

  /**
   * Apply physics/gravity if needed for this controller type
   * Called after each movement command
   * @returns number of tiles the player fell this step
   */
  applyPhysics(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): number;

  /**
   * Check if there's an obstacle ahead in the facing direction
   */
  isObstacleAhead(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): boolean;

  /**
   * Check if a tile position is solid (wall or collidable object)
   */
  isSolidTile(
    x: number,
    y: number,
    level: LevelDefinition,
    objectStates: ReadonlyMap<string, string>,
  ): boolean;

  /**
   * Execute a jump (platform game only)
   */
  jump(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): void;
}
