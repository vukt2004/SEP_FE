export type BlockCategory = "movement" | "control" | "logic";

/**
 * Configuration for a number field input
 */
export interface BlockNumberFieldConfig {
  kind: "field_number";
  name: string;
  label: string;
  value?: number;
  min?: number;
  max?: number;
  precision?: number;
}

/**
 * Configuration for a value input
 */
export interface BlockValueInputConfig {
  kind: "value";
  name: string;
  check?: string | string[];
  label: string;
}

/**
 * Union type for all input configurations
 */
export type BlockInputConfig = BlockNumberFieldConfig | BlockValueInputConfig;

/**
 * Configuration for a statement input (for nested blocks)
 */
export interface StatementInputConfig {
  name: string;
  label: string;
}

/**
 * Complete block configuration
 */
export interface BlockConfig {
  type: string;
  category: BlockCategory;
  label: string;
  tooltip: string;
  color: string;
  command: string;
  previousStatement?: boolean;
  nextStatement?: boolean;
  output?: string; // For value blocks (e.g., "Boolean", "Number", "String")
  inputs?: BlockInputConfig[];
  statementInput?: StatementInputConfig;
  elseStatementInput?: StatementInputConfig; // For if-else blocks
  postStatementInputs?: BlockInputConfig[]; // Inputs that appear after the statement block
  postStatementLabel?: string; // Label that appears before postStatementInputs
}

/**
 * Root configuration file structure
 */
export interface BlocksConfigFile {
  blocks: BlockConfig[];
}

export interface BlockRegistry {
  blocks: BlockConfig[];
}
