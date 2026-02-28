import type { LevelDefinition } from "../../map-system/types";
import type { Player } from "../core/types";
import { animationRegistry } from "../systems/animation/animationRegistry";
import type { AnimationSystem } from "../systems/animation/AnimationSystem";
import type { TileDefinition } from "../../../shared/assets/tilesets";
import { TilesetCache } from "../../../shared/assets/tilesets";
import { TilesetLoader } from "../../../shared/assets/tilesets";

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

  constructor(
    ctx: CanvasRenderingContext2D,
    animationSystem: AnimationSystem,
    debugMode: boolean = true,
  ) {
    this.ctx = ctx;
    this.animationSystem = animationSystem;
    this.debugMode = debugMode;
    this.tilesetCache = new TilesetCache();
    this.tilesetLoader = new TilesetLoader();
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

    // Collect all unique tile IDs from the level
    for (const row of level.layers.background) {
      for (const tileId of row) {
        tileIds.add(tileId);
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
    this.drawTiles(level, tileSize);
    this.drawStartGoalMarkers(level, tileSize);
    this.drawObjects(level, tileSize);
    this.drawPlayer(player, tileSize);
  }

  private drawTiles(level: LevelDefinition, tileSize: number): void {
    const { background } = level.layers;

    if (!this.currentTileset) {
      console.warn("No tileset loaded, skipping tile rendering");
      return;
    }

    for (let row = 0; row < background.length; row++) {
      for (let col = 0; col < background[row].length; col++) {
        const tileId = background[row][col];
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

    // Draw goal position marker
    const goalX = level.goalPosition.col * tileSize;
    const goalY = level.goalPosition.row * tileSize;
    this.ctx.fillStyle = GOAL_MARKER_COLOR;
    this.ctx.globalAlpha = 0.3; // Semi-transparent
    this.ctx.fillRect(goalX, goalY, tileSize, tileSize);
    this.ctx.globalAlpha = 1.0; // Reset alpha
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
        const sy = 0;
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

    if (anim) {
      // Sprite-based rendering
      const frameIndex = this.animationSystem.getCurrentFrame(player.id, player.animationState);
      const frame = anim.frames[frameIndex];
      const sx = frame * anim.frameWidth;
      const sy = 0;

      this.ctx.save();

      // Flip sprite horizontally if facing left
      if (player.direction === "left") {
        this.ctx.translate(pixelX + tileSize, pixelY);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(
          anim.image,
          sx,
          sy,
          anim.frameWidth,
          anim.frameHeight,
          0,
          0,
          tileSize,
          tileSize,
        );
      } else {
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
      }

      this.ctx.restore();
    } else {
      // Fallback: colored square
      this.ctx.fillStyle = PLAYER_COLOR;
      this.ctx.fillRect(pixelX, pixelY, tileSize, tileSize);
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
