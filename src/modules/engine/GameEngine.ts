import type { TileMap } from "../map-system/types";
import type { Player, Direction } from "./types";
import { Renderer } from "./Renderer";
import { EngineCommand } from "../executor/commands";
import { objectRegistry } from "./objectRegistry";
import type { EngineEvent } from "./engineEvents";
import { AnimationSystem } from "./AnimationSystem";
import { animationRegistry } from "./animationRegistry";
import { loadAnimations } from "./animationLoader";

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
  private lastTimestamp: number = 0;

  constructor(map: TileMap, ctx: CanvasRenderingContext2D) {
    this.map = map;
    this.ctx = ctx;
    this.animationSystem = new AnimationSystem();
    this.renderer = new Renderer(ctx, this.animationSystem);
    this.player = { x: 1, y: 1, direction: "right" };
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

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Update animations
    for (const obj of this.map.objects) {
      const stateKey = obj.state ?? "default";
      const animMap = animationRegistry[obj.type];
      const anim = animMap?.[stateKey];
      if (anim) {
        this.animationSystem.update(obj.id, anim, deltaTime);
      }
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

  executeCommand(command: EngineCommand): void {
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
  }

  isObstacleAhead(): boolean {
    const { dx, dy } = DIRECTION_DELTA[this.player.direction];
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
    const { dx, dy } = DIRECTION_DELTA[this.player.direction];
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
    this.checkWinCondition();
  }

  private turnLeft(): void {
    this.player.direction = TURN_LEFT[this.player.direction];
  }

  private turnRight(): void {
    this.player.direction = TURN_RIGHT[this.player.direction];
  }

  interact(): void {
    const { dx, dy } = DIRECTION_DELTA[this.player.direction];
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

  private isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.map.width && y >= 0 && y < this.map.height;
  }
}
