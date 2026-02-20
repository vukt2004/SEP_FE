export const LevelType = {
  TopDown: "TopDown",
  Platform: "Platform",
} as const;

export type LevelType = (typeof LevelType)[keyof typeof LevelType];

export interface GameConfig {
  levelType: LevelType;
  useGravity: boolean;
}

export interface LevelConfig {
  levelType: LevelType;
  useGravity: boolean;
  // Add more level-specific config here as needed
  // e.g., gravity strength, jump power, etc.
}

/**
 * Factory function to create game config based on level type
 */
export function createGameConfig(levelType: LevelType): GameConfig {
  switch (levelType) {
    case LevelType.Platform:
      return {
        levelType: LevelType.Platform,
        useGravity: true,
      };
    case LevelType.TopDown:
      return {
        levelType: LevelType.TopDown,
        useGravity: false,
      };
    default:
      throw new Error(`Unknown level type: ${levelType}`);
  }
}
