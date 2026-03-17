export const LevelType = {
  TopDown: "TopDown",
  Platform: "Platform",
} as const;

export type LevelType = (typeof LevelType)[keyof typeof LevelType];

export interface GameConfig {
  levelType: LevelType;
  useGravity: boolean;
  winCondition: 1 | 2;
}

export interface LevelConfig {
  levelType: LevelType;
  useGravity: boolean;
  winCondition: 1 | 2;
  // Add more level-specific config here as needed
  // e.g., gravity strength, jump power, etc.
}

/**
 * Factory function to create game config based on level type
 */
export function createGameConfig(
  levelType: LevelType,
  options?: { winCondition?: 1 | 2 },
): GameConfig {
  const winCondition = options?.winCondition ?? 1;
  switch (levelType) {
    case LevelType.Platform:
      return {
        levelType: LevelType.Platform,
        useGravity: true,
        winCondition,
      };
    case LevelType.TopDown:
      return {
        levelType: LevelType.TopDown,
        useGravity: false,
        winCondition,
      };
    default:
      throw new Error(`Unknown level type: ${levelType}`);
  }
}
