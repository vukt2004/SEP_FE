// ============================================================================
// GRID-BASED ARCHITECTURE
// ============================================================================

/**
 * Grid position using row/column coordinates
 * Origin (0, 0) is top-left
 */
export interface GridPos {
  row: number;
  col: number;
}

/**
 * Tile types for the grid
 * - empty: Walkable tile
 * - wall: Blocked tile
 * - start: Starting position marker
 * - goal: Goal position marker
 */
export type TileType = "empty" | "wall" | "start" | "goal";

/**
 * Grid object definition (immutable)
 * Used for interactive objects like doors, switches, collectibles
 * Position is grid-based, NOT pixel-based
 */
export interface GridObjectDefinition {
  id: string;
  type: string;
  position: GridPos;
  initialState?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Layer-based level structure
 * Separates visual representation from collision logic
 * Layers are rendered in order: background → ground → objects → player → foreground
 */
export interface LevelLayers {
  background: number[][]; // Numeric tile IDs [row][col] - rendered first
  ground?: number[][]; // Optional ground decoration layer - rendered after background
  foreground?: number[][]; // Optional foreground layer - rendered AFTER player (creates depth)
  collision: boolean[][]; // Collision map: true = blocked, false = walkable [row][col]
}

/**
 * Block usage constraints embedded in level data
 */
export interface LevelBlockConstraints {
  blockLimit: number | null;
  allowedBlocks: string[];
  bannedBlocks?: string[];
  requiredBlocks: Array<{
    type: string;
    minCount: number;
  }>;
}

/**
 * Immutable level definition
 * Defines the structure and initial configuration of a level
 * Does NOT contain runtime state or rendering information
 */
export interface LevelDefinition {
  id: string;
  name: string;
  width: number; // Grid width in tiles
  height: number; // Grid height in tiles
  layers: LevelLayers; // Layer-based map data
  startPosition: GridPos; // Player spawn point
  goalPosition: GridPos; // Win condition position
  tileset?: string; // Optional tileset name (defaults to "default")
  objects?: GridObjectDefinition[]; // Optional interactive objects
  blockConstraints?: LevelBlockConstraints;
  metadata?: {
    difficulty?: "easy" | "medium" | "hard";
    description?: string;
    targetAlgorithm?: string; // e.g., "DFS", "BFS", "backtracking"
    requiredFruits?: number;
    [key: string]: unknown;
  };
}

/**
 * Runtime state for algorithm visualization metadata
 * Used to store algorithm-specific data for visual feedback
 */
export interface VisualizationMetadata {
  frontier?: Set<string>; // Nodes in frontier (stringified GridPos)
  explored?: Set<string>; // Explored nodes
  path?: GridPos[]; // Current path being explored
  recursionStack?: GridPos[]; // For recursive algorithms
  cost?: Map<string, number>; // Cost map for pathfinding algorithms
  parent?: Map<string, GridPos>; // Parent pointers for path reconstruction
  [key: string]: unknown; // Extensible for custom algorithm data
}

/**
 * Mutable level state during execution
 * Tracks runtime changes and player/algorithm progress
 */
export interface LevelState {
  playerPosition: GridPos; // Current player position
  visited: Set<string>; // Visited cells (stringified GridPos for Set compatibility)
  objectStates: Map<string, string>; // Object ID -> current state
  stepCount: number; // Number of moves/operations executed
  isComplete: boolean; // Whether goal has been reached
  visualization: VisualizationMetadata; // Algorithm visualization data
  customData?: Record<string, unknown>; // Extensible for level-specific data
}

/**
 * Helper to convert GridPos to string key for Set/Map storage
 */
export function gridPosToKey(pos: GridPos): string {
  return `${pos.row},${pos.col}`;
}

/**
 * Helper to parse string key back to GridPos
 */
export function keyToGridPos(key: string): GridPos {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

/**
 * Helper to check if two grid positions are equal
 */
export function gridPosEquals(a: GridPos, b: GridPos): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Helper to check if position is within bounds
 */
export function isInBounds(pos: GridPos, width: number, height: number): boolean {
  return pos.row >= 0 && pos.row < height && pos.col >= 0 && pos.col < width;
}

/**
 * Check if win condition is met for a level
 * Compares player position against level's goal position
 */
export function isWinConditionMet(level: LevelDefinition, playerPos: GridPos): boolean {
  return gridPosEquals(playerPos, level.goalPosition);
}
