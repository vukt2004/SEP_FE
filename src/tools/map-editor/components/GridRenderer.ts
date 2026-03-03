import type { MapData } from "../../../shared/types/MapSchema";
import type { EditorStore } from "../store/editorStore";
import type { GameType } from "../../../shared/types/GameType";
import {
  TilesetLoader,
  TilesetCache,
  type TileDefinition,
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
} from "../../../modules/engine/assets";

/**
 * Grid renderer with tileset support
 * Handles loading and rendering of actual tile sprites
 */
export class TileRenderer {
  private tilesetLoader: TilesetLoader;
  private tilesetCache: TilesetCache;
  private currentTileset: Record<number, TileDefinition> | null = null;
  private isReady: boolean = false;

  private objectSpriteLoader: ObjectSpriteLoader;
  private objectSpriteCache: ObjectSpriteCache;
  private currentStore: EditorStore | null = null;
  private objectDefinitions: Record<string, ObjectDefinition> | null = null;
  private objectSpritesLoaded: boolean = false;
  private gameType: GameType;

  constructor(gameType: GameType) {
    this.gameType = gameType;
    this.tilesetLoader = new TilesetLoader(gameType);
    this.tilesetCache = new TilesetCache();
    this.objectSpriteLoader = new ObjectSpriteLoader(gameType);
    this.objectSpriteCache = new ObjectSpriteCache();
    this.loadObjectSprites();
  }

  /**
   * Load sprite assets for objects
   */
  private async loadObjectSprites(): Promise<void> {
    try {
      // Load object definitions from JSON
      this.objectDefinitions = await this.objectSpriteLoader.loadObjectDefinitions("objects");

      // Preload all object sprite images
      const imagePathsSet = new Set<string>();
      for (const objDef of Object.values(this.objectDefinitions)) {
        imagePathsSet.add(objDef.imagePath);
      }

      await Promise.all(
        Array.from(imagePathsSet).map((path) => this.objectSpriteCache.loadSprite(path)),
      );

      this.objectSpritesLoaded = true;
    } catch (error) {
      console.error("Failed to load object sprites:", error);
      this.objectSpritesLoaded = false;
    }
  }

  /**
   * Load a tileset by name
   * Should be called before rendering
   */
  async loadTileset(tilesetName: string = "default"): Promise<void> {
    try {
      // Load tileset definition
      this.currentTileset = await this.tilesetLoader.loadTilesetDefinition(tilesetName);

      // Preload all tileset images
      const imagePathsSet = new Set<string>();
      for (const tileDef of Object.values(this.currentTileset)) {
        imagePathsSet.add(tileDef.imagePath);
      }

      await Promise.all(
        Array.from(imagePathsSet).map((path) => this.tilesetCache.loadTileset(path)),
      );

      this.isReady = true;

      // Also ensure objects are loaded
      if (!this.objectSpritesLoaded) {
        await this.loadObjectSprites();
      }
    } catch (error) {
      console.error(`Failed to load tileset: ${error}`);
      this.isReady = false;
    }
  }

  /**
   * Render the grid on a canvas
   * Renders all layers in correct order, respecting visibility
   */
  render(
    ctx: CanvasRenderingContext2D,
    mapData: MapData,
    activeLayer: "background" | "ground" | "foreground" | "collision",
    store: EditorStore,
  ): void {
    const { width, height, tileSize } = mapData.config;

    // Clear canvas
    ctx.clearRect(0, 0, width * tileSize, height * tileSize);

    // Store reference for highlight method
    this.currentStore = store;

    // Define render order for layers
    const renderOrder: Array<"background" | "ground" | "foreground" | "collision"> = [
      "background",
      "ground",
      "foreground",
      "collision",
    ];

    // Render layers in order, checking visibility
    for (const layer of renderOrder) {
      // Always render the active layer, regardless of visibility setting
      const shouldRender = layer === activeLayer || store.isLayerVisible(layer);

      if (!shouldRender) {
        continue; // Skip invisible non-active layers
      }

      if (layer === "collision") {
        // Special rendering for collision layer
        this.renderCollisionLayer(ctx, mapData);
      } else {
        // Render tile layer
        this.renderLayer(ctx, mapData, layer, tileSize);

        // Render objects after ground layer (objects sit on ground, before foreground)
        if (layer === "ground") {
          this.renderObjects(ctx, mapData);
        }
      }
    }

    // Highlight active layer with a subtle overlay on non-active tiles
    if (activeLayer !== "collision" && this.currentStore) {
      this.highlightActiveLayer(ctx, mapData, activeLayer, this.currentStore);
    }

    // Draw grid lines (always visible)
    this.renderGridLines(ctx, width, height, tileSize);
  }

