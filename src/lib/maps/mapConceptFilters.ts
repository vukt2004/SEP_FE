/** Tag names that represent difficulty level – exclude from concept filters */
const DIFFICULTY_TAG_NAMES = new Set(
  ["beginner", "easy", "medium", "hard", "expert"].map((s) => s.toLowerCase()),
);

export function isDifficultyTag(tagName: string): boolean {
  return DIFFICULTY_TAG_NAMES.has(tagName.trim().toLowerCase());
}

const CONCEPT_FILTER_EXCLUDE_LOWER = new Set([
  "optimization",
  "debugging",
  "computational thinking",
  "algorithm basics",
  "algorithm design",
  "logic puzzle",
]);

export function isConceptExcluded(tagName: string): boolean {
  return CONCEPT_FILTER_EXCLUDE_LOWER.has(tagName.trim().toLowerCase());
}

const SKILL_MECHANISM_CONCEPTS_LOWER = new Set([
  "tư duy logic",
  "tránh chướng ngại vật",
  "tìm đường",
  "nhận dạng mẫu",
  "giải quyết vấn đề",
  "thu thập tài nguyên",
  "chiến lược",
  "điều hướng",
  "pathfinding",
  "obstacle avoidance",
  "pattern recognition",
  "problem solving",
  "resource collection",
  "strategy",
  "logical thinking",
]);

export function isSkillMechanismConcept(tagName: string): boolean {
  return SKILL_MECHANISM_CONCEPTS_LOWER.has(tagName.trim().toLowerCase());
}
