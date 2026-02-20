// ============================================================================
// TYPES
// ============================================================================

export type {
  GridPos,
  TileType,
  GridObjectDefinition,
  LevelDefinition,
  LevelState,
  VisualizationMetadata,
} from "./types";

// Helper functions
export { gridPosToKey, keyToGridPos, gridPosEquals, isInBounds, isWinConditionMet } from "./types";

// ============================================================================
// LEVEL FACTORY
// ============================================================================

// Grid-based level factory functions
export {
  createBorderedLevel,
  createEmptyLevel,
  createMazeLevel,
  createCustomLevel,
} from "./mapFactory";

// ============================================================================
// LEVEL MANAGER
// ============================================================================

export { LevelManager } from "./LevelManager";
