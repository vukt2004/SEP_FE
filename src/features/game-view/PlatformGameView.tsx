import { useEffect, useRef } from "react";
import { PlatformMovementSystem } from "../../modules/engine/systems/movement/PlatformMovementSystem";
import type { Entity } from "../../modules/engine/components/components";
import type { TileMap } from "../../modules/map-system/types";

export default function PlatformGameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const systemRef = useRef<PlatformMovementSystem | null>(null);
  const playerRef = useRef<Entity | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create platformer map (20x15 tiles, 16px each)
    const tileMap: TileMap = {
      width: 20,
      height: 15,
      tileSize: 16,
      tiles: [
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Top border
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Ground
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // Bottom border
      ],
      objects: [],
    };

    canvas.width = tileMap.width * tileMap.tileSize;
    canvas.height = tileMap.height * tileMap.tileSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Create platformer system
    const platformSystem = new PlatformMovementSystem();
    systemRef.current = platformSystem;

    // Create player entity
    const player: Entity = {
      id: "player",
      transform: {
        position: { x: 32, y: 32 }, // Start position
      },
      velocity: {
        velocity: { x: 0, y: 0 },
      },
      collider: {
        width: 14,
        height: 14,
        offset: { x: 1, y: 1 },
        isStatic: false,
      },
      platform: {
        gravity: 800, // pixels/second²
        grounded: false,
        jumpForce: -320, // negative = upward
      },
    };

    playerRef.current = player;
    platformSystem.registerEntity(player);

    // Input handling
    const pressedKeys = new Set<string>();
    const MOVE_SPEED = 120; // pixels/second

    const handleKeyDown = (e: KeyboardEvent) => {
      pressedKeys.add(e.key.toLowerCase());

      // Jump
      if ((e.key === " " || e.key === "w" || e.key === "ArrowUp") && player.platform?.grounded) {
        if (player.velocity) {
          player.velocity.velocity.y = player.platform.jumpForce;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    // Render function
    function render() {
      if (!ctx || !canvas) return;

      // Clear canvas
      ctx.fillStyle = "#87CEEB"; // Sky blue
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw tiles
      for (let row = 0; row < tileMap.tiles.length; row++) {
        for (let col = 0; col < tileMap.tiles[row].length; col++) {
          if (tileMap.tiles[row][col] === 1) {
            ctx.fillStyle = "#8B4513"; // Brown for platforms
            ctx.fillRect(
              col * tileMap.tileSize,
              row * tileMap.tileSize,
              tileMap.tileSize,
              tileMap.tileSize,
            );

            // Border
            ctx.strokeStyle = "#654321";
            ctx.lineWidth = 1;
            ctx.strokeRect(
              col * tileMap.tileSize,
              row * tileMap.tileSize,
              tileMap.tileSize,
              tileMap.tileSize,
            );
          }
        }
      }

      // Draw player
      if (player.transform) {
        const x = player.transform.position.x;
        const y = player.transform.position.y;

        // Player body
        ctx.fillStyle = player.platform?.grounded ? "#4CAF50" : "#FFC107"; // Green when grounded, yellow in air
        ctx.fillRect(x, y, 16, 16);

        // Player border
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 16, 16);

        // Eyes
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + 4, y + 4, 3, 3);
        ctx.fillRect(x + 9, y + 4, 3, 3);
      }

      // Draw UI
      ctx.fillStyle = "#000000";
      ctx.font = "12px monospace";
      ctx.fillText(
        `Position: (${Math.round(player.transform?.position.x || 0)}, ${Math.round(player.transform?.position.y || 0)})`,
        10,
        20,
      );
      ctx.fillText(
        `Velocity: (${Math.round(player.velocity?.velocity.x || 0)}, ${Math.round(player.velocity?.velocity.y || 0)})`,
        10,
        35,
      );
      ctx.fillText(`Grounded: ${player.platform?.grounded ? "YES" : "NO"}`, 10, 50);
      ctx.fillText("Controls: A/D or ←/→ to move, SPACE/W/↑ to jump", 10, canvas.height - 10);
    }

    // Game loop
    function gameLoop(currentTime: number) {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      // Skip first frame (large deltaTime)
      if (deltaTime < 100 && player.velocity) {
        // Apply horizontal movement based on input
        player.velocity.velocity.x = 0;
        if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) {
          player.velocity.velocity.x = -MOVE_SPEED;
        }
        if (pressedKeys.has("d") || pressedKeys.has("arrowright")) {
          player.velocity.velocity.x = MOVE_SPEED;
        }

        // Update physics
        platformSystem.update(deltaTime, tileMap);
      }

      // Render
      render();

      // Continue loop
      animationIdRef.current = requestAnimationFrame(gameLoop);
    }

    // Start game loop
    lastTimeRef.current = performance.now();
    animationIdRef.current = requestAnimationFrame(gameLoop);

    // Cleanup
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        padding: "20px",
      }}
    >
      <h2>Platform Game Test</h2>
      <canvas ref={canvasRef} style={{ border: "2px solid #000", imageRendering: "pixelated" }} />
      <div style={{ fontSize: "14px", textAlign: "center" }}>
        <p>
          <strong>Controls:</strong>
        </p>
        <p>A/D or Arrow Keys: Move Left/Right</p>
        <p>SPACE/W/Up Arrow: Jump (only when grounded)</p>
        <p>
          Player turns <span style={{ color: "#4CAF50" }}>GREEN</span> when grounded,{" "}
          <span style={{ color: "#FFC107" }}>YELLOW</span> in air
        </p>
      </div>
    </div>
  );
}
