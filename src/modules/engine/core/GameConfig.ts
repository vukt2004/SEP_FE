export const LevelType = {
  TopDown: "TopDown",
  Platform: "Platform",
} as const;

export type LevelType = (typeof LevelType)[keyof typeof LevelType];

export interface GameConfig {
  levelType: LevelType;
  useGravity: boolean;
  winCondition: 1 | 2;
  requiredFruits?: number;
}

export interface LevelConfig {
  levelType: LevelType;
  useGravity: boolean;
  winCondition: 1 | 2;
  requiredFruits?: number;
  // Add more level-specific config here as needed
  // e.g., gravity strength, jump power, etc.
}

/**
 * Factory function to create game config based on level type
 */
export function createGameConfig(
  levelType: LevelType,
  options?: { winCondition?: 1 | 2; requiredFruits?: number },
): GameConfig {
  const winCondition = options?.winCondition ?? 1;
  const requiredFruits = options?.requiredFruits;
  switch (levelType) {
    case LevelType.Platform:
      return {
        levelType: LevelType.Platform,
        useGravity: true,
        winCondition,
        requiredFruits,
      };
    case LevelType.TopDown:
      return {
        levelType: LevelType.TopDown,
        useGravity: false,
        winCondition,
        requiredFruits,
      };
    default:
      throw new Error(`Unknown level type: ${levelType}`);
  }
}
