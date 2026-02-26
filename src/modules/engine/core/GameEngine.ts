import type { LevelDefinition } from "../../map-system/types";
import { isWinConditionMet } from "../../map-system/types";
import type { Player, Direction } from "./types";
import { Renderer } from "../rendering/Renderer";
import type { EngineCommand } from "../../executor/commands";
import { objectRegistry } from "../object/objectRegistry";
import type { EngineEvent } from "./engineEvents";
import { EventEmitter } from "./events/EventEmitter";
import { AnimationSystem } from "../systems/animation/AnimationSystem";
import { animationRegistry } from "../systems/animation/animationRegistry";
import { loadAnimations } from "../systems/animation/animationLoader";
import { CollisionSystem } from "../systems/collision/CollisionSystem";
import { BoxCollider } from "../physics/BoxCollider";
import type { GameConfig } from "./GameConfig";
import type { IPlayerController } from "../controllers/IPlayerController";
import { PlayerControllerFactory } from "../controllers/PlayerControllerFactory";
import { EngineState } from "./engineState";
import type { EngineState as EngineStateType } from "./engineState";
import type { EngineRuntimeState } from "./engineRuntimeState";

// Re-export for convenience
export { EngineState } from "./engineState";
export type { EngineState as EngineStateType } from "./engineState";

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
  private level: LevelDefinition;
  private tileSize: number;
  private runtime: EngineRuntimeState;
  private renderer: Renderer;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private executionEnabled: boolean = false;
  private eventEmitter = new EventEmitter<EngineEvent>();
  private animationSystem: AnimationSystem;
  private collisionSystem: CollisionSystem;
  private lastTimestamp: number = 0;
  private config: GameConfig;
  private controller: IPlayerController;

  constructor(
    level: LevelDefinition,
    tileSize: number,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
  ) {
    this.level = level;
    this.tileSize = tileSize;
    this.ctx = ctx;
    this.config = config;
    this.controller = PlayerControllerFactory.getController(config.levelType);
    this.animationSystem = new AnimationSystem();
    this.collisionSystem = new CollisionSystem();
    this.collisionSystem.setEventEmitter((event) => this.emit(event));
    this.renderer = new Renderer(ctx, this.animationSystem);

    // Initialize runtime state
    const startX = level.startPosition.col;
    const startY = level.startPosition.row;
    const startPixelX = startX * tileSize;
    const startPixelY = startY * tileSize;

    this.runtime = {
      player: {
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
      },
      stepCount: 0,
      hasPlayerWon: false,
      state: EngineState.Idle,
    };
  }

  async initialize(): Promise<void> {
    await loadAnimations();
    await this.renderer.preloadTilesets(this.level);
  }

  /**
   * Start the engine
   * State transitions: Idle → Running, Paused → Running
   */
  start(): void {
    // Don't start if already running
    if (this.runtime.state === EngineState.Running) {
      return;
    }

    // Don't restart if game is won
    if (this.runtime.state === EngineState.Won) {
      return;
    }

    // Transition to Running state
    this.runtime.state = EngineState.Running;
    this.executionEnabled = true;
    this.lastTimestamp = performance.now();
    this.loop();
  }

  /**
   * Pause the engine
   * State transition: Running → Paused
   * Rendering continues but execution is blocked
   */
  pause(): void {
    if (this.runtime.state === EngineState.Running) {
      this.runtime.state = EngineState.Paused;
      this.executionEnabled = false;
    }
  }

  /**
   * Stop the engine completely
   * State transition: * → Stopped
   * Stops rendering loop and sets state to stopped
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.executionEnabled = false;
    this.runtime.state = EngineState.Stopped;
  }

  /**
   * Reset the game to initial state
   * Resets player position, step count, and game state
   */
  reset(): void {
    // Stop the engine first
    this.stop();

    // Reset player to starting position
    const startX = this.level.startPosition.col;
    const startY = this.level.startPosition.row;
    const startPixelX = startX * this.tileSize;
    const startPixelY = startY * this.tileSize;

    this.runtime.player.x = startX;
    this.runtime.player.y = startY;
    this.runtime.player.pixelX = startPixelX;
    this.runtime.player.pixelY = startPixelY;
    this.runtime.player.targetPixelX = startPixelX;
    this.runtime.player.targetPixelY = startPixelY;
    this.runtime.player.facing = "right";
    this.runtime.player.direction = "right";
    this.runtime.player.isMoving = false;
    this.runtime.player.animationState = "idle";

    // Reset game state
    this.runtime.stepCount = 0;
    this.runtime.hasPlayerWon = false;
    this.runtime.state = EngineState.Idle;

    // Update player collider
    this.updatePlayerCollider();

    // Re-render the scene
    this.renderer.render(this.level, this.tileSize, this.runtime.player);
  }

  /**
   * Mark the engine as failed
   * State transition: Running → Failed
   * Only works if engine is currently running
   */

  private fail(): void {
    if (this.runtime.state === EngineState.Running) {
      this.runtime.state = EngineState.Failed;
      this.emit({ type: "engine:failed" });
    }
  }

  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  getPlayer(): Player {
    return this.runtime.player;
  }

  getLevel(): LevelDefinition {
    return this.level;
  }

  getTileSize(): number {
    return this.tileSize;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  /**
   * Get current engine state
   */
  getState(): EngineStateType {
    return this.runtime.state;
  }

  /**
   * Get total number of commands executed
   */
  getStepCount(): number {
    return this.runtime.stepCount;
  }

  /**
   * Get a snapshot of the current runtime state
   * Useful for save/load, replay, or debugging
   */
  getSnapshot(): EngineRuntimeState {
    return structuredClone(this.runtime);
  }

  /**
   * Main render loop
   * Continues to run for visual updates even when paused
   * Only processes game logic when state is Running
   */
  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    // Always update visuals and animations for smooth rendering
    // Update player visual position (smooth interpolation)
    this.updatePlayerVisual(deltaTime);

    // Update player animation state
    this.runtime.player.animationState = this.resolvePlayerAnimationState(this.runtime.player);

    // Update animations for objects
    for (const obj of this.level.objects || []) {
      const stateKey = obj.initialState ?? "default";
      const animMap = animationRegistry[obj.type];
      const anim = animMap?.[stateKey];
      if (anim) {
        this.animationSystem.update(obj.id, stateKey, anim, deltaTime);
      }
    }

    // Update animation for player
    const playerAnimMap = animationRegistry["player"];
    const playerAnim = playerAnimMap?.[this.runtime.player.animationState];
    if (playerAnim) {
      this.animationSystem.update(
        this.runtime.player.id,
        this.runtime.player.animationState,
        playerAnim,
        deltaTime,
      );
    }

    // Render current frame
    const canvasWidth = this.level.width * this.tileSize;
    const canvasHeight = this.level.height * this.tileSize;
    this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    this.render();

    // Continue animation loop
    this.animationId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    this.renderer.render(this.level, this.tileSize, this.runtime.player);
  }

  private resolvePlayerAnimationState(player: Player): string {
    if (player.isMoving) {
      return "run";
    }
    return "idle";
  }

  /**
   * Execute a single command
   * Only executes if execution is enabled
   * Increments step count for each execution
   */
  executeCommand(command: EngineCommand): void {
    // Only execute commands when execution is enabled
    if (!this.executionEnabled) {
      return;
    }

    // Increment step counter
    this.runtime.stepCount++;

    // Reset isMoving before command
    this.runtime.player.isMoving = false;

    switch (command.type) {
      case "move":
        // Handle absolute directional movement
        this.moveInDirection(command.direction);
        // Apply physics (gravity) based on controller type
        this.controller.applyPhysics(this.runtime.player, this.level, this.tileSize);
        // Update player collider after physics
        this.updatePlayerCollider();
        break;
      case "interact":
        this.interact();
        break;
    }

    // Update collisions after movement and physics
    this.collisionSystem.update();
  }

  /**
   * Move player in specified absolute direction
   */
  private moveInDirection(direction: Direction): void {
    // Update player facing direction for movement
    this.runtime.player.facing = direction;

    // Update sprite direction for rendering (left/right flip)
    if (direction === "left" || direction === "right") {
      this.runtime.player.direction = direction;
    }

    // Execute movement in that direction
    this.moveForward();
  }

  isObstacleAhead(): boolean {
    return this.controller.isObstacleAhead(this.runtime.player, this.level, this.tileSize);
  }

  hasWon(): boolean {
    return this.runtime.hasPlayerWon;
  }

  /**
   * Register an event listener for a specific event type
   * Callback is automatically narrowed to the specific event shape
   * Delegates to internal EventEmitter
   */
  on<K extends EngineEvent["type"]>(
    eventType: K,
    callback: (event: Extract<EngineEvent, { type: K }>) => void,
  ): void {
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Register a one-time event listener
   * Automatically removed after first invocation
   * Delegates to internal EventEmitter
   */
  once<K extends EngineEvent["type"]>(
    eventType: K,
    callback: (event: Extract<EngineEvent, { type: K }>) => void,
  ): void {
    this.eventEmitter.once(eventType, callback);
  }

  /**
   * Remove an event listener for a specific event type
   * Delegates to internal EventEmitter
   */
  off<K extends EngineEvent["type"]>(
    eventType: K,
    callback: (event: Extract<EngineEvent, { type: K }>) => void,
  ): void {
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * Emit an engine event
   * Centralizes all event dispatching for better control and future extensibility
   */
  private emit(event: EngineEvent): void {
    this.eventEmitter.emit(event);
  }

  private moveForward(): void {
    // Delegate movement to controller
    const moved = this.controller.moveForward(this.runtime.player, this.level, this.tileSize);

    if (moved) {
      // Update player collider position if registered
      this.updatePlayerCollider();
      this.checkWinCondition();
    }
  }

  private turnLeft(): void {
    this.runtime.player.facing = TURN_LEFT[this.runtime.player.facing];
    // Update sprite direction if turning to horizontal
    if (this.runtime.player.facing === "left" || this.runtime.player.facing === "right") {
      this.runtime.player.direction = this.runtime.player.facing;
    }
  }

  private turnRight(): void {
    this.runtime.player.facing = TURN_RIGHT[this.runtime.player.facing];
    // Update sprite direction if turning to horizontal
    if (this.runtime.player.facing === "left" || this.runtime.player.facing === "right") {
      this.runtime.player.direction = this.runtime.player.facing;
    }
  }

  private interact(): void {
    const { dx, dy } = DIRECTION_DELTA[this.runtime.player.facing];
    const targetX = this.runtime.player.x + dx;
    const targetY = this.runtime.player.y + dy;
    const targetPixelX = targetX * this.tileSize;
    const targetPixelY = targetY * this.tileSize;

    for (const obj of this.level.objects || []) {
      const objPixelX = obj.position.col * this.tileSize;
      const objPixelY = obj.position.row * this.tileSize;
      if (objPixelX === targetPixelX && objPixelY === targetPixelY) {
        const behavior = objectRegistry[obj.type];
        if (behavior?.onInteract) {
          const newState = behavior.onInteract(obj.initialState);
          this.emit({
            type: "objectStateChanged",
            objectId: obj.id,
            newState: newState,
          });
        }
      }
    }
  }

  /**
   * Check if player has reached a win condition
   * State transition: Running → Won
   */
  private checkWinCondition(): void {
    // Check if player reached goal position using level domain logic
    const playerPos = { row: this.runtime.player.y, col: this.runtime.player.x };
    if (isWinConditionMet(this.level, playerPos)) {
      this.runtime.hasPlayerWon = true;
      this.runtime.state = EngineState.Won;
      this.emit({ type: "win" });
    }
  }

  private updatePlayerCollider(): void {
    const collider = this.collisionSystem.getCollider(this.runtime.player.id);
    if (collider instanceof BoxCollider) {
      const pixelX = this.runtime.player.x * this.tileSize;
      const pixelY = this.runtime.player.y * this.tileSize;
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
    const deltaX = this.runtime.player.targetPixelX - this.runtime.player.pixelX;
    if (Math.abs(deltaX) > 0.1) {
      const step = Math.min(Math.abs(deltaX), maxDistance) * Math.sign(deltaX);
      this.runtime.player.pixelX += step;
    } else {
      this.runtime.player.pixelX = this.runtime.player.targetPixelX;
    }

    // Interpolate Y
    const deltaY = this.runtime.player.targetPixelY - this.runtime.player.pixelY;
    if (Math.abs(deltaY) > 0.1) {
      const step = Math.min(Math.abs(deltaY), maxDistance) * Math.sign(deltaY);
      this.runtime.player.pixelY += step;
    } else {
      this.runtime.player.pixelY = this.runtime.player.targetPixelY;
    }
  }
}
