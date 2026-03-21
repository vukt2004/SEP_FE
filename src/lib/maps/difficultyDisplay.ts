/**
 * Display tier for map.difficulty — must match CMS / Map Editor / MyMaps (1=Easy, 2=Medium, 3=Hard).
 * The old learner rule (≤2 = easy) contradicted that and showed "Dễ" while tags could say #Medium.
 */
export type DifficultyTier = "easy" | "medium" | "hard";

export function getDifficultyTier(d: number): DifficultyTier {
  switch (d) {
    case 1:
      return "easy";
    case 2:
      return "medium";
    case 3:
      return "hard";
    case 4:
      return "medium";
    case 5:
      return "hard";
    default:
      if (d <= 0) return "easy";
      if (d <= 5) return "medium";
      return "hard";
  }
}
