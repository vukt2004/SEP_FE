/**
 * Object sprite image cache
 * Caches loaded sprite images to avoid redundant network requests
 * Similar to TilesetCache but for object sprites
 */
export class ObjectSpriteCache {
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Load a sprite image by path
   * Returns cached image if already loaded
   * @param imagePath - Path to the sprite image
   * @returns Promise resolving to the loaded image
   */
  async loadSprite(imagePath: string): Promise<HTMLImageElement> {
    // Return cached image if available
    if (this.imageCache.has(imagePath)) {
      return this.imageCache.get(imagePath)!;
    }

    // Return existing loading promise if already loading
    if (this.loadingPromises.has(imagePath)) {
      return this.loadingPromises.get(imagePath)!;
    }

    // Create new loading promise
    const loadingPromise = this.fetchImage(imagePath);
    this.loadingPromises.set(imagePath, loadingPromise);

    try {
      const image = await loadingPromise;
      this.imageCache.set(imagePath, image);
      return image;
    } finally {
      this.loadingPromises.delete(imagePath);
    }
  }

  /**
   * Fetch an image from the network
   */
  private fetchImage(imagePath: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load sprite: ${imagePath}`));
      img.src = imagePath;
    });
  }

  /**
   * Get a cached sprite image if available
   */
  getSprite(imagePath: string): HTMLImageElement | undefined {
    return this.imageCache.get(imagePath);
  }

  /**
   * Check if a sprite is cached
   */
  hasSprite(imagePath: string): boolean {
    return this.imageCache.has(imagePath);
  }

  /**
   * Clear the entire cache
   */
  clearCache(): void {
    this.imageCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get the number of cached sprites
   */
  getCacheSize(): number {
    return this.imageCache.size;
  }
}
