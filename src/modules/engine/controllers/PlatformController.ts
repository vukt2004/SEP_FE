import type { IPlayerController } from "./IPlayerController";
import type { Player, Direction } from "../core/types";
import type { TileMap } from "../../map-system/types";
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
  moveForward(player: Player, map: TileMap): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    // Check if blocked by solid tile
    if (this.isSolidTile(nextX, nextY, map)) return false;

    player.x = nextX;
    player.y = nextY;
    player.isMoving = true;

    // Update target pixel position for smooth interpolation
    player.targetPixelX = nextX * map.tileSize;
    player.targetPixelY = nextY * map.tileSize;

    // Update sprite direction based on horizontal facing
    if (player.facing === "left" || player.facing === "right") {
      player.direction = player.facing;
    }

    return true;
  }

  applyPhysics(player: Player, map: TileMap): void {
    // Apply rule-based gravity
    this.applyGravity(player, map);
  }

  isObstacleAhead(player: Player, map: TileMap): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    return this.isSolidTile(nextX, nextY, map);
  }

  isSolidTile(x: number, y: number, map: TileMap): boolean {
    // Out of bounds is considered solid (prevents falling off map)
    if (!this.isInBounds(x, y, map)) return true;

    // Wall tiles are solid
    if (map.tiles[y][x] === 1) return true;

    // Check for collidable objects at this position
    const pixelX = x * map.tileSize;
    const pixelY = y * map.tileSize;
    for (const obj of map.objects) {
      if (obj.x === pixelX && obj.y === pixelY) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.isCollidable?.(obj.state)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Apply rule-based gravity: drop player tile-by-tile until reaching solid ground
   */
  private applyGravity(player: Player, map: TileMap): void {
    // Fall one tile at a time until hitting solid ground
    while (
      this.isInBounds(player.x, player.y + 1, map) &&
      !this.isSolidTile(player.x, player.y + 1, map)
    ) {
      player.y++;
    }

    // Update target pixel position for smooth fall animation
    player.targetPixelX = player.x * map.tileSize;
    player.targetPixelY = player.y * map.tileSize;
  }

  private isInBounds(x: number, y: number, map: TileMap): boolean {
    return x >= 0 && x < map.width && y >= 0 && y < map.height;
  }
}
