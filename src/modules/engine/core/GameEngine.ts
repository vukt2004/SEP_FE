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
import type { GameConfig } from "./GameConfig";
import type { IPlayerController } from "../controllers/IPlayerController";
import { PlayerControllerFactory } from "../controllers/PlayerControllerFactory";

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
  private config: GameConfig;
  private controller: IPlayerController;

  constructor(map: TileMap, ctx: CanvasRenderingContext2D, config: GameConfig) {
    this.map = map;
    this.ctx = ctx;
    this.config = config;
    this.controller = PlayerControllerFactory.getController(config.levelType);
    this.animationSystem = new AnimationSystem();
    this.collisionSystem = new CollisionSystem();
    this.collisionSystem.setEventEmitter((event) => this.emit(event));
    this.renderer = new Renderer(ctx, this.animationSystem);
    const startX = 1;
    const startY = 1;
    const startPixelX = startX * map.tileSize;
    const startPixelY = startY * map.tileSize;
    this.player = {
      id: "player",
      x: startX,
      y: startY,
      pixelX: startPixelX,
      pixelY: startPixelY,
      targetPixelX: startPixelX,
      targetPixelY: startPixelY,
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

  getConfig(): GameConfig {
    return this.config;
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Update player visual position (smooth interpolation)
    this.updatePlayerVisual(deltaTime);

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
        // Apply physics (gravity) based on controller type
        this.controller.applyPhysics(this.player, this.map);
        // Update player collider after physics
        this.updatePlayerCollider();
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

    // Update collisions after movement and physics
    this.collisionSystem.update();
  }

  isObstacleAhead(): boolean {
    return this.controller.isObstacleAhead(this.player, this.map);
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
    // Delegate movement to controller
    const moved = this.controller.moveForward(this.player, this.map);

    if (moved) {
      // Update player collider position if registered
      this.updatePlayerCollider();
      this.checkWinCondition();
    }
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

  private interact(): void {
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

  /**
   * Smoothly interpolate pixel position toward target position
   * This provides visual animation while keeping logic grid-based
   */
  private updatePlayerVisual(deltaTime: number): void {
    const speed = 0.1; // Pixels per millisecond (adjust for faster/slower animation)
    const maxDistance = speed * deltaTime;

    // Interpolate X
    const deltaX = this.player.targetPixelX - this.player.pixelX;
    if (Math.abs(deltaX) > 0.1) {
      const step = Math.min(Math.abs(deltaX), maxDistance) * Math.sign(deltaX);
      this.player.pixelX += step;
    } else {
      this.player.pixelX = this.player.targetPixelX;
    }

    // Interpolate Y
    const deltaY = this.player.targetPixelY - this.player.pixelY;
    if (Math.abs(deltaY) > 0.1) {
      const step = Math.min(Math.abs(deltaY), maxDistance) * Math.sign(deltaY);
      this.player.pixelY += step;
    } else {
      this.player.pixelY = this.player.targetPixelY;
    }
  }
}
