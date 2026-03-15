import type { Direction, Rotation } from "./types";

/**
 * Command types for the game engine
 */
export interface MoveCommand {
  type: "move";
  direction: Direction;
}

export interface MoveForwardCommand {
  type: "moveForward";
}

export interface TurnCommand {
  type: "turn";
  rotation: Rotation;
}

export interface InteractCommand {
  type: "interact";
}

export interface JumpCommand {
  type: "jump";
}

export interface WaitCommand {
  type: "wait";
}

export type EngineCommand =
  | MoveCommand
  | MoveForwardCommand
  | TurnCommand
  | InteractCommand
  | JumpCommand
  | WaitCommand;

/**
 * Result of executing a single block
 * Contains both the engine command and the block ID for UI highlighting
 */
export interface ExecutionResult {
  command: EngineCommand;
  blockId: string;
}
