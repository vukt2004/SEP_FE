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
 * Top-Down controller for grid-based puzzle games
 * No gravity, player can move in all 4 directions
 */
export class TopDownController implements IPlayerController {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyPhysics(_player: Player, _map: TileMap): void {
    // Top-down games have no gravity
    // This method intentionally does nothing
  }

  isObstacleAhead(player: Player, map: TileMap): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    return this.isSolidTile(nextX, nextY, map);
  }

  isSolidTile(x: number, y: number, map: TileMap): boolean {
    // Out of bounds is considered solid
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

  private isInBounds(x: number, y: number, map: TileMap): boolean {
    return x >= 0 && x < map.width && y >= 0 && y < map.height;
  }
}
