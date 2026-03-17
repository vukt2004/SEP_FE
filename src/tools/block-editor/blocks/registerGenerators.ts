import * as Blockly from "blockly";
import type { ASTNode, BlockProgram } from "@/modules/executor/types";

/**
 * Generates an AST (Abstract Syntax Tree) from Blockly workspace blocks.
 * Converts visual blocks into executable AST objects for the StepExecutor.
 *
 * @param workspace The Blockly workspace containing blocks
 * @returns BlockProgram (array of ASTNode objects) ready for execution
 */
export function generateAST(workspace: Blockly.WorkspaceSvg): BlockProgram {
  const topBlocks = workspace.getTopBlocks(true); // true = ordered by position
  const program: BlockProgram = [];

  // Convert each top-level block chain
  for (const block of topBlocks) {
    // Use getConnectedBlocks to follow the entire chain
    const blockChain = getConnectedBlocks(block);
    program.push(...blockChain);
  }

  return program;
}

/**
 * Recursively converts a Blockly block into an AST node
 * @param block The Blockly block to convert
 * @returns The corresponding AST node object, or null if unsupported
 */
function convertBlockToAST(block: Blockly.Block): ASTNode | null {
  const blockId = block.id;
  const blockType = block.type;

  switch (blockType) {
    case "move_forward":
      // Move forward in the current facing direction
      return {
        type: "moveForward",
        blockId,
      };

    case "turn_left":
      // Rotate 90 degrees counter-clockwise
      return {
        type: "turn",
        rotation: "counterclockwise",
        blockId,
      };

    case "turn_right":
      // Rotate 90 degrees clockwise
      return {
        type: "turn",
        rotation: "clockwise",
        blockId,
      };

    case "move_up":
      return {
        type: "move",
        direction: "up",
        blockId,
      };

    case "move_down":
      return {
        type: "move",
        direction: "down",
        blockId,
      };

    case "move_left":
      return {
        type: "move",
        direction: "left",
        blockId,
      };

    case "move_right":
      return {
        type: "move",
        direction: "right",
        blockId,
      };

    case "jump":
      return {
        type: "jump",
        blockId,
      };

    case "wait":
      return {
        type: "wait",
        blockId,
      };

    case "interact":
      return {
        type: "interact",
        blockId,
      };

    case "repeat": {
      const timesValue = block.getFieldValue("TIMES");
      const times = Math.max(0, Number(timesValue) || 0);
      const body = getStatementBlocks(block, "DO");
      return {
        type: "repeat",
        times,
        body,
        blockId,
      };
    }

    // New condition blocks (return condition AST nodes)
    case "wall_ahead":
      return {
        type: "condition",
        conditionType: "wallAhead",
        blockId,
      };

    case "path_ahead":
      return {
        type: "condition",
        conditionType: "pathAhead",
        blockId,
      };

    case "obstacle_ahead":
      return {
        type: "condition",
        conditionType: "obstacleAhead",
        blockId,
      };

    case "wall_left":
      return {
        type: "condition",
        conditionType: "wallLeft",
        blockId,
      };

    case "wall_right":
      return {
        type: "condition",
        conditionType: "wallRight",
        blockId,
      };

    case "goal_reached":
      return {
        type: "condition",
        conditionType: "goalReached",
        blockId,
      };

    case "logic_true":
      return {
        type: "booleanLiteral",
        value: true,
        blockId,
      };

    case "logic_false":
      return {
        type: "booleanLiteral",
        value: false,
        blockId,
      };

    case "logic_and": {
      const left = getValueInput(block, "A");
      const right = getValueInput(block, "B");
      return {
        type: "logicBinary",
        operator: "and",
        left,
        right,
        blockId,
      };
    }

    case "logic_or": {
      const left = getValueInput(block, "A");
      const right = getValueInput(block, "B");
      return {
        type: "logicBinary",
        operator: "or",
        left,
        right,
        blockId,
      };
    }

    case "logic_not": {
      const value = getValueInput(block, "VALUE");
      return {
        type: "logicNot",
        value,
        blockId,
      };
    }

    // New control blocks with dynamic conditions
    case "custom_if": {
      const condition = getValueInput(block, "CONDITION");
      const body = getStatementBlocks(block, "DO");
      const elseBranch = getStatementBlocks(block, "ELSE");
      return {
        type: "customIf",
        condition,
        body,
        elseBranch,
        blockId,
      };
    }

    case "custom_while": {
      const condition = getValueInput(block, "CONDITION");
      const body = getStatementBlocks(block, "DO");
      return {
        type: "customWhile",
        condition,
        body,
        blockId,
      };
    }

    case "custom_do_while": {
      const condition = getValueInput(block, "CONDITION");
      const body = getStatementBlocks(block, "DO");
      return {
        type: "customDoWhile",
        condition,
        body,
        blockId,
      };
    }

    case "repeat_until": {
      const condition = getValueInput(block, "CONDITION");
      const body = getStatementBlocks(block, "DO");
      return {
        type: "repeatUntil",
        condition,
        body,
        blockId,
      };
    }

    case "define_procedure": {
      const name = (block.getFieldValue("NAME") || "").trim() || "myProcedure";
      const body = getStatementBlocks(block, "BODY");
      return {
        type: "defineProcedure",
        name,
        body,
        blockId,
      };
    }

    case "call_procedure": {
      const name = (block.getFieldValue("NAME") || "").trim() || "myProcedure";
      return {
        type: "callProcedure",
        name,
        blockId,
      };
    }

    default:
      console.warn(`Unknown block type: ${blockType}`);
      return null;
  }
}

/**
 * Extracts and converts all blocks connected to a statement input
 * @param block The parent block
 * @param inputName The name of the statement input
 * @returns Array of converted AST nodes
 */
function getStatementBlocks(block: Blockly.Block, inputName: string): ASTNode[] {
  const input = block.getInput(inputName);
  if (!input?.connection) {
    return [];
  }

  const targetBlock = input.connection.targetBlock();
  if (!targetBlock) {
    return [];
  }

  return getConnectedBlocks(targetBlock);
}

/**
 * Extracts and converts a value input block (e.g., Boolean condition)
 * @param block The parent block
 * @param inputName The name of the value input
 * @returns The converted AST node, or null if not connected
 */
function getValueInput(block: Blockly.Block, inputName: string): ASTNode | null {
  const input = block.getInput(inputName);
  if (!input?.connection) {
    return null;
  }

  const targetBlock = input.connection.targetBlock();
  if (!targetBlock) {
    return null;
  }

  return convertBlockToAST(targetBlock);
}

/**
 * Recursively collects all blocks in a vertical chain
 * @param startBlock The first block in the chain
 * @returns Array of converted AST nodes
 */
function getConnectedBlocks(startBlock: Blockly.Block): ASTNode[] {
  const nodes: ASTNode[] = [];
  let currentBlock: Blockly.Block | null = startBlock;

  while (currentBlock) {
    const astNode = convertBlockToAST(currentBlock);
    if (astNode) {
      nodes.push(astNode);
    }
    currentBlock = currentBlock.getNextBlock();
  }

  return nodes;
}
