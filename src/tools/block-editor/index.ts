// Components
export { default as BlocklyWorkspace } from "./components/BlocklyWorkspace";

// Types
export type {
  BlockConfig,
  BlockCategory,
  BlocksConfigFile,
  BlockInputConfig,
  BlockNumberFieldConfig,
  BlockValueInputConfig,
  StatementInputConfig,
  BlockRegistry,
} from "./types/blockDefinition";

// Utilities
export { loadBlockRegistry } from "./utils/blockLoader";
export { generateToolbox } from "./utils/generateToolbox";

// Block Registration
export { registerBlocks } from "./blocks/registerBlocks";

// AST Generation
export { generateAST } from "./blocks/registerGenerators";
