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

export interface MoveToCellCommand {
  type: "moveToCell";
  cell: string;
}

export interface TurnCommand {
  type: "turn";
  rotation: Rotation;
}

export interface BreakCommand {
  type: "break";
  power: number;
}

export interface OpenDoorCommand {
  type: "openDoor";
}

export interface CloseDoorCommand {
  type: "closeDoor";
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
  | MoveToCellCommand
  | TurnCommand
  | BreakCommand
  | OpenDoorCommand
  | CloseDoorCommand
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
