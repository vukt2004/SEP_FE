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
