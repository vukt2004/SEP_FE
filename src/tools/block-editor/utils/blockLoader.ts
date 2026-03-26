import blocksConfig from "@/shared/block/blocks-config.json";
import type { LocaleId } from "@/stores/language.store";
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

function getTranslatedValue(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  return value === key ? fallback : value;
}

const viFallbackTokenMap: Record<string, string> = {
  cell: "ô",
  power: "lực",
  key: "khóa",
  times: "lần",
  do: "làm",
  else: "khác",
  seconds: "giây",
  name: "tên",
  value: "giá trị",
  array: "mảng",
  at: "tại",
  index: "chỉ số",
  item: "phần tử",
  queue: "hàng đợi",
  stack: "ngăn xếp",
  condition: "điều kiện",
};

function applyLocaleFallback(text: string, locale: LocaleId): string {
  if (locale !== "vi") return text;
  return viFallbackTokenMap[text.toLowerCase()] ?? text;
}

/**
 * Loads block definitions and applies optional translations for labels/tooltips.
 */
export function loadLocalizedBlockRegistry(t: (key: string) => string, locale: LocaleId): BlockConfig[] {
  const blocks = loadBlockRegistry();

  return blocks.map((block) => ({
    ...block,
    label: applyLocaleFallback(getTranslatedValue(t, `block.${block.type}`, block.label), locale),
    tooltip: getTranslatedValue(t, `blockTooltip.${block.type}`, block.tooltip),
    inputs: block.inputs?.map((input) => ({
      ...input,
      label: applyLocaleFallback(
        getTranslatedValue(t, `blockInput.${block.type}.${input.name}`, input.label),
        locale,
      ),
    })),
    statementInput: block.statementInput
      ? {
          ...block.statementInput,
          label: applyLocaleFallback(
            getTranslatedValue(
              t,
              `blockStatement.${block.type}.${block.statementInput.name}`,
              block.statementInput.label,
            ),
            locale,
          ),
        }
      : undefined,
    elseStatementInput: block.elseStatementInput
      ? {
          ...block.elseStatementInput,
          label: applyLocaleFallback(
            getTranslatedValue(
              t,
              `blockElseStatement.${block.type}.${block.elseStatementInput.name}`,
              block.elseStatementInput.label,
            ),
            locale,
          ),
        }
      : undefined,
    postStatementLabel: block.postStatementLabel
      ? getTranslatedValue(t, `blockPostLabel.${block.type}`, block.postStatementLabel)
      : undefined,
  }));
}
