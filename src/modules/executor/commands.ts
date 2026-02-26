import type { Direction } from "./types";

/**
 * Command types for the game engine
 */
export interface MoveCommand {
  type: "move";
  direction: Direction;
}

export interface InteractCommand {
  type: "interact";
}

export type EngineCommand = MoveCommand | InteractCommand;

/**
 * Result of executing a single block
 * Contains both the engine command and the block ID for UI highlighting
 */
export interface ExecutionResult {
  command: EngineCommand;
  blockId: string;
}
