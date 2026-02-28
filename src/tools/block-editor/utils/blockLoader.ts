import blocksConfig from "@/shared/block/blocks-config.json";
import type { BlockConfig, BlocksConfigFile } from "../types/blockDefinition";

/**
 * Loads block definitions from the blocks-config.json file.
 * @returns Array of BlockConfig
 */
export function loadBlockRegistry(): BlockConfig[] {
  const data = blocksConfig as BlocksConfigFile;

  if (!data.blocks || !Array.isArray(data.blocks)) {
    throw new Error("Invalid blocks configuration: 'blocks' array not found");
  }

  return data.blocks;
}
