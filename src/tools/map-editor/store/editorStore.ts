import type { MapData } from "../../../shared/types/MapSchema";
import { createEmptyLayer } from "../utils/createEmptyLayer";
import { createEmptyMap } from "../utils/createEmptyMap";

/**
 * Editor Store
 *
 * Manages the state of the map editor without external libraries.
 * Handles map data, active layer selection, and tile editing operations.
 * Supports reactive subscriptions and undo/redo functionality.
 */
export class EditorStore {
  private mapData: MapData;
  private activeLayer: "background" | "collision";
  private selectedTile: number | null;
  private selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null;
  private listeners: Set<() => void>;
  private undoStack: MapData[];
  private redoStack: MapData[];
  private readonly maxHistorySize: number = 50;

  /**
   * Initialize the editor store with a map
   *
   * @param initialMap - The initial map data to edit
   */
  constructor(initialMap: MapData) {
    this.mapData = structuredClone(initialMap);
    this.activeLayer = "background";
    this.selectedTile = null;
    this.selectedTool = null;
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * Get the current map data
   * Returns a deep copy to prevent external mutations
   */
  getState(): MapData {
    return structuredClone(this.mapData);
  }

  /**
   * Get the current active layer
   */
  getActiveLayer(): "background" | "collision" {
    return this.activeLayer;
  }

  /**
   * Get the currently selected tile ID
   */
  getSelectedTile(): number | null {
    return this.selectedTile;
  }

  /**
   * Get the currently selected tool
   */
  getSelectedTool(): "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null {
    return this.selectedTool;
  }

  /**
   * Subscribe to state changes
   *
   * @param listener - Callback function to call when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Undo the last change
   */
  undo(): void {
    if (this.undoStack.length === 0) return;

    this.redoStack.push(structuredClone(this.mapData));
    const previousState = this.undoStack.pop()!;
    this.mapData = previousState;
    this.notify();
  }

