import type { LevelDefinition, LevelState, GridPos, VisualizationMetadata } from "./types";
import { gridPosToKey, gridPosEquals, isInBounds } from "./types";

/**
 * LevelManager manages the runtime state of a level during algorithm execution
 *
 * Responsibilities:
 * - Initialize level state from definition
 * - Track player position and movement
 * - Mark visited cells for visualization
 * - Check win conditions
 * - Provide algorithm visualization metadata
 * - Reset level state
 *
 * Does NOT handle:
 * - Rendering (handled by rendering layer)
 * - Input (handled by controller layer)
 * - Physics (pure grid-based movement)
 */
export class LevelManager {
  private definition: LevelDefinition;
  private state: LevelState;

  constructor(definition: LevelDefinition) {
    this.definition = definition;
    this.state = this.initializeState();
  }

  /**
   * Initialize a fresh level state from definition
   */
  private initializeState(): LevelState {
    const objectStates = new Map<string, string>();

    // Initialize object states from definition
    if (this.definition.objects) {
      for (const obj of this.definition.objects) {
        if (obj.initialState) {
          objectStates.set(obj.id, obj.initialState);
        }
      }
    }

    return {
      playerPosition: { ...this.definition.startPosition },
      visited: new Set([gridPosToKey(this.definition.startPosition)]),
      objectStates,
      stepCount: 0,
      isComplete: false,
      visualization: {
        frontier: new Set(),
        explored: new Set(),
        path: [],
        recursionStack: [],
        cost: new Map(),
        parent: new Map(),
      },
    };
  }

  /**
   * Get the level definition (immutable)
   */
  getDefinition(): LevelDefinition {
    return this.definition;
  }

  /**
   * Get current level state (read-only)
   */
  getState(): Readonly<LevelState> {
    return this.state;
  }

  /**
   * Get player's current position
   */
  getPlayerPosition(): GridPos {
    return { ...this.state.playerPosition };
  }

  /**
   * Get collision status at a specific position
   * @returns true if blocked, false if walkable, null if out of bounds
   */
  getCollisionAt(pos: GridPos): boolean | null {
    if (!isInBounds(pos, this.definition.width, this.definition.height)) {
      return null;
    }
    return this.definition.layers.collision[pos.row][pos.col];
  }

  /**
   * Check if a position is walkable (not blocked by collision layer)
   */
  isWalkable(pos: GridPos): boolean {
    // Out of bounds is not walkable
    if (!isInBounds(pos, this.definition.width, this.definition.height)) {
      return false;
    }

    // Check collision layer: false = walkable, true = blocked
    return !this.definition.layers.collision[pos.row][pos.col];
  }

  /**
   * Check if a position has been visited
   */
  isVisited(pos: GridPos): boolean {
    return this.state.visited.has(gridPosToKey(pos));
  }

  /**
   * Move player to a new position
   * Returns true if move was successful, false if blocked
   */
  movePlayer(newPos: GridPos): boolean {
    // Validate position is in bounds
    if (!isInBounds(newPos, this.definition.width, this.definition.height)) {
      return false;
    }

    // Validate position is walkable
    if (!this.isWalkable(newPos)) {
      return false;
    }

    // Update player position
    this.state.playerPosition = { ...newPos };
    this.state.stepCount++;

    // Mark as visited
    this.markVisited(newPos);

    // Check win condition
    if (this.isGoalReached()) {
      this.state.isComplete = true;
    }

    return true;
  }

  /**
   * Mark a position as visited
   * Used by algorithms for visualization
   */
  markVisited(pos: GridPos): void {
    this.state.visited.add(gridPosToKey(pos));
  }

  /**
   * Check if player has reached the goal
   */
  isGoalReached(): boolean {
    return gridPosEquals(this.state.playerPosition, this.definition.goalPosition);
  }

  /**
   * Check if level is complete
   */
  isComplete(): boolean {
    return this.state.isComplete;
  }

  /**
   * Get step count
   */
  getStepCount(): number {
    return this.state.stepCount;
  }

  /**
   * Reset level to initial state
   */
  reset(): void {
    this.state = this.initializeState();
  }

  /**
   * Update visualization metadata
   * Used by algorithms to show frontier, explored nodes, etc.
   */
  updateVisualization(updates: Partial<VisualizationMetadata>): void {
    this.state.visualization = {
      ...this.state.visualization,
      ...updates,
    };
  }

  /**
   * Get visualization metadata
   */
  getVisualization(): Readonly<VisualizationMetadata> {
    return this.state.visualization;
  }

  /**
   * Get object state by ID
   */
  getObjectState(objectId: string): string | undefined {
    return this.state.objectStates.get(objectId);
  }

  /**
   * Update object state
   * Returns true if object exists and was updated
   */
  setObjectState(objectId: string, newState: string): boolean {
    // Check if object exists in definition
    const objectExists = this.definition.objects?.some((obj) => obj.id === objectId);
    if (!objectExists) {
      return false;
    }

    this.state.objectStates.set(objectId, newState);
    return true;
  }

  /**
   * Get all visited positions as array
   * Useful for rendering/debugging
   */
  getVisitedPositions(): GridPos[] {
    return Array.from(this.state.visited).map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { row, col };
    });
  }

  /**
   * Get neighboring positions (4-directional)
   * Used by pathfinding algorithms
   */
  getNeighbors(pos: GridPos): GridPos[] {
    const neighbors: GridPos[] = [];
    const directions = [
      { row: -1, col: 0 }, // Up
      { row: 1, col: 0 }, // Down
      { row: 0, col: -1 }, // Left
      { row: 0, col: 1 }, // Right
    ];

    for (const dir of directions) {
      const neighbor: GridPos = {
        row: pos.row + dir.row,
        col: pos.col + dir.col,
      };

      if (isInBounds(neighbor, this.definition.width, this.definition.height)) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  /**
   * Get walkable neighbors (excludes walls)
   * Used by pathfinding algorithms
   */
  getWalkableNeighbors(pos: GridPos): GridPos[] {
    return this.getNeighbors(pos).filter((neighbor) => this.isWalkable(neighbor));
  }

  /**
   * Set custom data in state
   * For level-specific or algorithm-specific data
   */
  setCustomData(key: string, value: unknown): void {
    if (!this.state.customData) {
      this.state.customData = {};
    }
    this.state.customData[key] = value;
  }

  /**
   * Get custom data from state
   */
  getCustomData(key: string): unknown {
    return this.state.customData?.[key];
  }

  /**
   * Calculate Manhattan distance between two positions
   * Useful for heuristics in A* and other informed search algorithms
   */
  static manhattanDistance(a: GridPos, b: GridPos): number {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
  }

  /**
   * Get Manhattan distance from position to goal
   */
  getDistanceToGoal(pos: GridPos): number {
    return LevelManager.manhattanDistance(pos, this.definition.goalPosition);
  }
}
