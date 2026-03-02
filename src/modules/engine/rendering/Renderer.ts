import type { LevelDefinition } from "../../map-system/types";
import type { Player } from "../core/types";
import { animationRegistry } from "../systems/animation/animationRegistry";
import type { AnimationSystem } from "../systems/animation/AnimationSystem";
import { type TileDefinition, TilesetCache, TilesetLoader } from "../assets";
import type { GameType } from "../../../shared/types/GameType";

const TILE_COLORS: Record<number, string> = {
  0: "#eeeeee", // Empty
  1: "#444444", // Wall
  2: "#55cc55", // Grass
  3: "#8b6f47", // Terrain block
};

const DEFAULT_TILE_COLOR = "#eeeeee";
const START_MARKER_COLOR = "#55ccff";
const GOAL_MARKER_COLOR = "#22cc55";
const PLAYER_COLOR = "#2255cc";
const GOAL_COLOR = "#22cc55";
const DOOR_OPEN_COLOR = "#d4a574";
const DOOR_CLOSED_COLOR = "#8b4513";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private animationSystem: AnimationSystem;
  private debugMode: boolean = true;
  private tilesetCache: TilesetCache;
  private tilesetLoader: TilesetLoader;
  private currentTileset: Record<number, TileDefinition> | null = null;
  private gameType: GameType;

  /**
   * @param ctx - Canvas rendering context
   * @param animationSystem - Animation system instance
   * @param gameType - Game type for asset loading
   * @param debugMode - Enable debug rendering
   */
  constructor(
    ctx: CanvasRenderingContext2D,
    animationSystem: AnimationSystem,
    gameType: GameType,
    debugMode: boolean = false,
  ) {
    this.ctx = ctx;
    this.animationSystem = animationSystem;
    this.debugMode = debugMode;
    this.gameType = gameType;
    this.tilesetCache = new TilesetCache();
    this.tilesetLoader = new TilesetLoader(gameType);
  }

  /**
   * Preload all tilesets used in the level
   * Should be called before starting rendering
   */
  async preloadTilesets(level: LevelDefinition): Promise<void> {
    // Load tileset definition (defaults to "default" if not specified)
    const tilesetName = level.tileset || "default";
    this.currentTileset = await this.tilesetLoader.loadTilesetDefinition(tilesetName);

    const tileIds = new Set<number>();

    // Collect all unique tile IDs from all layers
    const layers = [level.layers.background, level.layers.ground, level.layers.foreground].filter(
      Boolean,
    ) as number[][][];

    for (const layer of layers) {
      for (const row of layer) {
        for (const tileId of row) {
          if (tileId !== 0) {
            // Skip empty tiles
            tileIds.add(tileId);
          }
        }
      }
    }

    // Load all tilesets for the collected tile IDs
    const loadPromises: Promise<void>[] = [];
    for (const tileId of tileIds) {
      const tileDef = this.currentTileset[tileId];
      if (tileDef) {
        loadPromises.push(
          this.tilesetCache
            .loadTileset(tileDef.imagePath)
            .catch((error) => {
              console.warn(`Failed to load tileset for tile ID ${tileId}:`, error);
            })
            .then(() => {}),
        );
      }
    }

    await Promise.all(loadPromises);
  }

  render(level: LevelDefinition, tileSize: number, player: Player): void {
    // Layer rendering order for proper depth:
    // 1. Background layer (base tiles)
    this.drawLayer(level.layers.background, tileSize);
    // 2. Ground layer (decorations under player)
    if (level.layers.ground) {
      this.drawLayer(level.layers.ground, tileSize);
    }
    // 3. Start/Goal markers
    this.drawStartGoalMarkers(level, tileSize);
    // 4. Objects (coins, etc.)
    this.drawObjects(level, tileSize);
    // 5. Player character
    this.drawPlayer(player, tileSize);
    // 6. Foreground layer (renders ABOVE player for depth effect)
    if (level.layers.foreground) {
      this.drawLayer(level.layers.foreground, tileSize);
    }
  }

  /**
   * Draw a tile layer (background, ground, or foreground)
   * Tile ID 0 is treated as transparent/empty
   */
  private drawLayer(layer: number[][], tileSize: number): void {
    if (!this.currentTileset) {
      console.warn("No tileset loaded, skipping layer rendering");
      return;
    }

    for (let row = 0; row < layer.length; row++) {
      for (let col = 0; col < layer[row].length; col++) {
        const tileId = layer[row][col];

        // Skip empty/transparent tiles (tile ID 0)
        if (tileId === 0) {
          continue;
        }

        const tileDef = this.currentTileset[tileId];

        // Calculate pixel position
        const pixelX = col * tileSize;
        const pixelY = row * tileSize;

        if (tileDef) {
          // Try to get the tileset image from cache
          const tileset = this.tilesetCache.getTileset(tileDef.imagePath);

          if (tileset) {
            // Sprite-based rendering
            const sx = tileDef.tileX * tileDef.tileSize;
            const sy = tileDef.tileY * tileDef.tileSize;

            this.ctx.drawImage(
              tileset,
              sx,
              sy,
              tileDef.tileSize,
              tileDef.tileSize,
              pixelX,
              pixelY,
              tileSize,
              tileSize,
            );
          } else {
            // Fallback to solid color if tileset not loaded
            this.ctx.fillStyle = TILE_COLORS[tileId] ?? DEFAULT_TILE_COLOR;
            this.ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
          }
        } else {
          // Fallback to solid color if tile definition not found
          this.ctx.fillStyle = TILE_COLORS[tileId] ?? DEFAULT_TILE_COLOR;
          this.ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
        }
      }
    }
  }

  /**
   * Draw start and goal position markers
   * These are rendered on top of the background layer
   */
  private drawStartGoalMarkers(level: LevelDefinition, tileSize: number): void {
    // Draw start position marker
    const startX = level.startPosition.col * tileSize;
    const startY = level.startPosition.row * tileSize;
    this.ctx.fillStyle = START_MARKER_COLOR;
    this.ctx.globalAlpha = 0.3; // Semi-transparent
    this.ctx.fillRect(startX, startY, tileSize, tileSize);
    this.ctx.globalAlpha = 1.0; // Reset alpha

    // Draw goal with animation if available
    const goalX = level.goalPosition.col * tileSize;
    const goalY = level.goalPosition.row * tileSize;

    const goalAnimMap = animationRegistry["goal"];
    const goalAnim = goalAnimMap?.["idle"] || goalAnimMap?.["default"];

    if (goalAnim) {
      // Render animated goal
      const goalState = goalAnimMap?.["idle"] ? "idle" : "default";
      const frameIndex = this.animationSystem.getCurrentFrame("goal", goalState);
      const frame = goalAnim.frames[frameIndex];
      const sx = frame * goalAnim.frameWidth;
      const sy = (goalAnim.row ?? 0) * goalAnim.frameHeight;

      this.ctx.drawImage(
        goalAnim.image,
        sx,
        sy,
        goalAnim.frameWidth,
        goalAnim.frameHeight,
        goalX,
        goalY,
        tileSize,
        tileSize,
      );
    } else {
      // Fallback to colored marker
      this.ctx.fillStyle = GOAL_MARKER_COLOR;
      this.ctx.globalAlpha = 0.3; // Semi-transparent
      this.ctx.fillRect(goalX, goalY, tileSize, tileSize);
      this.ctx.globalAlpha = 1.0; // Reset alpha
    }
  }

  private drawObjects(level: LevelDefinition, tileSize: number): void {
    const { objects } = level;

    for (const obj of objects || []) {
      const stateKey = obj.initialState ?? "default";
      const animMap = animationRegistry[obj.type];
      const anim = animMap?.[stateKey];

      // Convert grid position to pixel position
      const pixelX = obj.position.col * tileSize;
      const pixelY = obj.position.row * tileSize;

      if (anim) {
        // Sprite-based rendering
        const frameIndex = this.animationSystem.getCurrentFrame(obj.id, stateKey);
        const frame = anim.frames[frameIndex];
        const sx = frame * anim.frameWidth;
        const sy = (anim.row ?? 0) * anim.frameHeight;
        this.ctx.drawImage(
          anim.image,
          sx,
          sy,
          anim.frameWidth,
          anim.frameHeight,
          pixelX,
          pixelY,
          tileSize,
          tileSize,
        );
      } else {
        // Fallback: colored square
        if (obj.type === "goal") {
          this.ctx.fillStyle = GOAL_COLOR;
        } else if (obj.type === "door") {
          this.ctx.fillStyle = obj.initialState === "open" ? DOOR_OPEN_COLOR : DOOR_CLOSED_COLOR;
        } else {
          this.ctx.fillStyle = "#ff00ff";
        }
        this.ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
      }
    }
  }

  private drawPlayer(player: Player, tileSize: number): void {
    const animMap = animationRegistry["player"];
    const anim = animMap?.[player.animationState];

    // Use interpolated pixel positions for smooth animation
    const pixelX = player.pixelX;
    const pixelY = player.pixelY;

    // Scale topdown player to be 2x larger for better visibility
    const isTopdown = this.gameType === "topdown";
    const scale = isTopdown ? 2.0 : 1.0;
    const renderWidth = tileSize * scale;
    const renderHeight = tileSize * scale;
    // Center the larger sprite on the tile
    const offsetX = isTopdown ? -(tileSize * (scale - 1)) / 2 : 0;
    const offsetY = isTopdown ? -(tileSize * (scale - 1)) / 2 : 0;

    if (anim) {
      // Sprite-based rendering
      const frameIndex = this.animationSystem.getCurrentFrame(player.id, player.animationState);
      const frame = anim.frames[frameIndex];
      const sx = frame * anim.frameWidth;
      const sy = (anim.row ?? 0) * anim.frameHeight;

      this.ctx.save();

      // Only flip for platformer when facing left (topdown has separate left/right sprites)
      const shouldFlip = this.gameType === "platformer" && player.direction === "left";

      if (shouldFlip) {
        this.ctx.translate(pixelX + offsetX + renderWidth, pixelY + offsetY);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(
          anim.image,
          sx,
          sy,
          anim.frameWidth,
          anim.frameHeight,
          0,
          0,
          renderWidth,
          renderHeight,
        );
      } else {
        this.ctx.drawImage(
          anim.image,
          sx,
          sy,
          anim.frameWidth,
          anim.frameHeight,
          pixelX + offsetX,
          pixelY + offsetY,
          renderWidth,
          renderHeight,
        );
      }

      this.ctx.restore();
    } else {
      // Fallback: colored square
      this.ctx.fillStyle = PLAYER_COLOR;
      this.ctx.fillRect(pixelX + offsetX, pixelY + offsetY, renderWidth, renderHeight);
    }

    // Debug: Draw direction arrow
    if (this.debugMode) {
      this.drawDirectionArrow(player, tileSize);
    }
  }

  private drawDirectionArrow(player: Player, tileSize: number): void {
    const centerX = player.x * tileSize + tileSize / 2;
    const centerY = player.y * tileSize + tileSize / 2;
    const arrowSize = tileSize * 0.4;

    this.ctx.fillStyle = "#ffffff";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;

    this.ctx.beginPath();

    // Use player.facing for debug arrow (gameplay direction)
    switch (player.facing) {
      case "right":
        // Tip pointing right
        this.ctx.moveTo(centerX + arrowSize / 2, centerY);
        this.ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize / 3);
        this.ctx.lineTo(centerX - arrowSize / 2, centerY + arrowSize / 3);
        break;
      case "left":
        // Tip pointing left
        this.ctx.moveTo(centerX - arrowSize / 2, centerY);
        this.ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize / 3);
        this.ctx.lineTo(centerX + arrowSize / 2, centerY + arrowSize / 3);
        break;
      case "up":
        // Tip pointing up
        this.ctx.moveTo(centerX, centerY - arrowSize / 2);
        this.ctx.lineTo(centerX - arrowSize / 3, centerY + arrowSize / 2);
        this.ctx.lineTo(centerX + arrowSize / 3, centerY + arrowSize / 2);
        break;
      case "down":
        // Tip pointing down
        this.ctx.moveTo(centerX, centerY + arrowSize / 2);
        this.ctx.lineTo(centerX - arrowSize / 3, centerY - arrowSize / 2);
        this.ctx.lineTo(centerX + arrowSize / 3, centerY - arrowSize / 2);
        break;
    }

    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }
}
