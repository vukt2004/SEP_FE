import { useEffect, useRef, useState } from "react";
import { EditorStore } from "../store/editorStore";
import { TileRenderer } from "./GridRenderer";
import { getGridPosition } from "../utils/getGridPosition";

interface EditorCanvasProps {
  store: EditorStore;
}

/**
 * EditorCanvas Component
 *
 * Handles canvas rendering and mouse interaction for the map editor.
 * Supports click-to-paint and drag-to-paint functionality with
 * paint, erase, and object placement tools.
 *
 * Object placement rules:
 * - Player and Goal: Single click placement only (no drag)
 * - Coins and Enemies: Toggle on click (can drag)
 * - Paint and Erase: Standard drag painting
 */
export function EditorCanvas({ store }: EditorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<TileRenderer>(new TileRenderer());
  const [isPainting, setIsPainting] = useState(false);
  const [, forceUpdate] = useState({});
  const lastPaintedTileRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Initialize tileset on mount
   */
  useEffect(() => {
    rendererRef.current.loadTileset("default").then(() => {
      forceUpdate({}); // Re-render once tileset is loaded
    });
  }, []);

  /**
   * Subscribe to store changes and set up rendering
   */
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate({});
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  /**
   * Render the grid whenever component updates
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mapData = store.getState();
    const activeLayer = store.getActiveLayer();

    // Set canvas size to match map dimensions
    canvas.width = mapData.config.width * mapData.config.tileSize;
    canvas.height = mapData.config.height * mapData.config.tileSize;

    // Render the grid using TileRenderer
    rendererRef.current.render(ctx, mapData, activeLayer);
  });

  /**
   * Apply tool at mouse position
   */
  const applyToolAtPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const mapData = store.getState();
    const gridPos = getGridPosition(mouseX, mouseY, mapData);

    if (!gridPos) return;

    // Avoid painting the same tile multiple times in a single drag
    if (
      lastPaintedTileRef.current &&
      lastPaintedTileRef.current.x === gridPos.x &&
      lastPaintedTileRef.current.y === gridPos.y
    ) {
      return;
    }

    // Apply the tool
    store.applyTool(gridPos.x, gridPos.y);
    lastPaintedTileRef.current = gridPos;
  };

  /**
   * Handle mouse down - start painting
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    lastPaintedTileRef.current = null;
    applyToolAtPosition(e);
  };

  /**
   * Handle mouse move - paint if mouse is down
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting) return;

    const selectedTool = store.getSelectedTool();

    // Prevent dragging for player, goal, and fill (single placement only)
    if (selectedTool === "player" || selectedTool === "goal" || selectedTool === "fill") {
      return;
    }

    applyToolAtPosition(e);
  };

  /**
   * Handle mouse up - stop painting
   */
  const handleMouseUp = () => {
    setIsPainting(false);
    lastPaintedTileRef.current = null;
  };

  /**
   * Handle mouse leave - stop painting
   */
  const handleMouseLeave = () => {
    setIsPainting(false);
    lastPaintedTileRef.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      style={styles.canvas}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}

const styles: Record<string, React.CSSProperties> = {
  canvas: {
    border: "2px solid #333",
    cursor: "crosshair",
    display: "block",
    imageRendering: "pixelated",
  },
};
