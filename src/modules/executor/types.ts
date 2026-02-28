/**
 * Direction for absolute movement in 2D grid
 */
export type Direction = "up" | "down" | "left" | "right";

/**
 * Rotation direction for relative turning
 */
export type Rotation = "clockwise" | "counterclockwise";

/**
 * Move command with absolute direction
 */
export interface MoveNode {
  type: "move";
  direction: Direction;
  blockId: string;
}

/**
 * Move forward command - moves in the current facing direction
 */
export interface MoveForwardNode {
  type: "moveForward";
  blockId: string;
}

/**
 * Turn command - rotates facing direction
 */
export interface TurnNode {
  type: "turn";
  rotation: Rotation;
  blockId: string;
}

/**
 * Repeat control flow block
 * Executes body blocks a specified number of times
 */
export interface RepeatNode {
  type: "repeat";
  times: number;
  body: ASTNode[];
  blockId: string;
}

/**
 * Condition types for reusable boolean blocks
 */
export type ConditionType = "wallAhead" | "pathAhead" | "obstacleAhead";

/**
 * Condition node representing a boolean expression
 */
export interface ConditionNode {
  type: "condition";
  conditionType: ConditionType;
  blockId: string;
}

/**
 * Custom if block with dynamic condition
 */
export interface CustomIfNode {
  type: "customIf";
  condition: ASTNode | null;
  body: ASTNode[];
  elseBranch: ASTNode[];
  blockId: string;
}

/**
 * Custom while block with dynamic condition
 */
export interface CustomWhileNode {
  type: "customWhile";
  condition: ASTNode | null;
  body: ASTNode[];
  blockId: string;
}

/**
 * Custom do-while block with dynamic condition
 * Executes body at least once, then repeats while condition is true
 */
export interface CustomDoWhileNode {
  type: "customDoWhile";
  condition: ASTNode | null;
  body: ASTNode[];
  blockId: string;
}

/**
 * Union type of all possible AST node types
 */
export type ASTNode =
  | MoveNode
  | MoveForwardNode
  | TurnNode
  | RepeatNode
  | ConditionNode
  | CustomIfNode
  | CustomWhileNode
  | CustomDoWhileNode;

/**
 * A program is a sequence of AST nodes to execute
 */
export type BlockProgram = ASTNode[];

/**
 * Backward compatibility: Legacy block types (deprecated)
 */
export type Block = ASTNode;

/**
 * Legacy compatibility type
 */
export type LegacyBlock = Block & { id?: string };
