import type { TileDefinition } from "../definitions/TileDefinition";
import type { GameType } from "../../../../shared/types/GameType";
import {
  AssetDefinitionLoader,
  type TieredTilesetGroup,
} from "./AssetDefinitionLoader";
import type { SubscriptionPlan } from "@/lib/auth/subscriptionPlan";

/**
 * Dynamic tileset loader
 * Loads tileset definitions from JSON files based on game type
 *
 * This is a facade over AssetDefinitionLoader for backward compatibility
 * and provides a focused API for tileset loading.
 */
export class TilesetLoader {
  private definitionLoader: AssetDefinitionLoader;

  /**
   * @param gameType - The game type to load assets for
   */
  constructor(gameType: GameType) {
    this.definitionLoader = new AssetDefinitionLoader(gameType);
  }

  /**
   * Load a tileset definition by name
   * @param tilesetName - Name of the tileset (e.g., "default")
   * @returns Parsed tileset registry as Record<number, TileDefinition>
   */
  async loadTilesetDefinition(tilesetName: string): Promise<Record<number, TileDefinition>> {
    return this.definitionLoader.loadTileset(tilesetName);
  }

  async loadTieredTilesetDefinitions(
    tilesetName: string,
    userPlan: SubscriptionPlan,
  ): Promise<TieredTilesetGroup[]> {
    return this.definitionLoader.loadTieredTilesets(tilesetName, userPlan);
  }

  /**
   * Get a cached tileset definition if available
   */
  getCachedTileset(): Record<number, TileDefinition> | undefined {
    // Access cache through definition loader
    // For now, we'll attempt to load synchronously from cache
    return undefined; // Can be enhanced if needed
  }

  /**
   * Clear all cached tileset definitions
   */
  clear(): void {
    this.definitionLoader.clearCache();
  }

  /**
   * Get the game type this loader is configured for
   */
  getGameType(): GameType {
    return this.definitionLoader.getGameType();
  }
}
