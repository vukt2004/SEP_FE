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
    // Apply hybrid gravity and return tiles fallen
    return this.applyGravity(player, level, tileSize, objectStates);
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
    // Out of bounds is considered solid (prevents falling off map)
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

  /**
   * Execute a jump if player is grounded
   */
  jump(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): void {
    // Check if player is grounded (can only jump if on solid ground)
    const isGrounded =
      this.isInBounds(player.x, player.y + 1, level) &&
      this.isSolidTile(player.x, player.y + 1, level, objectStates);

    if (!isGrounded) return; // Can't jump if not grounded

    // Move player up by jumpPower tiles
    const jumpHeight = player.jumpPower;
    for (let i = 0; i < jumpHeight; i++) {
      if (
        this.isInBounds(player.x, player.y - 1, level) &&
        !this.isSolidTile(player.x, player.y - 1, level, objectStates)
      ) {
        player.y--;
      } else {
        break; // Stop if hit ceiling
      }
    }

    // Update target pixel position
    player.targetPixelX = player.x * tileSize;
    player.targetPixelY = player.y * tileSize;
    player.isJumping = true;
    player.isFalling = false;
  }

  /**
   * Count the number of empty (non-solid) tiles directly below a position.
   * Scans downward until a solid tile or the map boundary is reached.
   */
  private countEmptyTilesBelow(
    x: number,
    y: number,
    level: LevelDefinition,
    objectStates: ReadonlyMap<string, string>,
  ): number {
    let count = 0;
    let checkY = y + 1;
    while (this.isInBounds(x, checkY, level) && !this.isSolidTile(x, checkY, level, objectStates)) {
      count++;
      checkY++;
    }
    return count;
  }

  /**
   * Apply gravity:
   * Player falls directly to the ground without a fall distance limit.
   * The player is moved down one tile at a time inside a loop so
   * collision with solid tiles is never skipped.
   *
   * @returns the number of tiles the player actually fell this step
   */
  private applyGravity(
    player: Player,
    level: LevelDefinition,
    tileSize: number,
    objectStates: ReadonlyMap<string, string>,
  ): number {
    const fallDistance = this.countEmptyTilesBelow(player.x, player.y, level, objectStates);

    let tilesFallen = 0;

    if (fallDistance > 0) {
      player.isFalling = true;

      // Move down tile-by-tile, checking each one
      for (let i = 0; i < fallDistance; i++) {
        if (
          this.isInBounds(player.x, player.y + 1, level) &&
          !this.isSolidTile(player.x, player.y + 1, level, objectStates)
        ) {
          player.y++;
          tilesFallen++;
        } else {
          break; // Hit solid tile, stop immediately
        }
      }
    }

    // Update target pixel position
    player.targetPixelX = player.x * tileSize;
    player.targetPixelY = player.y * tileSize;

    // Update grounded / falling / jumping flags
    const groundBelow =
      this.isInBounds(player.x, player.y + 1, level) &&
      this.isSolidTile(player.x, player.y + 1, level, objectStates);

    player.isGrounded = groundBelow;

    if (groundBelow) {
      player.isFalling = false;
      player.isJumping = false;
    }

    return tilesFallen;
  }

  private isInBounds(x: number, y: number, level: LevelDefinition): boolean {
    return x >= 0 && x < level.width && y >= 0 && y < level.height;
  }
}
