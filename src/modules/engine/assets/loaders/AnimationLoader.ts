import type { GameType } from "../../../../shared/types/GameType";
import { buildImagePath } from "../../../../shared/types/GameType";
import { AssetDefinitionLoader } from "./AssetDefinitionLoader";
import type { AnimationDefinition } from "../../systems/animation/animationTypes";

/**
 * Animation state configuration
 */
interface AnimationStateConfig {
  sprite: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number;
  loop: boolean;
  row?: number; // Optional sprite sheet row (defaults to 0)
}

/**
 * Animation configuration format
 * @internal Used by AssetDefinitionLoader
 */
export interface AnimationConfig {
  objectType: string;
  states: {
    [state: string]: AnimationStateConfig;
  };
}

/**
 * Animation state map
 */
export type AnimationStateMap = {
  [state: string]: AnimationDefinition;
};

/**
 * Animation registry type
 */
export type AnimationRegistry = {
  [objectType: string]: AnimationStateMap;
};

/**
 * Load an image
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Animation loader for game-type-specific animations
 * Loads and processes animation definitions from JSON files
 */
export class AnimationLoader {
  private gameType: GameType;
  private definitionLoader: AssetDefinitionLoader;
  private registry: AnimationRegistry = {};

  /**
   * @param gameType - The game type to load animations for
   */
  constructor(gameType: GameType) {
    this.gameType = gameType;
    this.definitionLoader = new AssetDefinitionLoader(gameType);
  }

  /**
   * Load all animations for this game type
   * @returns Animation registry
   */
  async loadAllAnimations(): Promise<AnimationRegistry> {
    const animationConfigs = await this.definitionLoader.loadAllAnimations();

    const loadPromises: Promise<void>[] = [];

    for (const [, config] of animationConfigs.entries()) {
      const { objectType, states } = config;

      // Initialize state map for this object type
      if (!this.registry[objectType]) {
        this.registry[objectType] = {};
      }

      // Load all states for this object type
      for (const stateName in states) {
        const stateConfig = states[stateName];

        // Build the full image path using game type
        const imagePath = buildImagePath(this.gameType, stateConfig.sprite);

        const loadPromise = loadImage(imagePath)
          .then((image) => {
            // Generate frames array from frameCount
            const frames: number[] = [];
            for (let i = 0; i < stateConfig.frameCount; i++) {
              frames.push(i);
            }

            const animDef: AnimationDefinition = {
              image,
              frameWidth: stateConfig.frameWidth,
              frameHeight: stateConfig.frameHeight,
              frames,
              frameDuration: stateConfig.frameDuration,
              loop: stateConfig.loop,
              row: stateConfig.row ?? 0,
            };

            this.registry[objectType][stateName] = animDef;
          })
          .catch((error) => {
            console.error(`Failed to load animation image for ${objectType}.${stateName}:`, error);
          });

        loadPromises.push(loadPromise);
      }
    }

    await Promise.all(loadPromises);
    return this.registry;
  }

  /**
   * Get the loaded animation registry
   */
  getRegistry(): AnimationRegistry {
    return this.registry;
  }

  /**
   * Get the game type this loader is configured for
   */
  getGameType(): GameType {
    return this.gameType;
  }

  /**
   * Clear the animation registry
   */
  clearRegistry(): void {
    this.registry = {};
  }
}
