/**
 * Core Game Type Definition
 * Defines the available game types in the system
 * Extendable for future game types without code changes
 */
export type GameType = "topdown" | "platformer";

/**
 * Asset category types
 */
export type AssetCategory = "animations" | "objects" | "tilesets";

/**
 * Asset path configuration
 */
export interface AssetPaths {
  /** Base path for asset definitions (JSON files) */
  definitionsBasePath: string;
  /** Base path for asset images */
  imagesBasePath: string;
}

/**
 * Get asset paths for a specific game type
 * This is the ONLY place where folder structure is defined
 *
 * @param gameType - The game type
 * @returns Asset paths configuration
 */
export function getAssetPaths(gameType: GameType): AssetPaths {
  return {
    definitionsBasePath: `/src/shared/assets/${gameType}`,
    imagesBasePath: `/assets/${gameType}`,
  };
}

/**
 * Build definition path for a specific asset
 *
 * @param gameType - The game type
 * @param category - Asset category (animations, objects, tilesets)
 * @param name - Asset name without extension
 * @returns Full path to the definition file
 */
export function buildDefinitionPath(
  gameType: GameType,
  category: AssetCategory,
  name: string,
): string {
  const paths = getAssetPaths(gameType);
  return `${paths.definitionsBasePath}/${category}/${name}.json`;
}

/**
 * Build image path for a specific asset
 *
 * @param gameType - The game type
 * @param relativePath - Relative path from the game type's asset folder
 * @returns Full path to the image
 */
export function buildImagePath(gameType: GameType, relativePath: string): string {
  const paths = getAssetPaths(gameType);
  // Remove leading slash if present to avoid double slashes
  const cleanPath = relativePath.startsWith("/") ? relativePath.slice(1) : relativePath;
  return `${paths.imagesBasePath}/${cleanPath}`;
}
