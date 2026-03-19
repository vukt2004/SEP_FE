/**
 * Direction for absolute movement in 2D grid
 */
export type Direction = "up" | "down" | "left" | "right";

/**
 * Rotation direction for relative turning
 */
export type Rotation = "clockwise" | "counterclockwise";

/**
 * Cell coordinate string in "x,y" format
 */
export type CellString = string;

/**
 * Runtime value type used by block data structures (variables, arrays, queues, stacks).
 */
export type RuntimeValue = number | boolean | string | null | undefined | RuntimeValue[];

/**
 * Runtime variable map available during execution.
 */
export type RuntimeVariables = Record<string, RuntimeValue>;

/**
 * Last removed item metadata for queue/stack visualization.
 */
export interface LastRemovedItem {
  structure: "queue" | "stack";
  name: string;
  value: RuntimeValue;
}

/**
 * Full executor context that can be observed by the UI.
 */
export interface ExecutionContext {
  variables: RuntimeVariables;
  lastRemoved: LastRemovedItem | null;
}

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
 * Create a named list (array)
 */
export interface CreateListNode {
  type: "createList";
  name: string;
  blockId: string;
}

/**
 * Add a value to a named list (append)
 */
export interface ListAddNode {
  type: "listAdd";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Get an item from a named list by index
 */
export interface ListGetNode {
  type: "listGet";
  name: string;
  index: ASTNode | null;
  blockId: string;
}

/**
 * Get the length of a named list
 */
export interface ListLengthNode {
  type: "listLength";
  name: string;
  blockId: string;
}

/**
 * Create a named queue
 */
export interface CreateQueueNode {
  type: "createQueue";
  name: string;
  blockId: string;
}

/**
 * Add a value to a named queue
 */
export interface QueueEnqueueNode {
  type: "queueEnqueue";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Take a value from a named queue
 */
export interface QueueDequeueNode {
  type: "queueDequeue";
  name: string;
  blockId: string;
}

/**
 * Check if a named queue is empty
 */
export interface QueueIsEmptyNode {
  type: "queueIsEmpty";
  name: string;
  blockId: string;
}

/**
 * Create a named stack
 */
export interface CreateStackNode {
  type: "createStack";
  name: string;
  blockId: string;
}

/**
 * Add a value to a named stack
 */
export interface StackPushNode {
  type: "stackPush";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Take a value from a named stack
 */
export interface StackPopNode {
  type: "stackPop";
  name: string;
  blockId: string;
}

/**
 * Check if a named stack is empty
 */
export interface StackIsEmptyNode {
  type: "stackIsEmpty";
  name: string;
  blockId: string;
}

/**
 * Returns the level start cell as a string "x,y"
 */
export interface GetStartCellNode {
  type: "getStartCell";
  blockId: string;
}

/**
 * Returns the level goal cell as a string "x,y"
 */
export interface GetGoalCellNode {
  type: "getGoalCell";
  blockId: string;
}

/**
 * Returns the player's current cell as a string "x,y"
 */
export interface GetCurrentCellNode {
  type: "getCurrentCell";
  blockId: string;
}

/**
 * Returns raw 4-direction neighbors of a cell string
 */
export interface GetNeighborsNode {
  type: "getNeighbors";
  cell: ASTNode | null;
  blockId: string;
}

/**
 * Checks whether a named list contains a value
 */
export interface ListContainsNode {
  type: "listContains";
  name: string;
  value: ASTNode | null;
  blockId: string;
}

/**
 * Callbacks used by executor to resolve level positions
 */
export interface PositionResolver {
  getStartCell: () => CellString;
  getGoalCell: () => CellString;
  getCurrentCell: () => CellString;
  getNeighbors: (cell: CellString) => CellString[];
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
  | CreateListNode
  | ListAddNode
  | ListGetNode
  | ListLengthNode
  | ListContainsNode
  | CreateQueueNode
  | QueueEnqueueNode
  | QueueDequeueNode
  | QueueIsEmptyNode
  | CreateStackNode
  | StackPushNode
  | StackPopNode
  | StackIsEmptyNode
  | GetStartCellNode
  | GetGoalCellNode
  | GetCurrentCellNode
  | GetNeighborsNode
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
