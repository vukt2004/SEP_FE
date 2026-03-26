/**
 * Display tier for map.difficulty using 5-level scale.
 * Level 1-2 = easy, 3 = medium, 4-5 = hard.
 */
export type DifficultyTier = "easy" | "medium" | "hard";

export function getDifficultyTier(d: number): DifficultyTier {
  if (d <= 2) return "easy";
  if (d === 3) return "medium";
  return "hard";
}
