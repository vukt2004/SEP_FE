import { useEffect, useRef } from "react";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import { EngineCommand } from "../../modules/executor/commands";
import type { TileMap } from "../../modules/map-system/types";
import { LevelType, createGameConfig } from "../../modules/engine/core/GameConfig";

/**
 * PlatformGameView - Test view for platformer levels with gravity
 *
 * Controls:
 * - Arrow Left/Right: Move horizontally
 * - Arrow Up/Down: Face up/down (for future jump/climb mechanics)
 *
 * Physics:
 * - Gravity automatically pulls player down
 * - Player falls tile-by-tile until reaching solid ground
 */
export default function PlatformGameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a platformer level with platforms
    const map: TileMap = {
      width: 20,
      height: 15,
      tileSize: 16,
      tiles: [
        // Row 0 - Top border
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        // Row 1-3 - Empty
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // Row 4 - First platform
        [1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // Row 5-6 - Empty
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // Row 7 - Second platform
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
        // Row 8-9 - Empty
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // Row 10 - Third platform
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
        // Row 11-12 - Empty
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        // Row 13 - Ground floor
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        // Row 14 - Bottom border
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      ],
      objects: [],
    };

    canvas.width = map.width * map.tileSize;
    canvas.height = map.height * map.tileSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create Platform game config (with gravity)
    const config = createGameConfig(LevelType.Platform);
    const engine = new GameEngine(map, ctx, config);
    engineRef.current = engine;

    // Initialize and start
    const initAndStart = async () => {
      await engine.initialize();
      engine.start();
    };

    initAndStart();

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          engine.executeCommand(EngineCommand.TURN_LEFT);
          engine.executeCommand(EngineCommand.MOVE_FORWARD);
          break;
        case "ArrowRight":
          engine.executeCommand(EngineCommand.TURN_RIGHT);
          engine.executeCommand(EngineCommand.MOVE_FORWARD);
          break;
        case "ArrowUp":
          // Face up (for future jump or climb mechanics)
          engine.executeCommand(EngineCommand.TURN_LEFT);
          engine.executeCommand(EngineCommand.TURN_LEFT);
          break;
        case "ArrowDown":
          // Face down
          engine.executeCommand(EngineCommand.TURN_RIGHT);
          engine.executeCommand(EngineCommand.TURN_RIGHT);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.stop();
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Platform Game View (with Gravity)</h2>
      <p>
        <strong>Controls:</strong> Arrow keys to move left/right. Player will fall with gravity.
      </p>
      <canvas
        ref={canvasRef}
        style={{ border: "2px solid #333", display: "block", marginTop: "10px" }}
      />
    </div>
  );
}
