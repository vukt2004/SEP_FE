import type { GameType } from "../../../../shared/types/GameType";
import { buildDefinitionPath } from "../../../../shared/types/GameType";
import type { TileDefinition } from "../definitions/TileDefinition";
import type { ObjectDefinition } from "../definitions/ObjectDefinition";
import type { AnimationConfig } from "./AnimationLoader";
import {
  getAllowedTiers,
  isTierLocked,
  type AssetTier,
  type SubscriptionPlan,
} from "@/lib/auth/subscriptionPlan";

const ASSET_TIERS: AssetTier[] = ["basic", "advanced"];

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

export interface TieredTilesetGroup {
  tileset: Record<number, TileDefinition>;
  tier: AssetTier;
  locked: boolean;
}

export interface TieredObjectsGroup {
  objects: Record<string, ObjectDefinition>;
  tier: AssetTier;
  locked: boolean;
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
    const mergedCacheKey = `merged:${tilesetName}`;
    if (this.tilesetCache.has(mergedCacheKey)) {
      return this.tilesetCache.get(mergedCacheKey)!;
    }

    try {
      const tieredGroups = await this.loadTieredTilesets(tilesetName, "creator");
      const mergedTileset: Record<number, TileDefinition> = {};

      for (const group of tieredGroups) {
        Object.assign(mergedTileset, group.tileset);
      }

      if (Object.keys(mergedTileset).length === 0) {
        throw new Error(`Tileset not found: ${tilesetName} for game type: ${this.gameType}`);
      }

      this.tilesetCache.set(mergedCacheKey, mergedTileset);
      return mergedTileset;
    } catch (error) {
      throw new Error(
        `Failed to load tileset "${tilesetName}" for game type "${this.gameType}": ${error}`,
      );
    }
  }

  async loadTieredTilesets(
    tilesetName: string,
    userPlan: SubscriptionPlan,
  ): Promise<TieredTilesetGroup[]> {
    const tieredModules = import.meta.glob<{ default: TilesetConfig }>(
      "/src/shared/assets/*/*/tilesets/*.json",
      { eager: false },
    );
    const legacyModules = import.meta.glob<{ default: TilesetConfig }>(
      "/src/shared/assets/*/tilesets/*.json",
      { eager: false },
    );

    const groups: TieredTilesetGroup[] = [];
    const allowedTiers = getAllowedTiers(userPlan);

    for (const tier of ASSET_TIERS) {
      const tierCacheKey = `${tier}:${tilesetName}`;

      if (!this.tilesetCache.has(tierCacheKey)) {
        const tierPath = buildDefinitionPath(this.gameType, "tilesets", tilesetName, tier);
        const legacyPath = buildDefinitionPath(this.gameType, "tilesets", tilesetName);
        const importFn =
          tieredModules[tierPath] ?? (tier === "basic" ? legacyModules[legacyPath] : undefined);

        if (importFn) {
          const module = await importFn();
          const config = module.default;

          if (!config || !config.tiles) {
            throw new Error(`Invalid tileset format: ${tilesetName}`);
          }

          const tileRegistry: Record<number, TileDefinition> = {};
          for (const [key, tileDef] of Object.entries(config.tiles)) {
            const tileId = parseInt(key, 10);
            if (isNaN(tileId)) {
              console.warn(`Invalid tile ID "${key}" in tileset ${tilesetName}, skipping`);
              continue;
            }
            tileRegistry[tileId] = tileDef;
          }

          this.tilesetCache.set(tierCacheKey, tileRegistry);
        }
      }

      const tierTileset = this.tilesetCache.get(tierCacheKey);
      if (!tierTileset) {
        continue;
      }

      groups.push({
        tileset: tierTileset,
        tier,
        locked: isTierLocked(userPlan, tier) || !allowedTiers.includes(tier),
      });
    }

    if (groups.length === 0) {
      throw new Error(`Tileset not found: ${tilesetName} for game type: ${this.gameType}`);
    }

    return groups;
  }

  /**
   * Load object definitions
   * @param configName - Name of the config file (e.g., "objects")
   * @returns Parsed object definitions
   */
  async loadObjects(configName: string = "objects"): Promise<Record<string, ObjectDefinition>> {
    const mergedCacheKey = `merged:${configName}`;
    if (this.objectsCache.has(mergedCacheKey)) {
      return this.objectsCache.get(mergedCacheKey)!;
    }

    try {
      const tieredGroups = await this.loadTieredObjects(configName, "creator");
      const mergedObjects: Record<string, ObjectDefinition> = {};

      for (const group of tieredGroups) {
        Object.assign(mergedObjects, group.objects);
      }

      if (Object.keys(mergedObjects).length === 0) {
        throw new Error(`Objects config not found: ${configName} for game type: ${this.gameType}`);
      }

      this.objectsCache.set(mergedCacheKey, mergedObjects);
      return mergedObjects;
    } catch (error) {
      throw new Error(
        `Failed to load objects "${configName}" for game type "${this.gameType}": ${error}`,
      );
    }
  }

  async loadTieredObjects(
    configName: string = "objects",
    userPlan: SubscriptionPlan,
  ): Promise<TieredObjectsGroup[]> {
    const tieredModules = import.meta.glob<{ default: ObjectSpritesConfig }>(
      "/src/shared/assets/*/*/objects/*.json",
      { eager: false },
    );
    const legacyModules = import.meta.glob<{ default: ObjectSpritesConfig }>(
      "/src/shared/assets/*/objects/*.json",
      { eager: false },
    );

    const groups: TieredObjectsGroup[] = [];
    const allowedTiers = getAllowedTiers(userPlan);

    for (const tier of ASSET_TIERS) {
      const tierCacheKey = `${tier}:${configName}`;

      if (!this.objectsCache.has(tierCacheKey)) {
        const tierPath = buildDefinitionPath(this.gameType, "objects", configName, tier);
        const legacyPath = buildDefinitionPath(this.gameType, "objects", configName);
        const importFn =
          tieredModules[tierPath] ?? (tier === "basic" ? legacyModules[legacyPath] : undefined);

        if (importFn) {
          const module = await importFn();
          const config = module.default;

          if (!config || !config.objects) {
            throw new Error(`Invalid objects format: ${configName}`);
          }

          this.objectsCache.set(tierCacheKey, config.objects);
        }
      }

      const tierObjects = this.objectsCache.get(tierCacheKey);
      if (!tierObjects) {
        continue;
      }

      groups.push({
        objects: tierObjects,
        tier,
        locked: isTierLocked(userPlan, tier) || !allowedTiers.includes(tier),
      });
    }

    if (groups.length === 0) {
      throw new Error(`Objects config not found: ${configName} for game type: ${this.gameType}`);
    }

    return groups;
  }

  /**
   * Load all animation definitions for this game type
   * @returns Map of animation configs by file path
   */
  async loadAllAnimations(): Promise<Map<string, AnimationConfig>> {
    try {
      const tieredModules = import.meta.glob<{ default: AnimationConfig }>(
        "/src/shared/assets/*/*/animations/*.json",
        { eager: false },
      );
      const legacyModules = import.meta.glob<{ default: AnimationConfig }>(
        "/src/shared/assets/*/animations/*.json",
        { eager: false },
      );
      const modules = {
        ...legacyModules,
        ...tieredModules,
      };

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
