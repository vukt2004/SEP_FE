import type { ObjectDefinition } from "./ObjectDefinition";

/**
 * Object sprites configuration format loaded from JSON
 */
interface ObjectSpritesConfig {
  name: string;
  description?: string;
  objects: {
    [key: string]: ObjectDefinition;
  };
}

/**
 * Object sprite loader
 * Loads object sprite definitions from JSON files and caches them in memory
 * Similar to TilesetLoader but for game objects
 */
export class ObjectSpriteLoader {
  private definitionCache: Map<string, Record<string, ObjectDefinition>> = new Map();
  private loadingPromises: Map<string, Promise<Record<string, ObjectDefinition>>> = new Map();

  /**
   * Load object sprite definitions
   * @param configName - Name of the config file (e.g., "objects")
   * @returns Parsed object sprites registry
   */
  async loadObjectDefinitions(
    configName: string = "objects",
  ): Promise<Record<string, ObjectDefinition>> {
    // Return cached definition if available
    if (this.definitionCache.has(configName)) {
      return this.definitionCache.get(configName)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(configName)) {
      return this.loadingPromises.get(configName)!;
    }

    // Create new loading promise
    const loadingPromise = this.fetchAndParseObjects(configName);
    this.loadingPromises.set(configName, loadingPromise);

    try {
      const objects = await loadingPromise;
      this.definitionCache.set(configName, objects);
      return objects;
    } finally {
      this.loadingPromises.delete(configName);
    }
  }

  /**
   * Fetch and parse an object sprites JSON file
   */
  private async fetchAndParseObjects(
    configName: string,
  ): Promise<Record<string, ObjectDefinition>> {
    const configPath = `/src/shared/assets/objects/${configName}.json`;

    try {
      // Use Vite's import.meta.glob for static imports
      const modules = import.meta.glob<{ default: ObjectSpritesConfig }>(
        "/src/shared/assets/objects/*.json",
        { eager: false },
      );

      const importFn = modules[configPath];
      if (!importFn) {
        throw new Error(`Object sprites config not found: ${configName}`);
      }

      const module = await importFn();
      const config = module.default;

      if (!config || !config.objects) {
        throw new Error(`Invalid object sprites format: ${configName}`);
      }

      return config.objects;
    } catch (error) {
      throw new Error(`Failed to load object sprites "${configName}": ${error}`);
    }
  }

  /**
   * Get a cached object sprites definition if available
   */
  getCachedObjects(configName: string): Record<string, ObjectDefinition> | undefined {
    return this.definitionCache.get(configName);
  }

  /**
   * Clear all cached definitions
   */
  clearCache(): void {
    this.definitionCache.clear();
    this.loadingPromises.clear();
  }
}
