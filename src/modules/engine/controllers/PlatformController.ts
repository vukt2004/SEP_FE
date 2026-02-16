import type { IPlayerController } from "./IPlayerController";
import type { Player, Direction } from "../core/types";
import type { LevelDefinition } from "../../map-system/types";
import { objectRegistry } from "../object/objectRegistry";

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

/**
 * Platform controller for puzzle-platformer games
 * Includes rule-based gravity (tile-by-tile falling)
 * Player can move left/right, but will fall if no ground below
 */
export class PlatformController implements IPlayerController {
  moveForward(player: Player, level: LevelDefinition, tileSize: number): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    // Check if blocked by solid tile
    if (this.isSolidTile(nextX, nextY, level)) return false;

    player.x = nextX;
    player.y = nextY;
    player.isMoving = true;

    // Update target pixel position for smooth interpolation
    player.targetPixelX = nextX * tileSize;
    player.targetPixelY = nextY * tileSize;

    // Update sprite direction based on horizontal facing
    if (player.facing === "left" || player.facing === "right") {
      player.direction = player.facing;
    }

    return true;
  }

  applyPhysics(player: Player, level: LevelDefinition, tileSize: number): void {
    // Apply rule-based gravity
    this.applyGravity(player, level, tileSize);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isObstacleAhead(player: Player, level: LevelDefinition, _tileSize: number): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    return this.isSolidTile(nextX, nextY, level);
  }

  isSolidTile(x: number, y: number, level: LevelDefinition): boolean {
    // Out of bounds is considered solid (prevents falling off map)
    if (!this.isInBounds(x, y, level)) return true;

    // Wall tiles are solid
    const tileType = level.tiles[y][x];
    if (tileType === "wall") return true;

    // Check for collidable objects at this position
    for (const obj of level.objects || []) {
      if (obj.position.col === x && obj.position.row === y) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.isCollidable?.(obj.initialState)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Apply rule-based gravity: drop player tile-by-tile until reaching solid ground
   */
  private applyGravity(player: Player, level: LevelDefinition, tileSize: number): void {
    // Fall one tile at a time until hitting solid ground
    while (
      this.isInBounds(player.x, player.y + 1, level) &&
      !this.isSolidTile(player.x, player.y + 1, level)
    ) {
      player.y++;
    }

    // Update target pixel position for smooth fall animation
    player.targetPixelX = player.x * tileSize;
    player.targetPixelY = player.y * tileSize;
  }

  private isInBounds(x: number, y: number, level: LevelDefinition): boolean {
    return x >= 0 && x < level.width && y >= 0 && y < level.height;
  }
}
