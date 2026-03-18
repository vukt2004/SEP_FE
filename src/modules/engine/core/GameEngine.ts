import type { LevelDefinition } from "../../map-system/types";
import { isWinConditionMet } from "../../map-system/types";
import type { Player, Direction } from "./types";
import { Renderer } from "../rendering/Renderer";
import type { EngineCommand } from "../../executor/commands";
import type { EngineEvent } from "./engineEvents";
import { EventEmitter } from "./events/EventEmitter";
import { AnimationSystem } from "../systems/animation/AnimationSystem";
import { animationRegistry } from "../systems/animation/animationRegistry";
import { initializeAnimationSystem, loadAnimations } from "../systems/animation/animationLoader";
import { CollisionSystem } from "../systems/collision/CollisionSystem";
import { BoxCollider } from "../physics/BoxCollider";
import type { GameConfig } from "./GameConfig";
import type { IPlayerController } from "../controllers/IPlayerController";
import { PlayerControllerFactory } from "../controllers/PlayerControllerFactory";
import { EngineState } from "./engineState";
import type { EngineState as EngineStateType } from "./engineState";
import type { EngineRuntimeState } from "./engineRuntimeState";
import type { GameType } from "../../../shared/types/GameType";
import { AudioSystem } from "../systems/audio/AudioSystem";
import { SoundEffect } from "../systems/audio/types";

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
  private audioSystem: AudioSystem;
  private lastTimestamp: number = 0;
  private config: GameConfig;
  private controller: IPlayerController;
  private gameType: GameType;
  private goalRequirementNotified: boolean = false;

  /**
   * @param level - Level definition
   * @param tileSize - Size of each tile in pixels
   * @param ctx - Canvas rendering context
   * @param config - Game configuration
   * @param gameType - Game type for asset loading (topdown or platformer)
   */
  constructor(
    level: LevelDefinition,
    tileSize: number,
    ctx: CanvasRenderingContext2D,
    config: GameConfig,
    gameType: GameType,
  ) {
    this.level = level;
    this.tileSize = tileSize;
    this.ctx = ctx;
    this.config = config;
    this.gameType = gameType;
    this.controller = PlayerControllerFactory.getController(config.levelType);
    this.animationSystem = new AnimationSystem();
    this.collisionSystem = new CollisionSystem();
    this.audioSystem = new AudioSystem();
    this.collisionSystem.setEventEmitter((event) => this.emit(event));
    this.renderer = new Renderer(ctx, this.animationSystem, gameType);

    // Initialize runtime state
    const startX = level.startPosition.col;
    const startY = level.startPosition.row;
    const startPixelX = startX * tileSize;
    const startPixelY = startY * tileSize;

    const objectStates = new Map<string, string>();
    if (level.objects) {
      for (const obj of level.objects) {
        const initialState = this.getInitialObjectState(obj);
        if (initialState) {
          objectStates.set(obj.id, initialState);
        }
      }
    }

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
        isJumping: false,
        jumpPower: 2,
        isGrounded: true,
      },
      objectStates,
      stepCount: 0,
      hasPlayerWon: false,
      state: EngineState.Idle,
      collectedFruits: new Set<string>(),
      timeElapsed: 0,
      startTime: null,
    };
  }

  async initialize(): Promise<void> {
    // Initialize animation system with game type
    initializeAnimationSystem(this.gameType);
    await loadAnimations();
    await this.renderer.preloadTilesets(this.level);

    // Initialize audio system
    await this.audioSystem.initialize();

    // Setup audio event listeners
    this.setupAudioListeners();
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

    // Start timer if not already started
    if (this.runtime.startTime === null) {
      this.runtime.startTime = performance.now();
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
    // Stop all playing audio
    this.audioSystem.stopAll();
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
    this.runtime.player.facing = this.gameType === "topdown" ? "down" : "right";
    this.runtime.player.direction = (this.gameType === "topdown" ? "down" : "right") as
      | "left"
      | "right";
    this.runtime.player.isMoving = false;
    this.runtime.player.isJumping = false;
    this.runtime.player.isGrounded = true;
    this.runtime.player.isMoving = false;
    this.runtime.player.animationState = this.resolvePlayerAnimationState(this.runtime.player);

    // Reset game state
    this.runtime.stepCount = 0;
    this.runtime.hasPlayerWon = false;
    this.runtime.state = EngineState.Idle;
    this.runtime.collectedFruits.clear();
    this.runtime.startTime = null;
    this.runtime.timeElapsed = 0;
    this.goalRequirementNotified = false;

    // Reset object states to their initial values
    this.runtime.objectStates.clear();
    if (this.level.objects) {
      for (const obj of this.level.objects) {
        const initialState = this.getInitialObjectState(obj);
        if (initialState) {
          this.runtime.objectStates.set(obj.id, initialState);
        }
      }
    }

    // Update player collider
    this.updatePlayerCollider();

    // Re-render the scene
    this.renderer.render(
      this.level,
      this.tileSize,
      this.runtime.player,
      this.runtime.collectedFruits,
      this.runtime.objectStates,
    );
  }

  /**
   * Mark the engine as failed
   * State transition: Running → Failed
   * Only works if engine is currently running
   */

  private fail(): void {
    if (this.runtime.state === EngineState.Running) {
      // Stop timer and save elapsed time
      if (this.runtime.startTime !== null) {
        this.runtime.timeElapsed = performance.now() - this.runtime.startTime;
      }
      this.runtime.state = EngineState.Failed;
      this.emit({ type: "engine:failed" });
    }
  }

  getCollisionSystem(): CollisionSystem {
    return this.collisionSystem;
  }

  getAudioSystem(): AudioSystem {
    return this.audioSystem;
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
   * Get block constraints from the loaded level.
   */
  getBlockConstraints(): LevelDefinition["blockConstraints"] {
    return this.level.blockConstraints;
  }

  /**
   * Validate block usage against level constraints.
   */
  validateBlockUsage(blockUsage: Record<string, number>): { isValid: boolean; message?: string } {
    const constraints = this.level.blockConstraints;
    if (!constraints) {
      return { isValid: true };
    }

    const blockLimit = constraints.blockLimit;
    if (typeof blockLimit === "number" && Number.isFinite(blockLimit) && blockLimit > 0) {
      const totalUsed = Object.values(blockUsage).reduce((sum, count) => sum + (count || 0), 0);
      if (totalUsed > blockLimit) {
        return {
          isValid: false,
          message: `Block limit exceeded (${totalUsed}/${blockLimit}).`,
        };
      }
    }

    for (const bannedType of constraints.bannedBlocks || []) {
      const used = blockUsage[bannedType] ?? 0;
      if (used > 0) {
        return {
          isValid: false,
          message: `Forbidden block used: ${bannedType}.`,
        };
      }
    }

    for (const rule of constraints.requiredBlocks || []) {
      const used = blockUsage[rule.type] ?? 0;
      if (used < rule.minCount) {
        return {
          isValid: false,
          message: `Required block missing: ${rule.type} (${used}/${rule.minCount}).`,
        };
      }
    }

    return { isValid: true };
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
   * Get number of collected fruits
   */
  getCollectedFruitsCount(): number {
    return this.runtime.collectedFruits.size;
  }

  /**
   * Get elapsed time in seconds
   */
  getElapsedTime(): number {
    if (this.runtime.startTime === null) {
      return 0;
    }

    // If game is still running, calculate current elapsed time
    if (this.runtime.state === EngineState.Running) {
      return (performance.now() - this.runtime.startTime) / 1000;
    }

    // Otherwise return stored elapsed time
    return this.runtime.timeElapsed / 1000;
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
      const stateKey = this.runtime.objectStates.get(obj.id) ?? obj.initialState ?? "default";
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

    // Update animation for goal
    const goalAnimMap = animationRegistry["goal"];
    const goalAnim = goalAnimMap?.["idle"] || goalAnimMap?.["default"];
    const goalState = goalAnimMap?.["idle"] ? "idle" : "default";
    if (goalAnim) {
      this.animationSystem.update("goal", goalState, goalAnim, deltaTime);
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
    this.renderer.render(
      this.level,
      this.tileSize,
      this.runtime.player,
      this.runtime.collectedFruits,
      this.runtime.objectStates,
    );
  }

  private resolvePlayerAnimationState(player: Player): string {
    const baseState = player.isMoving ? "run" : "idle";

    // For topdown games, use directional animations
    if (this.gameType === "topdown") {
      const direction = player.direction || "down";
      return `${baseState}-${direction}`;
    }

    // For platformer games, use simple run/idle
    return baseState;
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
        this.controller.applyPhysics(
          this.runtime.player,
          this.level,
          this.tileSize,
          this.runtime.objectStates,
        );
        // Update player collider after physics
        this.updatePlayerCollider();
        this.checkFruitCollection();
        this.checkWinCondition();
        break;
      case "moveForward":
        // Move in the current facing direction
        this.moveInDirection(this.runtime.player.facing);
        // Apply physics (gravity) based on controller type
        this.controller.applyPhysics(
          this.runtime.player,
          this.level,
          this.tileSize,
          this.runtime.objectStates,
        );
        // Update player collider after physics
        this.updatePlayerCollider();
        this.checkFruitCollection();
        this.checkWinCondition();
        break;
      case "turn": {
        const newDirection = this.resolveTurnDirection(
          this.runtime.player.facing,
          command.rotation,
        );
        this.runtime.player.facing = newDirection;
        // Update sprite direction for rendering
        if (this.gameType === "topdown") {
          // Topdown: use all four directions
          this.runtime.player.direction = newDirection as "left" | "right";
        } else {
          // Platformer: only update for left/right (for sprite flipping)
          if (newDirection === "left" || newDirection === "right") {
            this.runtime.player.direction = newDirection;
          }
        }
        break;
      }
      case "jump":
        // Execute jump — moves player up by jumpPower tiles (if grounded)
        this.controller.jump(
          this.runtime.player,
          this.level,
          this.tileSize,
          this.runtime.objectStates,
        );
        // Play jump sound
        this.audioSystem.play(SoundEffect.Jump);
        // Update player collider after jump
        this.updatePlayerCollider();
        this.checkFruitCollection();
        this.checkWinCondition();
        // NOTE: gravity is NOT applied here — it will be applied on the next
        // command step (move/moveForward) so the jump arc is visible across steps.
        break;
      case "wait":
        // Consume one turn without movement while still advancing physics.
        this.controller.applyPhysics(
          this.runtime.player,
          this.level,
          this.tileSize,
          this.runtime.objectStates,
        );
        this.updatePlayerCollider();
        this.checkFruitCollection();
        this.checkWinCondition();
        break;
      case "break":
        this.breakObject(command.power);
        break;
      case "openDoor":
        this.openDoor();
        break;
      case "closeDoor":
        this.closeDoor();
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

    // Update sprite direction for rendering
    if (this.gameType === "topdown") {
      // Topdown: use all four directions
      this.runtime.player.direction = direction as "left" | "right";
    } else {
      // Platformer: only update for left/right (for sprite flipping)
      if (direction === "left" || direction === "right") {
        this.runtime.player.direction = direction;
      }
    }

    // Execute movement in that direction
    this.moveForward();
  }

  /**
   * Resolve turn behavior by game type.
   * - Top-down: rotate facing by 90 degrees.
   * - Platform: map turn blocks to absolute horizontal facing.
   */
  private resolveTurnDirection(
    currentFacing: Direction,
    rotation: "clockwise" | "counterclockwise",
  ): Direction {
    if (this.gameType === "platformer") {
      return rotation === "clockwise" ? "right" : "left";
    }

    return this.rotateFacing(currentFacing, rotation);
  }

  /**
   * Rotate facing direction by 90 degrees
   * @param currentFacing Current facing direction
   * @param rotation Clockwise or counterclockwise rotation
   * @returns New facing direction after rotation
   */
  private rotateFacing(
    currentFacing: Direction,
    rotation: "clockwise" | "counterclockwise",
  ): Direction {
    if (rotation === "clockwise") {
      // Clockwise: up → right → down → left → up
      const clockwiseMap: Record<Direction, Direction> = {
        up: "right",
        right: "down",
        down: "left",
        left: "up",
      };
      return clockwiseMap[currentFacing];
    } else {
      // Counter-clockwise: up → left → down → right → up
      const counterclockwiseMap: Record<Direction, Direction> = {
        up: "left",
        left: "down",
        down: "right",
        right: "up",
      };
      return counterclockwiseMap[currentFacing];
    }
  }

  private isObstacleRelative(rotation: "clockwise" | "counterclockwise"): boolean {
    const lookDirection = this.rotateFacing(this.runtime.player.facing, rotation);
    const virtualPlayer = {
      ...this.runtime.player,
      facing: lookDirection,
    };

    return this.controller.isObstacleAhead(
      virtualPlayer,
      this.level,
      this.tileSize,
      this.runtime.objectStates,
    );
  }

  isObstacleAhead(): boolean {
    return this.controller.isObstacleAhead(
      this.runtime.player,
      this.level,
      this.tileSize,
      this.runtime.objectStates,
    );
  }

  isObstacleLeft(): boolean {
    return this.isObstacleRelative("counterclockwise");
  }

  isObstacleRight(): boolean {
    return this.isObstacleRelative("clockwise");
  }

  isEnemyAhead(): boolean {
    const { dx, dy } = DIRECTION_DELTA[this.runtime.player.facing];
    return this.hasObjectAt(this.runtime.player.x + dx, this.runtime.player.y + dy, ["enemy"]);
  }

  isTrapAhead(): boolean {
    const { dx, dy } = DIRECTION_DELTA[this.runtime.player.facing];
    return this.hasObjectAt(this.runtime.player.x + dx, this.runtime.player.y + dy, ["trap"]);
  }

  hasCollectedFruit(): boolean {
    return this.runtime.collectedFruits.size > 0;
  }

  private hasObjectAt(x: number, y: number, objectTypes: string[]): boolean {
    const typeSet = new Set(objectTypes);
    for (const obj of this.level.objects || []) {
      if (obj.position.col !== x || obj.position.row !== y) {
        continue;
      }

      if (!typeSet.has(obj.type)) {
        continue;
      }

      // Collected fruits are no longer present as sensors.
      if (obj.type === "fruit" && this.runtime.collectedFruits.has(obj.id)) {
        continue;
      }

      return true;
    }

    return false;
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

  /**
   * Setup audio event listeners
   * Connects game events to appropriate sound effects
   */
  private setupAudioListeners(): void {
    // Play collect sound when fruit is collected
    this.on("fruitCollected", () => {
      this.audioSystem.play(SoundEffect.Collect);
    });

    // Play win sound when game is won
    this.on("win", () => {
      // You can add a win sound effect here if you have one
      // For now, we'll use the Text sound as a placeholder
      this.audioSystem.play(SoundEffect.Text);
    });
  }

  private moveForward(): void {
    // Delegate movement to controller
    const moved = this.controller.moveForward(
      this.runtime.player,
      this.level,
      this.tileSize,
      this.runtime.objectStates,
    );

    if (moved) {
      // Play walk sound when player moves
      this.audioSystem.play(SoundEffect.Walk);
      // Update player collider position if registered
      this.updatePlayerCollider();
      this.checkFruitCollection();
      this.checkWinCondition();
    }
  }

  private turnLeft(): void {
    this.runtime.player.facing = TURN_LEFT[this.runtime.player.facing];
    // Update sprite direction
    if (this.gameType === "topdown") {
      this.runtime.player.direction = this.runtime.player.facing as "left" | "right";
    } else if (this.runtime.player.facing === "left" || this.runtime.player.facing === "right") {
      this.runtime.player.direction = this.runtime.player.facing;
    }
  }

  private turnRight(): void {
    this.runtime.player.facing = TURN_RIGHT[this.runtime.player.facing];
    // Update sprite direction
    if (this.gameType === "topdown") {
      this.runtime.player.direction = this.runtime.player.facing as "left" | "right";
    } else if (this.runtime.player.facing === "left" || this.runtime.player.facing === "right") {
      this.runtime.player.direction = this.runtime.player.facing;
    }
  }

  private getInitialObjectState(obj: {
    type: string;
    initialState?: string;
    metadata?: Record<string, unknown>;
  }): string | undefined {
    if (obj.initialState) {
      return obj.initialState;
    }

    if (obj.type === "door") {
      const isOpen = typeof obj.metadata?.isOpen === "boolean" ? obj.metadata.isOpen : false;
      return isOpen ? "open" : "closed";
    }

    return undefined;
  }

  private getObjectInFront():
    | {
        id: string;
        type: string;
        initialState?: string;
        metadata?: Record<string, unknown>;
      }
    | undefined {
    const { dx, dy } = DIRECTION_DELTA[this.runtime.player.facing];
    const targetX = this.runtime.player.x + dx;
    const targetY = this.runtime.player.y + dy;

    for (const obj of this.level.objects || []) {
      if (obj.position.col === targetX && obj.position.row === targetY) {
        return obj;
      }
    }

    return undefined;
  }

  private isBoxType(type: string): boolean {
    return type === "box" || type === "box1" || type === "box2" || type === "box3";
  }

  private getBoxHardness(obj: { type: string; metadata?: Record<string, unknown> }): number {
    const metadataHardness =
      typeof obj.metadata?.hardness === "number" && Number.isFinite(obj.metadata.hardness)
        ? obj.metadata.hardness
        : undefined;

    if (metadataHardness !== undefined) {
      return Math.max(1, Math.floor(metadataHardness));
    }

    switch (obj.type) {
      case "box1":
        return 1;
      case "box2":
        return 2;
      case "box3":
        return 3;
      default:
        return 1;
    }
  }

  private breakObject(power: number): void {
    const target = this.getObjectInFront();

    if (!target) {
      this.emit({ type: "interactionFeedback", message: "Nothing to break in front." });
      return;
    }

    if (!this.isBoxType(target.type)) {
      this.emit({ type: "interactionFeedback", message: "Target is not breakable." });
      return;
    }

    const currentState =
      this.runtime.objectStates.get(target.id) ?? this.getInitialObjectState(target);
    if (currentState === "break") {
      this.emit({ type: "interactionFeedback", message: "Box is already broken." });
      return;
    }

    const hardness = this.getBoxHardness(target);
    if (power >= hardness) {
      this.runtime.objectStates.set(target.id, "break");
      this.emit({ type: "objectStateChanged", objectId: target.id, newState: "break" });
      return;
    }

    this.emit({
      type: "interactionFeedback",
      message: `Power too low (${Math.floor(power)}/${hardness}).`,
    });
  }

  private openDoor(): void {
    const target = this.getObjectInFront();

    if (!target || target.type !== "door") {
      this.emit({ type: "interactionFeedback", message: "No door in front to open." });
      return;
    }

    const currentState =
      this.runtime.objectStates.get(target.id) ?? this.getInitialObjectState(target);
    if (currentState === "open") {
      return;
    }

    this.runtime.objectStates.set(target.id, "open");
    this.emit({ type: "objectStateChanged", objectId: target.id, newState: "open" });
  }

  private closeDoor(): void {
    const target = this.getObjectInFront();

    if (!target || target.type !== "door") {
      this.emit({ type: "interactionFeedback", message: "No door in front to close." });
      return;
    }

    const currentState =
      this.runtime.objectStates.get(target.id) ?? this.getInitialObjectState(target);
    if (currentState === "closed") {
      return;
    }

    this.runtime.objectStates.set(target.id, "closed");
    this.emit({ type: "objectStateChanged", objectId: target.id, newState: "closed" });
  }

  /**
   * Check if player has reached a win condition
   * State transition: Running → Won
   */
  private checkWinCondition(): void {
    if (this.runtime.state === EngineState.Won || this.runtime.hasPlayerWon) {
      return;
    }

    // Check if player reached goal position using level domain logic
    const playerPos = { row: this.runtime.player.y, col: this.runtime.player.x };
    const atGoal = isWinConditionMet(this.level, playerPos);

    if (!atGoal) {
      this.goalRequirementNotified = false;
      return;
    }

    // WinCondition = 2 requires collecting all fruits before goal can complete the level.
    if (this.config.winCondition === 2) {
      const mapFruitsCount = this.getTotalFruitsCount();
      const requiredFruits =
        this.config.requiredFruits !== undefined && this.config.requiredFruits > 0
          ? Math.min(this.config.requiredFruits, mapFruitsCount)
          : mapFruitsCount;
      const collectedFruits = this.runtime.collectedFruits.size;

      if (collectedFruits < requiredFruits) {
        if (!this.goalRequirementNotified) {
          this.goalRequirementNotified = true;
          this.emit({
            type: "winConditionNotMet",
            message: `Collect fruits and reach goal (${collectedFruits}/${requiredFruits}).`,
            collectedFruits,
            requiredFruits,
          });
        }
        return;
      }
    }

    // Stop timer and save elapsed time
    if (this.runtime.startTime !== null) {
      this.runtime.timeElapsed = performance.now() - this.runtime.startTime;
    }
    this.runtime.hasPlayerWon = true;
    this.runtime.state = EngineState.Won;
    this.emit({ type: "win" });
  }

  private getTotalFruitsCount(): number {
    return (this.level.objects || []).filter((obj) => obj.type === "fruit").length;
  }

  /**
   * Check if player has collected any fruits at current position
   * Automatically collects fruits when player reaches their grid coordinate
   */
  private checkFruitCollection(): void {
    const playerX = this.runtime.player.x;
    const playerY = this.runtime.player.y;

    // Check all fruits in the level
    for (const obj of this.level.objects || []) {
      // Only check fruit objects
      if (obj.type !== "fruit") continue;

      // Skip already collected fruits
      if (this.runtime.collectedFruits.has(obj.id)) continue;

      // Check if player is at the fruit's position
      if (obj.position.col === playerX && obj.position.row === playerY) {
        // Collect the fruit
        this.runtime.collectedFruits.add(obj.id);

        // Emit collection event
        this.emit({
          type: "fruitCollected",
          fruitId: obj.id,
          totalCollected: this.runtime.collectedFruits.size,
        });
      }
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
    const speed = 0.5; // Pixels per millisecond (adjust for faster/slower animation)
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
