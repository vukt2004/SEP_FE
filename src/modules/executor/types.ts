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
 * Jump command - jump over an obstacle or gap
 */
export interface JumpNode {
  type: "jump";
  blockId: string;
}

/**
 * Wait command - consume one turn without moving
 */
export interface WaitNode {
  type: "wait";
  blockId: string;
}

/**
 * Repeat control flow block
 * Executes body blocks a specified number of times
 */
export interface RepeatNode {
  type: "repeat";
  times: ASTNode | number | null;
  body: ASTNode[];
  blockId: string;
}

/**
 * Condition types for reusable boolean blocks
 */
export type ConditionType =
  | "wallAhead"
  | "pathAhead"
  | "obstacleAhead"
  | "wallLeft"
  | "wallRight"
  | "goalReached"
  | "enemyAhead"
  | "trapAhead"
  | "fruitCollected";

/**
 * Numeric literal node
 */
export interface NumberLiteralNode {
  type: "numberLiteral";
  value: number;
  blockId: string;
}

/**
 * Runtime numeric sensor types exposed by the game engine
 */
export type NumberSensorType = "boxHardnessAhead";

/**
 * Numeric sensor node resolved at runtime
 */
export interface NumberSensorNode {
  type: "numberSensor";
  sensorType: NumberSensorType;
  blockId: string;
}

/**
 * Arithmetic expression node that evaluates to a number
 */
export interface ArithmeticNode {
  type: "arithmetic";
  operator: "+" | "-" | "*" | "/";
  left: ASTNode | null;
  right: ASTNode | null;
  blockId: string;
}

/**
 * Variable assignment node
 */
export interface SetVariableNode {
  type: "setVariable";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Variable assignment node (alternate variable block)
 */
export interface ChangeVariableNode {
  type: "changeVariable";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Variable getter node
 */
export interface GetVariableNode {
  type: "getVariable";
  name: string;
  blockId: string;
}

/**
 * Number comparison node that evaluates to a boolean
 */
export interface CompareNode {
  type: "compare";
  operator: ">" | "<" | "==" | ">=" | "<=" | "!=";
  left: ASTNode | null;
  right: ASTNode | null;
  blockId: string;
}

/**
 * Condition node representing a boolean expression
 */
export interface ConditionNode {
  type: "condition";
  conditionType: ConditionType;
  blockId: string;
}

/**
 * Boolean literal node - represents a hardcoded True or False value
 */
export interface BooleanLiteralNode {
  type: "booleanLiteral";
  value: boolean;
  blockId: string;
}

/**
 * Logic AND/OR with two boolean operands
 */
export interface LogicBinaryNode {
  type: "logicBinary";
  operator: "and" | "or";
  left: ASTNode | null;
  right: ASTNode | null;
  blockId: string;
}

/**
 * Logic NOT with a single boolean operand
 */
export interface LogicNotNode {
  type: "logicNot";
  value: ASTNode | null;
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
 * Repeat until condition is true
 */
export interface RepeatUntilNode {
  type: "repeatUntil";
  condition: ASTNode | null;
  body: ASTNode[];
  blockId: string;
}

/**
 * Define a named reusable procedure
 */
export interface DefineProcedureNode {
  type: "defineProcedure";
  name: string;
  body: ASTNode[];
  blockId: string;
}

/**
 * Call a named procedure
 */
export interface CallProcedureNode {
  type: "callProcedure";
  name: string;
  blockId: string;
}

/**
 * Break command - attempts to break the object in front using evaluated power
 */
export interface BreakNode {
  type: "break";
  power: ASTNode | null;
  blockId: string;
}

/**
 * Open door command - opens a door in front of the player
 */
export interface OpenDoorNode {
  type: "openDoor";
  blockId: string;
}

/**
 * Close door command - closes a door in front of the player
 */
export interface CloseDoorNode {
  type: "closeDoor";
  blockId: string;
}

/**
 * Union type of all possible AST node types
 */
export type ASTNode =
  | MoveNode
  | MoveForwardNode
  | TurnNode
  | JumpNode
  | WaitNode
  | BreakNode
  | OpenDoorNode
  | CloseDoorNode
  | RepeatNode
  | NumberLiteralNode
  | NumberSensorNode
  | ArithmeticNode
  | SetVariableNode
  | ChangeVariableNode
  | GetVariableNode
  | CompareNode
  | ConditionNode
  | BooleanLiteralNode
  | LogicBinaryNode
  | LogicNotNode
  | CustomIfNode
  | CustomWhileNode
  | CustomDoWhileNode
  | RepeatUntilNode
  | DefineProcedureNode
  | CallProcedureNode;

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
