import type { GameType } from "../../../../shared/types/GameType";
import { buildDefinitionPath } from "../../../../shared/types/GameType";
import type { TileDefinition } from "../definitions/TileDefinition";
import type { ObjectDefinition } from "../definitions/ObjectDefinition";
import type { AnimationConfig } from "./AnimationLoader";

/**
 * Tileset configuration format
 */
interface TilesetConfig {
  name: string;
  description?: string;
  tiles: {
    [key: string]: TileDefinition;
  };
}

/**
 * Object sprites configuration format
 */
interface ObjectSpritesConfig {
  name: string;
  description?: string;
  objects: {
    [key: string]: ObjectDefinition;
  };
}

/**
 * Generic asset definition loader
 * Dynamically loads JSON definitions based on game type
 *
 * This is the CORE of the multi-game-type system.
 * It abstracts away all path logic and provides a clean API.
 */
export class AssetDefinitionLoader {
  private gameType: GameType;
  private tilesetCache: Map<string, Record<number, TileDefinition>> = new Map();
  private objectsCache: Map<string, Record<string, ObjectDefinition>> = new Map();
  private animationsCache: Map<string, AnimationConfig> = new Map();

  constructor(gameType: GameType) {
    this.gameType = gameType;
  }

  /**
   * Load tileset definition
   * @param tilesetName - Name of the tileset (e.g., "default")
   * @returns Parsed tileset registry
   */
  async loadTileset(tilesetName: string): Promise<Record<number, TileDefinition>> {
    // Check cache
    if (this.tilesetCache.has(tilesetName)) {
      return this.tilesetCache.get(tilesetName)!;
    }

    const definitionPath = buildDefinitionPath(this.gameType, "tilesets", tilesetName);

    try {
      // Use Vite's import.meta.glob with dynamic pattern
      const modules = import.meta.glob<{ default: TilesetConfig }>(
        "/src/shared/assets/*/tilesets/*.json",
        { eager: false },
      );

      const importFn = modules[definitionPath];
      if (!importFn) {
        throw new Error(`Tileset not found: ${tilesetName} for game type: ${this.gameType}`);
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

      this.tilesetCache.set(tilesetName, tileRegistry);
      return tileRegistry;
    } catch (error) {
      throw new Error(
        `Failed to load tileset "${tilesetName}" for game type "${this.gameType}": ${error}`,
      );
    }
  }

  /**
   * Load object definitions
   * @param configName - Name of the config file (e.g., "objects")
   * @returns Parsed object definitions
   */
  async loadObjects(configName: string = "objects"): Promise<Record<string, ObjectDefinition>> {
    // Check cache
    if (this.objectsCache.has(configName)) {
      return this.objectsCache.get(configName)!;
    }

    const definitionPath = buildDefinitionPath(this.gameType, "objects", configName);

    try {
      const modules = import.meta.glob<{ default: ObjectSpritesConfig }>(
        "/src/shared/assets/*/objects/*.json",
        { eager: false },
      );

      const importFn = modules[definitionPath];
      if (!importFn) {
        throw new Error(`Objects config not found: ${configName} for game type: ${this.gameType}`);
      }

      const module = await importFn();
      const config = module.default;

      if (!config || !config.objects) {
        throw new Error(`Invalid objects format: ${configName}`);
      }

      this.objectsCache.set(configName, config.objects);
      return config.objects;
    } catch (error) {
      throw new Error(
        `Failed to load objects "${configName}" for game type "${this.gameType}": ${error}`,
      );
    }
  }

  /**
   * Load all animation definitions for this game type
   * @returns Map of animation configs by file path
   */
  async loadAllAnimations(): Promise<Map<string, AnimationConfig>> {
    try {
      const modules = import.meta.glob<{ default: AnimationConfig }>(
        "/src/shared/assets/*/animations/*.json",
        { eager: false },
      );

      const loadPromises: Promise<void>[] = [];

      for (const path in modules) {
        // Filter by game type
        if (!path.includes(`/assets/${this.gameType}/`)) {
          continue;
        }

        const loadPromise = modules[path]().then((module) => {
          const config = module.default;
          if (config && config.objectType && config.states) {
            this.animationsCache.set(path, config);
          } else {
            console.warn(`Invalid animation config at ${path}`);
          }
        });

        loadPromises.push(loadPromise);
      }

      await Promise.all(loadPromises);
      return this.animationsCache;
    } catch (error) {
      throw new Error(`Failed to load animations for game type "${this.gameType}": ${error}`);
    }
  }

  /**
   * Get the game type this loader is configured for
   */
  getGameType(): GameType {
    return this.gameType;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.tilesetCache.clear();
    this.objectsCache.clear();
    this.animationsCache.clear();
  }
}