  /**
   * Redo the last undone change
   */
  redo(): void {
    if (this.redoStack.length === 0) return;

    this.undoStack.push(structuredClone(this.mapData));
    const nextState = this.redoStack.pop()!;
    this.mapData = nextState;
    this.notify();
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Save current state to history before mutation
   */
  private saveHistory(): void {
    this.undoStack.push(structuredClone(this.mapData));

    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Clear redo stack on new changes
    this.redoStack = [];
  }

  /**
   * Set the active layer for editing
   * When switching to collision layer, auto-select paint tool
   *
   * @param layer - The layer to make active
   */
  setActiveLayer(layer: "background" | "collision"): void {
    this.activeLayer = layer;

    // If switching to collision layer, clear tile selection and object tools
    if (layer === "collision") {
      // Clear any object tools - collision layer only supports binary paint/erase
      const objectTools = ["player", "goal", "coin", "enemy", "fill"];
      if (!this.selectedTool || objectTools.includes(this.selectedTool)) {
        this.selectedTool = "paint"; // Default to paint for collision
      }
      this.selectedTile = null; // Collision doesn't use tile IDs
    }

    this.notify();
  }

  /**
   * Set the selected tile ID
   * Pass null to deselect. Clicking the same tile deselects it.
   *
   * @param tileId - The tile ID to select, or null to deselect
   */
  setSelectedTile(tileId: number | null): void {
    // Toggle if same tile is clicked
    if (this.selectedTile === tileId) {
      this.selectedTile = null;
      this.selectedTool = null;
    } else {
      this.selectedTile = tileId;
      // Auto-select paint tool when selecting a tile
      if (tileId !== null && tileId !== 0) {
        this.selectedTool = "paint";
      } else if (tileId === 0) {
        this.selectedTool = "erase";
      }
    }
    this.notify();
  }

  /**
   * Set the selected tool
   * Pass null to deselect. Clicking the same tool deselects it.
   * Object tools (player, goal, coin, enemy) clear tile selection.
   * Tile tools (paint, erase, fill) require a tile to be selected.
   *
   * @param tool - The tool to select, or null to deselect
   */
  setSelectedTool(
    tool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null,
  ): void {
    // Toggle if same tool is clicked
    if (this.selectedTool === tool) {
      this.selectedTool = null;
      this.selectedTile = null;
    } else {
      const objectTools = ["player", "goal", "coin", "enemy"];
      const tileTools = ["paint", "erase", "fill"];

      if (tool && objectTools.includes(tool)) {
        // Object tool selected - clear tile selection
        this.selectedTool = tool;
        this.selectedTile = null;
      } else if (tool && tileTools.includes(tool)) {
        // Tile tool selected
        this.selectedTool = tool;
        // If no tile selected, default to tile 0 for erase, or prompt user to select
        if (this.selectedTile === null) {
          if (tool === "erase") {
            this.selectedTile = 0;
          }
          // For paint and fill, user needs to select a tile first
        }
      } else {
        this.selectedTool = null;
        this.selectedTile = null;
      }
    }
    this.notify();
  }

  /**
   * Apply the selected tool at the given coordinates
   *
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   */
  applyTool(x: number, y: number): void {
    if (!this.selectedTool) {
      // No tool selected, do nothing
      return;
    }

    // Collision layer only supports paint (1) and erase (0)
    if (this.activeLayer === "collision") {
      if (this.selectedTool === "paint") {
        this.updateTile(x, y, 1); // Collision = solid
      } else if (this.selectedTool === "erase") {
        this.updateTile(x, y, 0); // No collision = empty
      }
      // Ignore other tools on collision layer
      return;
    }

    // Background layer - normal behavior
    if (this.selectedTool === "paint") {
      if (this.selectedTile === null) {
        // No tile selected for painting
        return;
      }
      this.updateTile(x, y, this.selectedTile);
    } else if (this.selectedTool === "erase") {
      this.updateTile(x, y, 0);
    } else if (this.selectedTool === "fill") {
      if (this.selectedTile === null) {
        // No tile selected for filling
        return;
      }
      this.floodFill(x, y);
    } else {
      // Object placement tools
      this.placeObject(x, y);
    }
  }

  /**
   * Flood fill algorithm (4-directional)
   *
   * @param startX - Starting x coordinate
   * @param startY - Starting y coordinate
   */
  private floodFill(startX: number, startY: number): void {
    const { width, height } = this.mapData.config;

    // Validate coordinates
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
      console.warn(`Invalid fill coordinates: (${startX}, ${startY})`);
      return;
    }

    // Ensure a tile is selected
    if (this.selectedTile === null) {
      console.warn("Cannot fill: no tile selected");
      return;
    }

    const layer = this.mapData.layers[this.activeLayer];
    const targetValue = layer[startY][startX];
    const replacementValue = this.selectedTile;

    // If target and replacement are the same, do nothing
    if (targetValue === replacementValue) {
      return;
    }

    // Save history once before fill starts
    this.saveHistory();

    // Use iterative BFS with a queue
    const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
    const visited = new Set<string>();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;

      // Replace the tile
      layer[y][x] = replacementValue;

      // Check all 4 directions (up, down, left, right)
      const directions = [
        { dx: 0, dy: -1 }, // up
        { dx: 0, dy: 1 }, // down
        { dx: -1, dy: 0 }, // left
        { dx: 1, dy: 0 }, // right
      ];

      for (const { dx, dy } of directions) {
        const newX = x + dx;
        const newY = y + dy;
        const key = `${newX},${newY}`;

        // Check bounds
        if (newX < 0 || newX >= width || newY < 0 || newY >= height) {
          continue;
        }

        // Skip if already visited
        if (visited.has(key)) {
          continue;
        }

        // Check if tile matches target value
        if (layer[newY][newX] === targetValue) {
          visited.add(key);
          queue.push({ x: newX, y: newY });
        }
      }
    }

