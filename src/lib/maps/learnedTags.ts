type MaybeRecord = Record<string, unknown>;

function normalizeSingle(value: unknown): string | null {
  if (typeof value === "string") {
    const v = value.trim();
    return v.length > 0 ? v : null;
  }
  if (value && typeof value === "object") {
    const obj = value as MaybeRecord;
    const candidate =
      (typeof obj.name === "string" && obj.name) ||
      (typeof obj.label === "string" && obj.label) ||
      (typeof obj.value === "string" && obj.value) ||
      (typeof obj.tag === "string" && obj.tag) ||
      "";
    const normalized = candidate.trim();
    return normalized.length > 0 ? normalized : null;
  }
  return null;
}

function splitText(value: string): string[] {
  return value
    .split(/[|,;/]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function extractLearnedTags(source: unknown): string[] {
  const obj = (source ?? {}) as MaybeRecord;
  const raw =
    obj.learnedTag ??
    obj.learnedTags ??
    obj.LearnedTag ??
    obj.LearnedTags ??
    obj["learned_tag"] ??
    obj["learned_tags"];

  if (Array.isArray(raw)) {
    return [...new Set(raw.map(normalizeSingle).filter((x): x is string => !!x))];
  }

  if (typeof raw === "string") {
    return [...new Set(splitText(raw))];
  }

  const one = normalizeSingle(raw);
  return one ? [one] : [];
}

