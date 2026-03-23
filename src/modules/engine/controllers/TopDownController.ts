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
  moveForward(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    // Check if blocked by solid tile
    if (this.isSolidTile(nextX, nextY, level, objectStates)) return false;

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

  applyPhysics(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): number {
    void player;
    void level;
    void tileSize;
    void objectStates;
    // Top-down games have no gravity
    // This method intentionally does nothing
    return 0;
  }

  isObstacleAhead(
    player: Player,
    level: LevelDefinition,
    _tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): boolean {
    const { dx, dy } = DIRECTION_DELTA[player.facing];
    const nextX = player.x + dx;
    const nextY = player.y + dy;

    return this.isSolidTile(nextX, nextY, level, objectStates);
  }

  isSolidTile(
    x: number,
    y: number,
    level: LevelDefinition,
    objectStates: ReadonlyMap<string, string>,
  ): boolean {
    // Out of bounds is considered solid
    if (!this.isInBounds(x, y, level)) return true;

    // Check collision layer
    if (level.layers.collision[y][x]) return true;

    // Check for collidable objects at this position
    for (const obj of level.objects || []) {
      if (obj.position.col === x && obj.position.row === y) {
        const behavior = objectRegistry[obj.type];
        const currentState = objectStates.get(obj.id) ?? obj.initialState;
        if (behavior?.isCollidable?.(currentState)) {
          return true;
        }
      }
    }

    return false;
  }

  jump(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): void {
    void player;
    void level;
    void tileSize;
    void objectStates;
    // Top-down games don't support jumping
    // This method intentionally does nothing
  }

  private isInBounds(x: number, y: number, level: LevelDefinition): boolean {
    return x >= 0 && x < level.width && y >= 0 && y < level.height;
  }
}
