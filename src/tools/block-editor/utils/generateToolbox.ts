import type { BlockConfig, BlockCategory } from "../types/blockDefinition";

interface ToolboxBlock {
  kind: "block";
  type: string;
}

interface ToolboxSeparator {
  kind: "sep";
  gap?: string;
}

interface ToolboxLabel {
  kind: "label";
  text: string;
}

interface FlyoutToolbox {
  kind: "flyoutToolbox";
  contents: (ToolboxBlock | ToolboxSeparator | ToolboxLabel)[];
}

/**
 * Category display names
 */
const CATEGORY_NAMES: Record<BlockCategory, string> = {
  movement: "Movement",
  control: "Control",
  logic: "Logic",
  procedure: "Procedure",
  variables: "Variables",
  math: "Math",
  array: "Array",
  queue: "Queue",
  stack: "Stack",
};

/**
 * Generates a dynamic toolbox configuration from block definitions.
 * Uses a flyout toolbox (always visible) instead of categories.
 * @param blockDefinitions Array of block definitions
 * @returns Blockly toolbox configuration object
 */
export function generateToolbox(
  blockDefinitions: BlockConfig[],
  options?: {
    hiddenBlockTypes?: string[];
    getCategoryLabel?: (category: BlockCategory, fallback: string) => string;
  },
): FlyoutToolbox {
  const hiddenTypes = new Set(options?.hiddenBlockTypes ?? []);
  // User request: hide only category headers (not the blocks) for these sections.
  const hiddenCategoryLabels = new Set<BlockCategory>(["movement", "control"]);

  // Group blocks by category
  const blocksByCategory = new Map<BlockCategory, BlockConfig[]>();

  blockDefinitions.forEach((blockDef) => {
    const category = blockDef.category;
    if (!blocksByCategory.has(category)) {
      blocksByCategory.set(category, []);
    }
    blocksByCategory.get(category)!.push(blockDef);
  });

  // Build flyout contents with labels for organization
  const contents: (ToolboxBlock | ToolboxSeparator | ToolboxLabel)[] = [];

  // Define category order
  const categoryOrder: BlockCategory[] = [
    "movement",
    "control",
    "logic",
    "variables",
    "array",
    "queue",
    "stack",
    "math",
    "procedure",
  ];

  categoryOrder.forEach((category, index) => {
    const blocks = blocksByCategory.get(category);
    const visibleBlocks =
      blocks?.filter((block) => !hiddenTypes.has(block.type)) ?? [];

    if (visibleBlocks.length > 0) {
      // Add category label
      const shouldShowLabel = !hiddenCategoryLabels.has(category);
      if (shouldShowLabel) {
        if (index > 0) {
          contents.push({ kind: "sep", gap: "32" });
        }
        const fallbackCategoryName = CATEGORY_NAMES[category];
        contents.push({
          kind: "label",
          text: options?.getCategoryLabel?.(category, fallbackCategoryName) ?? fallbackCategoryName,
        });
      }

      // Add blocks from this category
      visibleBlocks.forEach((block) => {
        contents.push({
          kind: "block",
          type: block.type,
        });
      });
    }
  });

  return {
    kind: "flyoutToolbox",
    contents,
  };
}
