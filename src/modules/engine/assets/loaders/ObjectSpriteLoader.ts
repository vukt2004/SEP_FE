import type { ObjectDefinition } from "../definitions/ObjectDefinition";
import type { GameType } from "../../../../shared/types/GameType";
import { AssetDefinitionLoader } from "./AssetDefinitionLoader";

/**
 * Object sprite loader
 * Loads object sprite definitions from JSON files based on game type
 *
 * This is a facade over AssetDefinitionLoader for backward compatibility
 * and provides a focused API for object sprite loading.
 */
export class ObjectSpriteLoader {
  private definitionLoader: AssetDefinitionLoader;

  /**
   * @param gameType - The game type to load assets for
   */
  constructor(gameType: GameType) {
    this.definitionLoader = new AssetDefinitionLoader(gameType);
  }

  /**
   * Load object sprite definitions
   * @param configName - Name of the config file (e.g., "objects")
   * @returns Parsed object sprites registry
   */
  async loadObjectDefinitions(
    configName: string = "objects",
  ): Promise<Record<string, ObjectDefinition>> {
    return this.definitionLoader.loadObjects(configName);
  }

  /**
   * Get a cached object sprites definition if available
   */
  getCachedObjects(): Record<string, ObjectDefinition> | undefined {
    // Can be enhanced if needed
    return undefined;
  }

  /**
   * Clear all cached definitions
   */
  clearCache(): void {
    this.definitionLoader.clearCache();
  }

  /**
   * Get the game type this loader is configured for
   */
  getGameType(): GameType {
    return this.definitionLoader.getGameType();
  }
}
