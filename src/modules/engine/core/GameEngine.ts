import type { TileMap } from "../../map-system/types";
import type { Player, Direction } from "./types";
import { Renderer } from "../rendering/Renderer";
import { EngineCommand } from "../../executor/commands";
import { objectRegistry } from "../object/objectRegistry";
import type { EngineEvent } from "./engineEvents";
import { AnimationSystem } from "../systems/animation/AnimationSystem";
import { animationRegistry } from "../systems/animation/animationRegistry";
import { loadAnimations } from "../systems/animation/animationLoader";
import { CollisionSystem } from "../systems/collision/CollisionSystem";
import { BoxCollider } from "../physics/BoxCollider";

const TURN_LEFT: Record<Direction, Direction> = {
  up: "left",
  left: "down",
  down: "right",
  right: "up",
};

const TURN_RIGHT: Record<Direction, Direction> = {
  up: "right",
  right: "down",
  down: "left",
  left: "up",
};

const DIRECTION_DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export class GameEngine {
  private map: TileMap;
  private player: Player;
  private renderer: Renderer;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private hasPlayerWon: boolean = false;
  private listeners: {
    [key: string]: ((event: EngineEvent) => void)[];
  } = {};
  private animationSystem: AnimationSystem;
  private collisionSystem: CollisionSystem;
  private lastTimestamp: number = 0;

  constructor(map: TileMap, ctx: CanvasRenderingContext2D) {
    this.map = map;
    this.ctx = ctx;
    this.animationSystem = new AnimationSystem();
    this.collisionSystem = new CollisionSystem();
    this.collisionSystem.setEventEmitter((event) => this.emit(event));
    this.renderer = new Renderer(ctx, this.animationSystem);
    this.player = {
      id: "player",
      x: 1,
      y: 1,
      facing: "right",
      direction: "right",
      isMoving: false,
      animationState: "idle",
    };
  }

  async initialize(): Promise<void> {
    await loadAnimations();
  }

  start(): void {
    this.lastTimestamp = performance.now();
    this.loop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  getPlayer(): Player {
    return this.player;
  }

  getMap(): TileMap {
    return this.map;
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Update player animation state
    this.player.animationState = this.resolvePlayerAnimationState(this.player);

    // Update animations for objects
    for (const obj of this.map.objects) {
      const stateKey = obj.state ?? "default";
      const animMap = animationRegistry[obj.type];
      const anim = animMap?.[stateKey];
      if (anim) {
        this.animationSystem.update(obj.id, stateKey, anim, deltaTime);
      }
    }

    // Update animation for player
    const playerAnimMap = animationRegistry["player"];
    const playerAnim = playerAnimMap?.[this.player.animationState];
    if (playerAnim) {
      this.animationSystem.update(
        this.player.id,
        this.player.animationState,
        playerAnim,
        deltaTime,
      );
    }

    const canvasWidth = this.map.width * this.map.tileSize;
    const canvasHeight = this.map.height * this.map.tileSize;
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    this.renderer.render(this.map, this.player);
  }

  private resolvePlayerAnimationState(player: Player): string {
    if (player.isMoving) {
      return "run";
    }
    return "idle";
  }

  executeCommand(command: EngineCommand): void {
    // Reset isMoving before command
    this.player.isMoving = false;

    switch (command) {
      case EngineCommand.MOVE_FORWARD:
        this.moveForward();
        break;
      case EngineCommand.TURN_LEFT:
        this.turnLeft();
        break;
      case EngineCommand.TURN_RIGHT:
        this.turnRight();
        break;
      case EngineCommand.INTERACT:
        this.interact();
        break;
    }

    // Update collisions after movement
    this.collisionSystem.update();
  }

  isObstacleAhead(): boolean {
    const { dx, dy } = DIRECTION_DELTA[this.player.facing];
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    // Out of bounds or wall tile
    if (!this.isInBounds(nextX, nextY)) return true;
    if (this.map.tiles[nextY][nextX] === 1) return true;

    // Check for collidable objects
    const nextPixelX = nextX * this.map.tileSize;
    const nextPixelY = nextY * this.map.tileSize;
    for (const obj of this.map.objects) {
      if (obj.x === nextPixelX && obj.y === nextPixelY) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.isCollidable?.(obj.state)) {
          return true;
        }
      }
    }

    return false;
  }

  hasWon(): boolean {
    return this.hasPlayerWon;
  }

  on(eventType: EngineEvent["type"], callback: (event: EngineEvent) => void): void {
    if (!this.listeners[eventType]) {
      this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(callback);
  }

  off(eventType: EngineEvent["type"], callback: (event: EngineEvent) => void): void {
    if (!this.listeners[eventType]) return;
    this.listeners[eventType] = this.listeners[eventType].filter((cb) => cb !== callback);
  }

  private emit(event: EngineEvent): void {
    const callbacks = this.listeners[event.type];
    if (callbacks) {
      callbacks.forEach((callback) => callback(event));
    }
  }

  private moveForward(): void {
    const { dx, dy } = DIRECTION_DELTA[this.player.facing];
    const nextX = this.player.x + dx;
    const nextY = this.player.y + dy;

    if (!this.isInBounds(nextX, nextY)) return;
    if (this.map.tiles[nextY][nextX] === 1) return;

    // Check for collidable objects
    const nextPixelX = nextX * this.map.tileSize;
    const nextPixelY = nextY * this.map.tileSize;
    for (const obj of this.map.objects) {
      if (obj.x === nextPixelX && obj.y === nextPixelY) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.isCollidable?.(obj.state)) {
          return; // Blocked by collidable object
        }
      }
    }

    this.player.x = nextX;
    this.player.y = nextY;
    this.player.isMoving = true;

    // Update sprite direction based on horizontal facing
    if (this.player.facing === "left" || this.player.facing === "right") {
      this.player.direction = this.player.facing;
    }

    // Update player collider position if registered
    this.updatePlayerCollider();

    this.checkWinCondition();
  }

  private turnLeft(): void {
    this.player.facing = TURN_LEFT[this.player.facing];
    // Update sprite direction if turning to horizontal
    if (this.player.facing === "left" || this.player.facing === "right") {
      this.player.direction = this.player.facing;
    }
  }

  private turnRight(): void {
    this.player.facing = TURN_RIGHT[this.player.facing];
    // Update sprite direction if turning to horizontal
    if (this.player.facing === "left" || this.player.facing === "right") {
      this.player.direction = this.player.facing;
    }
  }

  interact(): void {
    const { dx, dy } = DIRECTION_DELTA[this.player.facing];
    const targetX = this.player.x + dx;
    const targetY = this.player.y + dy;
    const targetPixelX = targetX * this.map.tileSize;
    const targetPixelY = targetY * this.map.tileSize;

    for (const obj of this.map.objects) {
      if (obj.x === targetPixelX && obj.y === targetPixelY) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.onInteract) {
          obj.state = behavior.onInteract(obj.state);
          this.emit({
            type: "objectStateChanged",
            objectId: obj.id,
            newState: obj.state,
          });
        }
      }
    }
  }

  private checkWinCondition(): void {
    const playerPixelX = this.player.x * this.map.tileSize;
    const playerPixelY = this.player.y * this.map.tileSize;

    for (const obj of this.map.objects) {
      if (playerPixelX === obj.x && playerPixelY === obj.y) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.isWinObject) {
          this.hasPlayerWon = true;
          this.emit({ type: "win" });
        }
      }
    }
  }

  private updatePlayerCollider(): void {
    const collider = this.collisionSystem.getCollider(this.player.id);
    if (collider instanceof BoxCollider) {
      const pixelX = this.player.x * this.map.tileSize;
      const pixelY = this.player.y * this.map.tileSize;
      collider.updatePosition(pixelX, pixelY);
    }
  }

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.map.width && y >= 0 && y < this.map.height;
  }
}
