import type { TileDefinition } from "./tileRegistry";

/**
 * Tileset configuration format loaded from JSON
 */
interface TilesetConfig {
  name: string;
  description?: string;
  tiles: {
    [key: string]: TileDefinition;
  };
}

/**
 * Dynamic tileset loader
 * Loads tileset definitions from JSON files and caches them in memory
 */
export class TilesetLoader {
  private definitionCache: Map<string, Record<number, TileDefinition>> = new Map();
  private loadingPromises: Map<string, Promise<Record<number, TileDefinition>>> = new Map();

  /**
   * Load a tileset definition by name
   * @param tilesetName - Name of the tileset (e.g., "default")
   * @returns Parsed tileset registry as Record<number, TileDefinition>
   */
  async loadTilesetDefinition(tilesetName: string): Promise<Record<number, TileDefinition>> {
    // Return cached definition if available
    if (this.definitionCache.has(tilesetName)) {
      return this.definitionCache.get(tilesetName)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(tilesetName)) {
      return this.loadingPromises.get(tilesetName)!;
    }

    // Create new loading promise
    const loadingPromise = this.fetchAndParseTileset(tilesetName);
    this.loadingPromises.set(tilesetName, loadingPromise);

    try {
      const tileset = await loadingPromise;
      this.definitionCache.set(tilesetName, tileset);
      return tileset;
    } finally {
      this.loadingPromises.delete(tilesetName);
    }
  }

  /**
   * Fetch and parse a tileset JSON file
   */
  private async fetchAndParseTileset(tilesetName: string): Promise<Record<number, TileDefinition>> {
    const tilesetPath = `/src/shared/assets/tilesets/${tilesetName}.json`;

    try {
      // Use Vite's import.meta.glob for static imports
      const modules = import.meta.glob<{ default: TilesetConfig }>(
        "/src/shared/assets/tilesets/*.json",
        { eager: false },
      );

      const importFn = modules[tilesetPath];
      if (!importFn) {
        throw new Error(`Tileset not found: ${tilesetName}`);
      }

      const module = await importFn();
      const config = module.default;

      if (!config || !config.tiles) {
        throw new Error(`Invalid tileset format: ${tilesetName}`);
      }

      // Convert string keys to numbers
      const tileRegistry: Record<number, TileDefinition> = {};
      for (const [key, tileDef] of Object.entries(config.tiles)) {
        const tileId = parseInt(key, 10);
        if (isNaN(tileId)) {
          console.warn(`Invalid tile ID "${key}" in tileset ${tilesetName}, skipping`);
          continue;
        }
        tileRegistry[tileId] = tileDef;
      }

      return tileRegistry;
    } catch (error) {
      throw new Error(`Failed to load tileset "${tilesetName}": ${error}`);
    }
  }

  /**
   * Get a cached tileset definition if available
   */
  getCachedTileset(tilesetName: string): Record<number, TileDefinition> | undefined {
    return this.definitionCache.get(tilesetName);
  }

  /**
   * Clear all cached tileset definitions
   */
  clear(): void {
    this.definitionCache.clear();
    this.loadingPromises.clear();
  }
}
