import platformerObjects from "../../../shared/assets/platformer/basic/objects/objects.json";
import topdownObjects from "../../../shared/assets/topdown/basic/objects/objects.json";

type MapType = "platform" | "topdown";

type ObjectDefinitionsFile = {
  objects?: Record<string, { name?: string }>;
};

function punctuationFromIndex(index: string): string {
  const punctuationByIndex = [".", ",", "!", "?", ":", ";", "'", '"'];
  return punctuationByIndex[Number(index) - 1] ?? "";
}

function extractSupportedCharacters(definitionsFile: ObjectDefinitionsFile): Set<string> {
  const supported = new Set<string>();

  for (const def of Object.values(definitionsFile.objects ?? {})) {
    if (!def?.name) continue;

    const letterMatch = /^letter_([a-z])$/i.exec(def.name);
    if (letterMatch) {
      supported.add(letterMatch[1].toUpperCase());
      continue;
    }

    const digitMatch = /^digit_([0-9])$/.exec(def.name);
    if (digitMatch) {
      supported.add(digitMatch[1]);
      continue;
    }

    const punctuationMatch = /^punctuation_([1-8])$/.exec(def.name);
    if (punctuationMatch) {
      const punctuation = punctuationFromIndex(punctuationMatch[1]);
      if (punctuation) {
        supported.add(punctuation);
      }
    }
  }

  return supported;
}

const platformSupportedCharacters = extractSupportedCharacters(
  platformerObjects as ObjectDefinitionsFile,
);
const topdownSupportedCharacters = extractSupportedCharacters(topdownObjects as ObjectDefinitionsFile);

export function getSupportedUnlockCharacters(mapType: MapType): string[] {
  const set = mapType === "platform" ? platformSupportedCharacters : topdownSupportedCharacters;
  return Array.from(set).sort();
}

export function sanitizeUnlockCode(input: string, mapType: MapType): string {
  const set = mapType === "platform" ? platformSupportedCharacters : topdownSupportedCharacters;
  const normalized = input.toUpperCase();
  let sanitized = "";

  for (const char of normalized) {
    if (set.has(char)) {
      sanitized += char;
    }
  }

  return sanitized;
}