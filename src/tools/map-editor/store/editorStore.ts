import type { MapData } from "../../../shared/types/MapSchema";
import blocksConfig from "../../../shared/block/blocks-config.json";
import { createEmptyLayer } from "../utils/createEmptyLayer";
import { createEmptyMap } from "../utils/createEmptyMap";

/**
 * Layer type definition
 */
type LayerType = "background" | "ground" | "foreground" | "collision";

/**
 * Portal color type
 */
type PortalColor = "blue" | "green" | "orange" | "purple";

/**
 * Editor Store
 *
 * Manages the state of the map editor without external libraries.
 * Handles map data, active layer selection, and tile editing operations.
 * Supports reactive subscriptions and undo/redo functionality.
 */
export class EditorStore {
  private mapData: MapData;
  private activeLayer: LayerType;
  private selectedTile: number | null;
  private selectedObjectId: number | null; // Numeric object ID from objects.json
  private selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | null;
  private selectedPortalColor: PortalColor = "blue"; // Current portal color selection
  private layerVisibility: Record<LayerType, boolean>;
  private listeners: Set<() => void>;
  private undoStack: MapData[];
  private redoStack: MapData[];
  private readonly maxHistorySize: number = 50;
  private objectDefinitions: Record<
    string,
    import("../../../modules/engine/assets/definitions/ObjectDefinition").ObjectDefinition
  > | null = null;

  private getDefaultObjectMetadata(type: string): Record<string, unknown> | undefined {
    if (type === "door") {
      return {
        isOpen: false,
        isLocked: false,
        unlockCode: "",
      };
    }

    if (type === "box1") {
      return { hardness: 1 };
    }

    if (type === "box2") {
      return { hardness: 2 };
    }

    if (type === "box3" || type === "box") {
      return { hardness: 3 };
    }

    return undefined;
  }

  /**
   * Initialize the editor store with a map
   *
   * @param initialMap - The initial map data to edit
   */
  constructor(initialMap: MapData) {
    this.mapData = structuredClone(initialMap);
    this.activeLayer = "background";
    this.selectedTile = null;
    this.selectedObjectId = null;
    this.selectedTool = null;
    this.layerVisibility = {
      background: true,
      ground: true,
      foreground: true,
      collision: false,
    };
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
  }

