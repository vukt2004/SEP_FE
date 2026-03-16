import * as Blockly from "blockly";
import type { BlockConfig } from "../types/blockDefinition";

/**
 * Registers custom blocks dynamically from block definitions.
 * Fully config-driven - no hardcoded block logic.
 * @param blockDefinitions Array of block definitions to register
 */
export function registerBlocks(blockDefinitions: BlockConfig[]): void {
  blockDefinitions.forEach((blockDef) => {
    registerBlock(blockDef);
  });
}

/**
 * Registers a single block from its configuration
 */
function registerBlock(blockDef: BlockConfig): void {
  Blockly.Blocks[blockDef.type] = {
    init: function (this: Blockly.Block) {
      // Build the block configuration dynamically
      const messages: string[] = [];
      const args: unknown[][] = [];

      // Start with the main label
      let currentMessage = blockDef.label;
      const currentArgs: unknown[] = [];

      // Add inputs if defined
      if (blockDef.inputs && blockDef.inputs.length > 0) {
        blockDef.inputs.forEach((input) => {
          if (input.kind === "field_number") {
            // Add number field
            currentMessage += ` %${currentArgs.length + 1}`;
            currentArgs.push({
              type: "field_number",
              name: input.name,
              value: input.value ?? 0,
              min: input.min,
              max: input.max,
              precision: input.precision,
            });
            // Add label after the field
            if (input.label) {
              currentMessage += ` ${input.label}`;
            }
          } else if (input.kind === "value") {
            // Add value input
            currentMessage += ` %${currentArgs.length + 1}`;
            currentArgs.push({
              type: "input_value",
              name: input.name,
              check: input.check,
            });
            // Add label after the input
            if (input.label) {
              currentMessage += ` ${input.label}`;
            }
          } else if (input.kind === "field_input") {
            // Add text field
            currentMessage += ` %${currentArgs.length + 1}`;
            currentArgs.push({
              type: "field_input",
              name: input.name,
              text: input.text ?? "",
            });
            // Add label after the field
            if (input.label) {
              currentMessage += ` ${input.label}`;
            }
          } else if (input.kind === "field_dropdown") {
            // Add dropdown field
            currentMessage += ` %${currentArgs.length + 1}`;
            currentArgs.push({
              type: "field_dropdown",
              name: input.name,
              options: input.options,
            });
            // Add label after the field
            if (input.label) {
              currentMessage += ` ${input.label}`;
            }
          }
        });
      }

      messages.push(currentMessage);
      args.push(currentArgs);

      // Add statement input if defined
      if (blockDef.statementInput) {
        const statementMessage = blockDef.statementInput.label
          ? blockDef.statementInput.label.charAt(0).toUpperCase() +
            blockDef.statementInput.label.slice(1) +
            " %1"
          : "Do %1";
        messages.push(statementMessage);
        args.push([
          {
            type: "input_statement",
            name: blockDef.statementInput.name,
          },
        ]);
      }

      // Add else statement input if defined (for if-else blocks)
      if (blockDef.elseStatementInput) {
        const elseStatementMessage = blockDef.elseStatementInput.label
          ? blockDef.elseStatementInput.label.charAt(0).toUpperCase() +
            blockDef.elseStatementInput.label.slice(1) +
            " %1"
          : "Else %1";
        messages.push(elseStatementMessage);
        args.push([
          {
            type: "input_statement",
            name: blockDef.elseStatementInput.name,
          },
        ]);
      }

      // Add post-statement inputs if defined (for do-while pattern)
      if (blockDef.postStatementInputs && blockDef.postStatementInputs.length > 0) {
        let postMessage = blockDef.postStatementLabel || "";
        const postArgs: unknown[] = [];

        blockDef.postStatementInputs.forEach((input) => {
          if (input.kind === "value") {
            postMessage += ` %${postArgs.length + 1}`;
            postArgs.push({
              type: "input_value",
              name: input.name,
              check: input.check,
            });
            // Add label after the input
            if (input.label) {
              postMessage += ` ${input.label}`;
            }
          }
        });

        messages.push(postMessage);
        args.push(postArgs);
      }

      // Build the final configuration object
      interface DynamicBlockConfig {
        type: string;
        colour: string;
        tooltip: string;
        helpUrl: string;
        previousStatement?: boolean | null;
        nextStatement?: boolean | null;
        output?: string | null;
        [key: string]: unknown;
      }

      const config: DynamicBlockConfig = {
        type: blockDef.type,
        colour: blockDef.color,
        tooltip: blockDef.tooltip,
        helpUrl: "",
      };

      // Add messages and args dynamically
      messages.forEach((message, index) => {
        config[`message${index}`] = message;
        if (args[index] && args[index].length > 0) {
          config[`args${index}`] = args[index];
        }
      });

      // Set output type for value blocks (e.g., Boolean)
      if (blockDef.output !== undefined) {
        config.output = blockDef.output;
      }

      // Set statement connections based on config
      if (blockDef.previousStatement !== undefined) {
        config.previousStatement = blockDef.previousStatement ? null : undefined;
      }

      if (blockDef.nextStatement !== undefined) {
        config.nextStatement = blockDef.nextStatement ? null : undefined;
      }

      this.jsonInit(config);
    },
  };
}
