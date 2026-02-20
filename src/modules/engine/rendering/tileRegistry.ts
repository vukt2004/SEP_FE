/**
 * Tile definition for sprite-based tile rendering
 * Defines the location of a tile in a tileset image
 */
export interface TileDefinition {
  /** Path to the tileset image */
  imagePath: string;
  /** X position in the tileset (in tiles, not pixels) */
  tileX: number;
  /** Y position in the tileset (in tiles, not pixels) */
  tileY: number;
  /** Width of a single tile in pixels */
  tileSize: number;
}

/**
 * Registry of tile definitions mapped by numeric tile ID
 * Used to render background tiles from sprite sheets
 *
 * Tile ID Mapping:
 * 0 = Empty/Sky
 * 1 = Wall/Stone
 * 2 = Grass
 * 3 = Terrain Block
 */
export const tileRegistry: Record<number, TileDefinition> = {
  // 0: Empty/floor tiles - using blue background pattern
  0: {
    imagePath: "/assets/Pixel Adventure 1/Background/Blue.png",
    tileX: 0,
    tileY: 0,
    tileSize: 64,
  },

  // 1: Wall/terrain tiles - using brown terrain tileset
  1: {
    imagePath: "/assets/Pixel Adventure 1/Terrain/Terrain (16x16).png",
    tileX: 1, // Second tile in the tileset (stone block)
    tileY: 0,
    tileSize: 16,
  },

  // 2: Grass tile - using green background
  2: {
    imagePath: "/assets/Pixel Adventure 1/Background/Green.png",
    tileX: 0,
    tileY: 0,
    tileSize: 64,
  },

  // 3: Platform/terrain block - brown ground block
  3: {
    imagePath: "/assets/Pixel Adventure 1/Terrain/Terrain (16x16).png",
    tileX: 0,
    tileY: 0,
    tileSize: 16,
  },
};

/**
 * Cache for loaded tileset images
 * Prevents reloading the same image multiple times
 */
export class TilesetCache {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Load a tileset image and cache it
   * Returns cached version if already loaded
   */
  async loadTileset(imagePath: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.cache.has(imagePath)) {
      return this.cache.get(imagePath)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(imagePath)) {
      return this.loadingPromises.get(imagePath)!;
    }

    // Create new loading promise
    const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(imagePath, img);
        this.loadingPromises.delete(imagePath);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(imagePath);
        reject(new Error(`Failed to load tileset: ${imagePath}`));
      };
      img.src = imagePath;
    });

    this.loadingPromises.set(imagePath, loadingPromise);
    return loadingPromise;
  }

  /**
   * Get a cached tileset if available
   */
  getTileset(imagePath: string): HTMLImageElement | undefined {
    return this.cache.get(imagePath);
  }

  /**
   * Clear all cached tilesets
   */
  clear(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }
}