  setObjectDefinitions(
    defs: Record<
      string,
      import("../../../modules/engine/assets/definitions/ObjectDefinition").ObjectDefinition
    >,
  ): void {
    this.objectDefinitions = defs;
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
  getActiveLayer(): LayerType {
    return this.activeLayer;
  }

  /**
   * Get the currently selected tile ID
   */
  getSelectedTile(): number | null {
    return this.selectedTile;
  }

  /**
   * Get the currently selected object ID
   */
  getSelectedObjectId(): number | null {
    return this.selectedObjectId;
  }

  /**
   * Get the currently selected tool
   */
  getSelectedTool(): "paint" | "erase" | "fill" | "player" | "goal" | null {
    return this.selectedTool;
  }

  /**
   * Get the currently selected portal color
   */
  getSelectedPortalColor(): PortalColor {
    return this.selectedPortalColor;
  }

  /**
   * Set the selected portal color
   *
   * @param color - The portal color to select
   */
  setSelectedPortalColor(color: PortalColor): void {
    this.selectedPortalColor = color;
    this.notify();
  }

  /**
   * Get available portal colors (colors that can still have more portals placed)
   * Returns colors that have less than 2 portals
   */
  getAvailablePortalColors(): PortalColor[] {
    const colorCounts: Record<PortalColor, number> = {
      blue: 0,
      green: 0,
      orange: 0,
      purple: 0,
    };

    this.mapData.objects.items?.forEach((item) => {
      if (item.type === "portal") {
        const color = (item.metadata?.color as PortalColor) || "blue";
        colorCounts[color]++;
      }
    });

    return Object.entries(colorCounts)
      .filter(([, count]) => count < 2)
      .map(([color]) => color as PortalColor);
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
   * Automatically makes the layer visible
   *
   * @param layer - The layer to make active
   */
  setActiveLayer(layer: LayerType): void {
    this.activeLayer = layer;
    // Automatically make the active layer visible
    this.layerVisibility[layer] = true;

    // If switching to collision layer, clear tile/object selections and auto-select paint
    if (layer === "collision") {
      this.selectedTile = null; // Clear tile selection
      this.selectedObjectId = null; // Clear object selection
      // Auto-select paint tool for collision drawing
      if (this.selectedTool === null) {
        this.selectedTool = "paint";
      }
    }

    this.notify();
  }

  /**
   * Set the selected tile ID
   *
   * @param tileId - The tile ID to select (or null to deselect)
   */
  setSelectedTile(tileId: number | null): void {
    this.selectedTile = tileId;

    // If selecting a tile, deselect objects and auto-select paint (mutual exclusion)
    if (tileId !== null) {
      this.selectedObjectId = null;
      if (this.selectedTool === null) {
        // Auto-select paint tool when selecting a tile
        this.selectedTool = "paint";
      }
    }

    this.notify();
  }

  /**
   * Set the selected object ID
   *
   * @param objectId - The object ID to select (or null to deselect)
   */
  setSelectedObjectId(objectId: number | null): void {
    this.selectedObjectId = objectId;

    // If selecting an object, deselect tiles and auto-select paint (mutual exclusion)
    if (objectId !== null) {
      this.selectedTile = null;
      if (this.selectedTool === null) {
        // Auto-select paint tool when selecting an object
        this.selectedTool = "paint";
      }
    }

    this.notify();
  }

  /**
   * Set the selected tool
   *
   * @param tool - The tool to select (or null to deselect)
   */
  setSelectedTool(tool: "paint" | "erase" | "fill" | "player" | "goal" | null): void {
    this.selectedTool = tool;
    this.notify();
  }

  /**
   * Set the visibility of a specific layer
   * This does NOT affect undo/redo or MapData
   *
   * @param layer - The layer to set visibility for
   * @param visible - Whether the layer should be visible
   */
  setLayerVisibility(layer: LayerType, visible: boolean): void {
    this.layerVisibility[layer] = visible;
    this.notify();
  }

  /**
   * Toggle the visibility of a specific layer
   * This does NOT affect undo/redo or MapData
   *
   * @param layer - The layer to toggle
   */
  toggleLayerVisibility(layer: LayerType): void {
    this.layerVisibility[layer] = !this.layerVisibility[layer];
    this.notify();
  }

  /**
   * Check if a specific layer is visible
   *
   * @param layer - The layer to check
   * @returns True if the layer is visible
   */
  isLayerVisible(layer: LayerType): boolean {
    return this.layerVisibility[layer];
  }

  /**
   * Get the visibility state of all layers
   *
   * @returns A copy of the layer visibility record
   */
  getLayerVisibility(): Record<LayerType, boolean> {
    return { ...this.layerVisibility };
  }

  /**
   * Apply the selected tool at the given coordinates
   *
   * @param x - Tile x coordinate
   * @param y - Tile y coordinate
   */
  applyTool(x: number, y: number): void {
    // Priority 1: If an object is selected, place it (regardless of tool)
    if (this.selectedObjectId !== null) {
      this.placeObject(x, y);
      return;
    }

    // Priority 2: If a tile is selected but no tool, auto-paint
    if (this.selectedTool === null && this.selectedTile !== null) {
      this.updateTile(x, y, this.selectedTile);
      return;
    }

    // Do nothing if no tool is selected and nothing to place
    if (this.selectedTool === null) {
      return;
    }

    // Apply the selected tool
    if (this.selectedTool === "paint") {
      // Paint with selected tile, or with 1 for collision layer
      if (this.selectedTile !== null) {
        this.updateTile(x, y, this.selectedTile);
      } else if (this.activeLayer === "collision") {
        // Allow painting collision even without tile selected
        this.updateTile(x, y, 1);
      }
    } else if (this.selectedTool === "erase") {
      this.updateTile(x, y, 0);
    } else if (this.selectedTool === "fill") {
      this.floodFill(x, y);
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

    // Determine replacement value: use selected tile, or 1 for collision layer
    let replacementValue: number;
    if (this.selectedTile !== null) {
      replacementValue = this.selectedTile;
    } else if (this.activeLayer === "collision") {
      replacementValue = 1;
    } else {
      console.warn("Cannot fill: no tile selected");
      return;
    }

    const layer = this.mapData.layers[this.activeLayer];
    const targetValue = layer[startY][startX];

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
   * Handles both reserved objects (1-4) and decorative objects (5+)
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

    if (!this.selectedObjectId) {
      return;
    }

    this.saveHistory();

    const objectId = this.selectedObjectId;
    let objectType = "unknown";

    // Map hardcoded IDs back to string types (or use objectDefinitions if available)
    if (this.objectDefinitions && this.objectDefinitions[objectId]) {
      objectType = this.objectDefinitions[objectId].name;
    } else {
      // Fallbacks if definitions aren't loaded somehow
      if (objectId === 1) objectType = "player";
      else if (objectId === 2) objectType = "goal";
      else if (objectId === 3) objectType = "fruit";
      else if (objectId === 15) objectType = "portal"; // Portal object
      else objectType = "decorative";
    }

    // Logic for unique items (player, goal)
    if (objectId === 1 || objectId === 2) {
      // Remove any existing player/goal
      this.mapData.objects.items = this.mapData.objects.items.filter(
        (item) => item.id !== objectId,
      );
      // Place the new one
      const metadata = this.getDefaultObjectMetadata(objectType);
      this.mapData.objects.items.push({
        id: objectId,
        type: objectType,
        x,
        y,
        ...(metadata ? { metadata } : {}),
      });
    } else {
      // For multiple-placement items (fruits, enemies, decorative, portals)
      // Toggle at position
      const existingIndex = this.mapData.objects.items.findIndex(
        (obj) => obj.x === x && obj.y === y && obj.id === objectId,
      );
      if (existingIndex !== -1) {
        // Remove existing object
        this.mapData.objects.items.splice(existingIndex, 1);
      } else {
        // For portals, check if we can place another
        if (objectType === "portal") {
          const portalCountForColor = this.mapData.objects.items.filter(
            (obj) => obj.type === "portal" && (obj.metadata?.color as PortalColor) === this.selectedPortalColor,
          ).length;

          if (portalCountForColor >= 2) {
            console.warn(
              `Cannot place more portals of color ${this.selectedPortalColor} (max 2 per color)`,
            );
            this.undoStack.pop(); // Remove the saveHistory call since we're not making changes
            return;
          }
          // Add new portal with color metadata
          this.mapData.objects.items.push({
            id: objectId,
            type: objectType,
            x,
            y,
            metadata: { color: this.selectedPortalColor },
          });
        } else {
          // Add new object
          const metadata = this.getDefaultObjectMetadata(objectType);
          this.mapData.objects.items.push({
            id: objectId,
            type: objectType,
            x,
            y,
            ...(metadata ? { metadata } : {}),
          });
        }
      }
    }

    this.notify();
  }

  /**
   * Update metadata for a placed object by its index in objects.items
   */
  updateObjectMetadataByIndex(index: number, metadata: Record<string, unknown>): void {
    if (index < 0 || index >= this.mapData.objects.items.length) {
      return;
    }

    this.saveHistory();
    const target = this.mapData.objects.items[index];
    target.metadata = { ...metadata };
    this.notify();
  }

  /**
   * Update a tile in the active layer
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

    // Update the tile in the active layer
    this.mapData.layers[this.activeLayer][y][x] = value;

    this.notify();
  }

  /**
   * Resize the map
   * Regenerates all layers with new dimensions
   *
   * @param width - New width in tiles
   * @param height - New height in tiles
   */
  resize(width: number, height: number, tileSize?: number): void {
    this.saveHistory();

    // Update config
    this.mapData.config.width = width;
    this.mapData.config.height = height;
    if (tileSize !== undefined) {
      this.mapData.config.tileSize = tileSize;
    }

    // Regenerate all 4 layers
    this.mapData.layers.background = createEmptyLayer(width, height, 0);
    this.mapData.layers.ground = createEmptyLayer(width, height, 0);
    this.mapData.layers.foreground = createEmptyLayer(width, height, 0);
    this.mapData.layers.collision = createEmptyLayer(width, height, 0);

    // Clear objects that might be out of bounds
    this.mapData.objects.items = [];

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
  resetMap(
    type: "platform" | "topdown" | "snake",
    width: number,
    height: number,
    tileSize: number,
  ): void {
    this.saveHistory();

    this.mapData = createEmptyMap(type, width, height, tileSize);
    this.activeLayer = "background";
    this.selectedTile = 0;
    this.selectedObjectId = null;
    this.selectedTool = "paint";

    this.notify();
  }

  /**
   * Update the map name
   *
   * @param name - New map name
   */
  setMapName(name: string): void {
    this.saveHistory();
    this.mapData.config.name = name;
    this.notify();
  }

  /**
   * Update the map description
   *
   * @param description - New map description
   */
  setMapDescription(description: string): void {
    this.saveHistory();
    this.mapData.config.description = description;
    this.notify();
  }

  /**
   * Update the map difficulty
   *
   * @param difficulty - Difficulty level (1..5)
   */
  setMapDifficulty(difficulty: 1 | 2 | 3 | 4 | 5): void {
    this.saveHistory();
    this.mapData.config.difficulty = difficulty;
    this.notify();
  }

  /**
   * Update the map time limit
   *
   * @param seconds - Time limit in seconds
   */
  setMapTimeLimitSeconds(seconds: number): void {
    this.saveHistory();
    this.mapData.config.timeLimitSeconds = seconds;
    this.notify();
  }

  /**
   * Update the time threshold for awarding a time star
   *
   * @param percent - Percent of map time limit (1..100)
   */
  setMapTimeStarThresholdPercent(percent: number): void {
    this.saveHistory();
    this.mapData.config.timeStarThresholdPercent = Math.max(1, Math.min(100, Math.floor(percent)));
    this.notify();
  }

  /**
   * Update the estimated steps for solving the map
   *
   * @param steps - Estimated number of steps
   */
  setMapEstimatedSteps(steps: number): void {
    this.saveHistory();
    this.mapData.config.estimatedSteps = Math.max(1, Math.floor(steps));
    this.notify();
  }

  /**
   * Update the map win condition
   *
   * @param winCondition - Win condition (1=reach goal, 2=collect all fruits)
   */
  setMapWinCondition(winCondition: 1 | 2): void {
    this.saveHistory();
    this.mapData.config.winCondition = winCondition;
    this.notify();
  }

  /**
   * Update the map level objective text
   *
   * @param objective - User-authored objective
   */
  setMapLevelObjective(objective: string): void {
    this.saveHistory();
    this.mapData.config.levelObjective = objective;
    this.notify();
  }

  /**
   * Update the map required fruits
   *
   * @param count - Number of required fruits (0 means all fruits)
   */
  setMapRequiredFruits(count: number): void {
    this.saveHistory();
    this.mapData.config.requiredFruits = Math.max(0, count);
    this.notify();
  }

  /**
   * Update the map price
   *
   * @param price - Map price
   */
  setMapPrice(price: number): void {
    this.saveHistory();
    this.mapData.config.price = price;
    this.notify();
  }

  setMapType(type: "platform" | "topdown" | "snake"): void {
    this.saveHistory();
    this.mapData.config.type = type;
    this.notify();
  }

  /**
   * Update the map block limit
   *
   * @param blockLimit - Maximum blocks allowed, or null for unlimited
   */
  setBlockLimit(blockLimit: number | null): void {
    this.saveHistory();
    const normalized =
      typeof blockLimit === "number" && Number.isFinite(blockLimit)
        ? Math.max(1, Math.floor(blockLimit))
        : null;
    this.mapData.blockConstraints.blockLimit = normalized;
    this.notify();
  }

  /**
   * Update the list of allowed block types
   *
   * @param allowedBlocks - Block type IDs that can be used. Empty means all are allowed.
   */
  setAllowedBlocks(allowedBlocks: string[]): void {
    this.saveHistory();
    const normalizedAllowed = Array.from(
      new Set(allowedBlocks.filter((type) => typeof type === "string" && type.trim().length > 0)),
    );
    this.mapData.blockConstraints.allowedBlocks = normalizedAllowed;

    if (normalizedAllowed.length > 0) {
      this.mapData.blockConstraints.requiredBlocks = this.mapData.blockConstraints.requiredBlocks.filter(
        (rule) => normalizedAllowed.includes(rule.type),
      );
    }

    this.notify();
  }

  /**
   * Update required block rules
   *
   * @param requiredBlocks - Block type requirements with minimum counts
   */
  setRequiredBlocks(requiredBlocks: Array<{ type: string; minCount: number }>): void {
    this.saveHistory();
    const normalizedAllowed = this.mapData.blockConstraints.allowedBlocks;
    this.mapData.blockConstraints.requiredBlocks = requiredBlocks
      .filter(
        (rule) =>
          typeof rule.type === "string" &&
          rule.type.trim().length > 0 &&
          typeof rule.minCount === "number" &&
          Number.isFinite(rule.minCount) &&
          (normalizedAllowed.length === 0 || normalizedAllowed.includes(rule.type)),
      )
      .map((rule) => ({
        type: rule.type,
        minCount: Math.max(1, Math.floor(rule.minCount)),
      }));
    this.notify();
  }

  /**
   * Load a new map into the editor
   * Supports backward compatibility with 2-layer maps
   *
   * @param mapData - The map data to load
   */
  loadMap(mapData: MapData): void {
    this.saveHistory();

    const loadedMap = structuredClone(mapData);

    // Backward compatibility: Add missing layers if needed
    if (!loadedMap.layers.ground) {
      loadedMap.layers.ground = createEmptyLayer(
        loadedMap.config.width,
        loadedMap.config.height,
        0,
      );
    }
    if (!loadedMap.layers.foreground) {
      loadedMap.layers.foreground = createEmptyLayer(
        loadedMap.config.width,
        loadedMap.config.height,
        0,
      );
    }

    // Backward compatibility: Add missing name and description if needed
    if (!loadedMap.config.name) {
      loadedMap.config.name = "";
    }
    if (!loadedMap.config.description) {
      loadedMap.config.description = "";
    }

    // Backward compatibility: Add missing config fields if needed
    if (loadedMap.config.difficulty === undefined) {
      loadedMap.config.difficulty = 1; // Default: Easy
    }
    if (loadedMap.config.timeLimitSeconds === undefined) {
      loadedMap.config.timeLimitSeconds = 300; // Default: 5 minutes
    }
    if (loadedMap.config.estimatedSteps === undefined) {
      loadedMap.config.estimatedSteps = 50; // Default estimated steps
    }
    if (loadedMap.config.winCondition === undefined) {
      loadedMap.config.winCondition = 1; // Default: Reach goal
    }
    if (loadedMap.config.requiredFruits === undefined) {
      loadedMap.config.requiredFruits = 0; // Default: All fruits
    }
    if (loadedMap.config.price === undefined) {
      loadedMap.config.price = 0; // Default: Free
    }

    // Backward compatibility: Convert specific arrays into unified items array
    if (!loadedMap.objects.items) {
      loadedMap.objects.items = [];

      // Migrate playerSpawn
      const anyMap = loadedMap as unknown as Record<string, unknown>;
      const objectsRaw = (anyMap.objects as Record<string, unknown>) || {};

      if (objectsRaw.playerSpawn) {
        const ps = objectsRaw.playerSpawn as { x: number; y: number };
        loadedMap.objects.items.push({ id: 1, type: "player", x: ps.x, y: ps.y });
      }

      // Migrate goal
      if (objectsRaw.goal) {
        const g = objectsRaw.goal as { x: number; y: number };
        loadedMap.objects.items.push({ id: 2, type: "goal", x: g.x, y: g.y });
      }

      // Migrate fruits
      if (Array.isArray(objectsRaw.fruits)) {
        objectsRaw.fruits.forEach((f) => {
          loadedMap.objects.items.push({ id: 3, type: "fruit", x: f.x, y: f.y });
        });
      }

      // Migrate enemies
      if (Array.isArray(objectsRaw.enemies)) {
        objectsRaw.enemies.forEach((e) => {
          // Keep as id 4 for palette highlighting backward compat, but don't force string type
          loadedMap.objects.items.push({ id: 4, type: e.type || "enemy", x: e.x, y: e.y });
        });
      }

      // Migrate decorative objects
      if (Array.isArray(objectsRaw.decorativeObjects)) {
        objectsRaw.decorativeObjects.forEach((d) => {
          loadedMap.objects.items.push({ id: d.id, type: "decorative", x: d.x, y: d.y });
        });
      }

      // Clean up old fields
      delete objectsRaw.playerSpawn;
      delete objectsRaw.goal;
      delete objectsRaw.fruits;
      delete objectsRaw.enemies;
      delete objectsRaw.decorativeObjects;
    }

    // Backward compatibility: Add block constraints if missing
    if (!loadedMap.blockConstraints) {
      loadedMap.blockConstraints = {
        blockLimit: 30,
        allowedBlocks: [],
        requiredBlocks: [],
      };
    }
    if (!Array.isArray(loadedMap.blockConstraints.allowedBlocks)) {
      loadedMap.blockConstraints.allowedBlocks = [];
    }
    if (
      loadedMap.blockConstraints.allowedBlocks.length === 0 &&
      Array.isArray(loadedMap.blockConstraints.bannedBlocks)
    ) {
      const legacyBanned = Array.from(
        new Set(
          loadedMap.blockConstraints.bannedBlocks.filter(
            (type): type is string => typeof type === "string" && type.trim().length > 0,
          ),
        ),
      );
      const allBlockTypes = blocksConfig.blocks.map((block) => block.type);
      loadedMap.blockConstraints.allowedBlocks = allBlockTypes.filter(
        (type) => !legacyBanned.includes(type),
      );
    }
    if (!Array.isArray(loadedMap.blockConstraints.requiredBlocks)) {
      loadedMap.blockConstraints.requiredBlocks = [];
    }

    if (loadedMap.blockConstraints.allowedBlocks.length > 0) {
      loadedMap.blockConstraints.requiredBlocks = loadedMap.blockConstraints.requiredBlocks.filter(
        (rule) => loadedMap.blockConstraints.allowedBlocks.includes(rule.type),
      );
    }
    if (
      loadedMap.blockConstraints.blockLimit !== null &&
      (typeof loadedMap.blockConstraints.blockLimit !== "number" ||
        !Number.isFinite(loadedMap.blockConstraints.blockLimit))
    ) {
      loadedMap.blockConstraints.blockLimit = null;
    }

    this.mapData = loadedMap;
    this.activeLayer = "background";
    this.selectedTile = 0;
    this.selectedObjectId = null;
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