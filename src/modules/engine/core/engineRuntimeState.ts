import type { Player } from "./types";
import type { EngineState } from "./engineState";

/**
 * Centralized runtime state for GameEngine
 *
 * All mutable execution state is stored here, making it easy to:
 * - Snapshot and restore state
 * - Clone for replay/undo systems
 * - Reset to initial state
 * - Serialize for save games
 */
export interface EngineRuntimeState {
  /** Current player state and position */
  player: Player;

  /** Current per-object states keyed by object id */
  objectStates: Map<string, string>;

  /** Total number of commands executed */
  stepCount: number;

  /** Whether player has reached win condition */
  hasPlayerWon: boolean;

  /** Current engine execution state */
  state: EngineState;

  /** Set of collected fruit IDs */
  collectedFruits: Set<string>;

  /** Set of collected character object IDs */
  collectedCharacters: Set<string>;

  /** Time elapsed in milliseconds since game started */
  timeElapsed: number;

  /** Timestamp when game started */
  startTime: number | null;
}