    // Notify once after fill completes
    this.notify();
  }

  /**
   * Place an object at the given coordinates
   *
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   */
  placeObject(x: number, y: number): void {
    const { width, height } = this.mapData.config;

    // Validate coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) {
      console.warn(`Invalid object coordinates: (${x}, ${y})`);
      return;
    }

    this.saveHistory();

    switch (this.selectedTool) {
      case "player":
        // Only one player spawn allowed - replace existing
        this.mapData.objects.playerSpawn = { x, y };
        break;

      case "goal":
        // Only one goal allowed - replace existing
        this.mapData.objects.goal = { x, y };
        break;

      case "coin": {
        // Toggle coin at position
        const coinIndex = this.mapData.objects.coins.findIndex(
          (coin) => coin.x === x && coin.y === y,
        );
        if (coinIndex !== -1) {
          // Remove existing coin
          this.mapData.objects.coins.splice(coinIndex, 1);
        } else {
          // Add new coin
          this.mapData.objects.coins.push({ x, y });
        }
        break;
      }

      case "enemy": {
        // Toggle enemy at position
        const enemyIndex = this.mapData.objects.enemies.findIndex(
          (enemy) => enemy.x === x && enemy.y === y,
        );
        if (enemyIndex !== -1) {
          // Remove existing enemy
          this.mapData.objects.enemies.splice(enemyIndex, 1);
        } else {
          // Add new enemy with default type
          this.mapData.objects.enemies.push({ x, y, type: "slime" });
        }
        break;
      }
    }

    this.notify();
  }

  /**
   * Update a tile in the active layer
   * For collision layer, value is clamped to 0 or 1
   *
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   * @param value - The tile value to set
   */
  updateTile(x: number, y: number, value: number): void {
    const { width, height } = this.mapData.config;

    // Validate coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) {
      console.warn(`Invalid tile coordinates: (${x}, ${y})`);
      return;
    }

    this.saveHistory();

    // For collision layer, ensure binary values (0 or 1)
    let finalValue = value;
    if (this.activeLayer === "collision") {
      finalValue = value > 0 ? 1 : 0;
    }

    // Update the tile in the active layer
    this.mapData.layers[this.activeLayer][y][x] = finalValue;

    this.notify();
  }

  /**
   * Resize the map
   * Regenerates both layers with new dimensions
   *
   * @param width - New width in tiles
   * @param height - New height in tiles
   */
  resize(width: number, height: number): void {
    this.saveHistory();

    // Update config
    this.mapData.config.width = width;
    this.mapData.config.height = height;

    // Regenerate layers
    this.mapData.layers.background = createEmptyLayer(width, height, 0);
    this.mapData.layers.collision = createEmptyLayer(width, height, 0);

    // Clear objects that might be out of bounds
    this.mapData.objects.playerSpawn = null;
    this.mapData.objects.goal = null;
    this.mapData.objects.coins = [];
    this.mapData.objects.enemies = [];

    this.notify();
  }

  /**
   * Reset the map to a new empty map
   *
   * @param type - Map type
   * @param width - Map width in tiles
   * @param height - Map height in tiles
   * @param tileSize - Tile size in pixels
   */
  resetMap(type: "platform" | "topdown", width: number, height: number, tileSize: number): void {
    this.saveHistory();

    this.mapData = createEmptyMap(type, width, height, tileSize);
    this.activeLayer = "background";
    this.selectedTile = 0;
    this.selectedTool = "paint";

    this.notify();
  }

  /**
   * Load a new map into the editor
   *
   * @param mapData - The map data to load
   */
  loadMap(mapData: MapData): void {
    this.saveHistory();

    this.mapData = structuredClone(mapData);
    this.activeLayer = "background";
    this.selectedTile = 0;
    this.selectedTool = "paint";

    this.notify();
  }

  /**
   * Get a tile value at specific coordinates in the active layer
   *
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   * @returns The tile value, or undefined if out of bounds
   */
  getTile(x: number, y: number): number | undefined {
    const { width, height } = this.mapData.config;

    if (x < 0 || x >= width || y < 0 || y >= height) {
      return undefined;
    }

    return this.mapData.layers[this.activeLayer][y][x];
  }
}
