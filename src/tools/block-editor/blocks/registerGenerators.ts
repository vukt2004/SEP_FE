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
      // Legacy forward movement - could map to up in grid coordinates
      return {
        type: "move",
        direction: "up",
        blockId,
      };

    case "turn_left":
      // Map to left movement in absolute coordinates
      return {
        type: "move",
        direction: "left",
        blockId,
      };

    case "turn_right":
      // Map to right movement in absolute coordinates
      return {
        type: "move",
        direction: "right",
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

    case "if_path_ahead": {
      const body = getStatementBlocks(block, "DO");
      return {
        type: "ifPathAhead",
        body,
        blockId,
      };
    }

    case "if_wall_ahead": {
      const body = getStatementBlocks(block, "DO");
      return {
        type: "ifWallAhead",
        body,
        blockId,
      };
    }

    case "while_obstacle_ahead": {
      const body = getStatementBlocks(block, "DO");
      return {
        type: "whileObstacleAhead",
        body,
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
