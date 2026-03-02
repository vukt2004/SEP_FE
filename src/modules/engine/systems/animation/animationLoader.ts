import { animationRegistry } from "./animationRegistry";
import type { GameType } from "../../../../shared/types/GameType";
import { AnimationLoader } from "../../assets/loaders/AnimationLoader";

/**
 * Global animation loader instance
 * This will be initialized with the correct game type when the engine starts
 */
let globalAnimationLoader: AnimationLoader | null = null;

/**
 * Initialize the animation system with a specific game type
 * This MUST be called before loadAnimations()
 *
 * @param gameType - The game type to load animations for
 */
export function initializeAnimationSystem(gameType: GameType): void {
  globalAnimationLoader = new AnimationLoader(gameType);
}

/**
 * Load animations for the current game type
 * Must call initializeAnimationSystem() first
 */
export async function loadAnimations(): Promise<void> {
  if (!globalAnimationLoader) {
    throw new Error(
      "Animation system not initialized. Call initializeAnimationSystem(gameType) first.",
    );
  }

  const registry = await globalAnimationLoader.loadAllAnimations();

  // Populate the global animation registry
  Object.assign(animationRegistry, registry);
}

/**
 * Get the current animation loader (for advanced use cases)
 */
export function getAnimationLoader(): AnimationLoader | null {
  return globalAnimationLoader;
}