  /**
   * Render a specific layer
   */
  private renderLayer(
    ctx: CanvasRenderingContext2D,
    mapData: MapData,
    layerName: "background" | "ground" | "foreground",
    tileSize: number,
  ): void {
    const { width, height } = mapData.config;
    const layer = mapData.layers[layerName];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileId = layer[y][x];

        // Skip empty tiles
        if (tileId === 0) {
          continue;
        }

        // If tileset is ready and tile definition exists, render sprite
        if (this.isReady && this.currentTileset && this.currentTileset[tileId]) {
          this.renderTileSprite(ctx, x, y, tileId, tileSize);
        } else {
          // Fallback to colored rectangles
          this.renderTileFallback(ctx, x, y, tileId, tileSize);
        }
      }
    }
  }

  /**
   * Highlight the active layer by dimming other layers
   */
  private highlightActiveLayer(
    ctx: CanvasRenderingContext2D,
    mapData: MapData,
    activeLayer: "background" | "ground" | "foreground",
    store: EditorStore,
  ): void {
    const { width, height } = mapData.config;
    const tileSize = mapData.config.tileSize;

    // Apply a subtle dim overlay to non-active layers
    const layers: ("background" | "ground" | "foreground")[] = [
      "background",
      "ground",
      "foreground",
    ];

    for (const layerName of layers) {
      if (layerName === activeLayer) continue;

      // Skip invisible layers - don't dim them
      if (!store.isLayerVisible(layerName)) continue;

      const layer = mapData.layers[layerName];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const tileId = layer[y][x];

          // Only dim tiles that exist
          if (tileId !== 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
          }
        }
      }
    }
  }

  /**
   * Render collision layer with clear visual indicators
   */
  private renderCollisionLayer(ctx: CanvasRenderingContext2D, mapData: MapData): void {
    const { width, height, tileSize } = mapData.config;
    const layer = mapData.layers.collision;

    // Draw background checkerboard
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const isCheckerDark = (x + y) % 2 === 0;
        ctx.fillStyle = isCheckerDark ? "#f5f5f5" : "#ffffff";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    // Draw collision tiles (solid = 1, empty = 0)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = layer[y][x];

        if (value === 1) {
          // Solid collision - red with pattern
          ctx.fillStyle = "rgba(255, 0, 0, 0.4)";
          ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);

          // Add diagonal lines pattern
          // ctx.strokeStyle = "rgba(200, 0, 0, 0.6)";
          // ctx.lineWidth = 2;
          // ctx.beginPath();
          // ctx.moveTo(x * tileSize, y * tileSize);
          // ctx.lineTo((x + 1) * tileSize, (y + 1) * tileSize);
          // ctx.moveTo((x + 1) * tileSize, y * tileSize);
          // ctx.lineTo(x * tileSize, (y + 1) * tileSize);
          // ctx.stroke();
        }
      }
    }
  }

  /**
   * Render a tile using its sprite from the tileset
   */
  private renderTileSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileId: number,
    tileSize: number,
  ): void {
    if (!this.currentTileset) return;

    const tileDef = this.currentTileset[tileId];
    if (!tileDef) return;

    const image = this.tilesetCache.getTileset(tileDef.imagePath);
    if (!image) return;

    // Calculate source position in the tileset image
    const sx = tileDef.tileX * tileDef.tileSize;
    const sy = tileDef.tileY * tileDef.tileSize;

    // Draw the tile sprite, scaling to match editor's tileSize
    ctx.drawImage(
      image,
      sx,
      sy,
      tileDef.tileSize,
      tileDef.tileSize, // Source rect
      x * tileSize,
      y * tileSize,
      tileSize,
      tileSize, // Dest rect
    );
  }

  /**
   * Render a tile using fallback colored rectangle
   */
  private renderTileFallback(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tileId: number,
    tileSize: number,
  ): void {
    const TILE_COLORS: Record<number, string> = {
      1: "#808080", // Gray - basic platform
      2: "#00FF00", // Green - special tile
      3: "#FF0000", // Red - danger/lava
    };

    const color = TILE_COLORS[tileId] ?? "#FFFF00"; // Yellow for unknown tiles

    ctx.fillStyle = color;
    ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
  }

  /**
   * Render grid lines
   */
  private renderGridLines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    tileSize: number,
  ): void {
    ctx.strokeStyle = "#CCCCCC";
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, height * tileSize);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(width * tileSize, y * tileSize);
      ctx.stroke();
    }
  }

  /**
   * Render objects on the map
   */
  private renderObjects(ctx: CanvasRenderingContext2D, mapData: MapData): void {
    const { tileSize } = mapData.config;
    const { objects } = mapData;

    // Draw player spawn
    if (objects.playerSpawn) {
      this.renderObject(ctx, "player", objects.playerSpawn.x, objects.playerSpawn.y, tileSize);
    }

    // Draw goal
    if (objects.goal) {
      this.renderObject(ctx, "goal", objects.goal.x, objects.goal.y, tileSize);
    }

    // Draw fruits
    objects.fruits.forEach((fruit) => {
      this.renderObject(ctx, "fruit", fruit.x, fruit.y, tileSize);
    });

    // Draw enemies
    objects.enemies.forEach((enemy) => {
      this.renderObject(ctx, "enemy", enemy.x, enemy.y, tileSize);
    });
  }

  /**
   * Render a single object using its sprite definition
   */
  private renderObject(
    ctx: CanvasRenderingContext2D,
    objectType: string,
    x: number,
    y: number,
    tileSize: number,
  ): void {
    if (!this.objectDefinitions || !this.objectSpritesLoaded) {
      this.renderObjectFallback(ctx, objectType, x, y, tileSize);
      return;
    }

    const objDef = this.objectDefinitions[objectType];
    if (!objDef) {
      this.renderObjectFallback(ctx, objectType, x, y, tileSize);
      return;
    }

    const sprite = this.objectSpriteCache.getSprite(objDef.imagePath);
    if (!sprite) {
      this.renderObjectFallback(ctx, objectType, x, y, tileSize);
      return;
    }

    // Calculate source position (frame from sprite sheet)
    const sx = objDef.frameIndex * objDef.frameWidth;
    const sy = 0; // Assuming horizontal sprite sheets

    // Draw the sprite scaled to tile size
    ctx.drawImage(
      sprite,
      sx,
      sy,
      objDef.frameWidth,
      objDef.frameHeight,
      x * tileSize,
      y * tileSize,
      tileSize,
      tileSize,
    );
  }

  /**
   * Render object fallback (colored shapes with letters)
   */
  private renderObjectFallback(
    ctx: CanvasRenderingContext2D,
    objectType: string,
    x: number,
    y: number,
    tileSize: number,
  ): void {
    const fallbacks: Record<
      string,
      { color: string; text: string; textColor: string; shape: "rect" | "circle" }
    > = {
      player: { color: "#0066FF", text: "P", textColor: "#FFFFFF", shape: "rect" },
      goal: { color: "#FFD700", text: "G", textColor: "#000000", shape: "rect" },
      fruit: { color: "#FF6347", text: "F", textColor: "#FFFFFF", shape: "circle" },
      enemy: { color: "#9932CC", text: "E", textColor: "#FFFFFF", shape: "rect" },
    };

    const fallback = fallbacks[objectType] || {
      color: "#888888",
      text: "?",
      textColor: "#FFFFFF",
      shape: "rect",
    };

    if (fallback.shape === "circle") {
      ctx.fillStyle = fallback.color;
      ctx.beginPath();
      ctx.arc(
        x * tileSize + tileSize / 2,
        y * tileSize + tileSize / 2,
        tileSize / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.strokeStyle = "#FFA500";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = fallback.color;
      ctx.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }

    // Add text
    ctx.fillStyle = fallback.textColor;
    ctx.font = `bold ${Math.floor(tileSize * 0.6)}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(fallback.text, x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
  }
}
