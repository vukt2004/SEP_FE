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
 * Top-Down controller for grid-based puzzle games
 * No gravity, player can move in all 4 directions
 */
export class TopDownController implements IPlayerController {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyPhysics(_player: Player, _level: LevelDefinition, _tileSize: number): void {
    // Top-down games have no gravity
    // This method intentionally does nothing
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isObstacleAhead(player: Player, level: LevelDefinition, _tileSize: number): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    return this.isSolidTile(nextX, nextY, level);
  }

  isSolidTile(x: number, y: number, level: LevelDefinition): boolean {
    // Out of bounds is considered solid
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

  private isInBounds(x: number, y: number, level: LevelDefinition): boolean {
    return x >= 0 && x < level.width && y >= 0 && y < level.height;
  }
}
