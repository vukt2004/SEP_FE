/**
 * Direction for absolute movement in 2D grid
 */
export type Direction = "up" | "down" | "left" | "right";

/**
 * Move command with absolute direction
 */
export interface MoveNode {
  type: "move";
  direction: Direction;
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
 * Conditional if block for path ahead
 * Evaluates condition at runtime and executes body if path is clear
 */
export interface IfPathAheadNode {
  type: "ifPathAhead";
  body: ASTNode[];
  blockId: string;
}

/**
 * Conditional if block for wall ahead
 * Evaluates condition at runtime and executes body if wall detected
 */
export interface IfWallAheadNode {
  type: "ifWallAhead";
  body: ASTNode[];
  blockId: string;
}

/**
 * While loop control flow block for obstacle ahead
 * Repeats body blocks while obstacle condition remains true
 */
export interface WhileObstacleAheadNode {
  type: "whileObstacleAhead";
  body: ASTNode[];
  blockId: string;
}

/**
 * Union type of all possible AST node types
 */
export type ASTNode =
  | MoveNode
  | RepeatNode
  | IfPathAheadNode
  | IfWallAheadNode
  | WhileObstacleAheadNode;

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
