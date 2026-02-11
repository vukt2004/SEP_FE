import type { TileMap } from "../map-system/types";
import type { Player } from "./types";
import { animationRegistry } from "./animationRegistry";
import type { AnimationSystem } from "./AnimationSystem";

const TILE_COLORS: Record<number, string> = {
  0: "#eeeeee",
  1: "#444444",
};

const PLAYER_COLOR = "#2255cc";
const GOAL_COLOR = "#22cc55";
const DOOR_OPEN_COLOR = "#d4a574";
const DOOR_CLOSED_COLOR = "#8b4513";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private animationSystem: AnimationSystem;

  constructor(ctx: CanvasRenderingContext2D, animationSystem: AnimationSystem) {
    this.ctx = ctx;
    this.animationSystem = animationSystem;
  }

  render(map: TileMap, player: Player): void {
    this.drawTiles(map);
    this.drawObjects(map);
    this.drawPlayer(player, map.tileSize);
  }

  private drawTiles(map: TileMap): void {
    const { tiles, tileSize } = map;

    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row].length; col++) {
        const tileValue = tiles[row][col];
        this.ctx.fillStyle = TILE_COLORS[tileValue] ?? TILE_COLORS[0];
        this.ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
    }
  }

  private drawObjects(map: TileMap): void {
    const { objects, tileSize } = map;

    for (const obj of objects) {
      const stateKey = obj.state ?? "default";
      const animMap = animationRegistry[obj.type];
      const anim = animMap?.[stateKey];

      if (anim) {
        // Sprite-based rendering
        const frameIndex = this.animationSystem.getCurrentFrame(obj.id);
        const frame = anim.frames[frameIndex];
        const sx = frame * anim.frameWidth;
        const sy = 0;
        this.ctx.drawImage(
          anim.image,
          sx,
          sy,
          anim.frameWidth,
          anim.frameHeight,
          obj.x,
          obj.y,
          tileSize,
          tileSize,
        );
      } else {
        // Fallback: colored square
        if (obj.type === "goal") {
          this.ctx.fillStyle = GOAL_COLOR;
        } else if (obj.type === "door") {
          this.ctx.fillStyle = obj.state === "open" ? DOOR_OPEN_COLOR : DOOR_CLOSED_COLOR;
        } else {
          this.ctx.fillStyle = "#ff00ff";
        }
        this.ctx.fillRect(obj.x, obj.y, tileSize, tileSize);
      }
    }
  }

  private drawPlayer(player: Player, tileSize: number): void {
    this.ctx.fillStyle = PLAYER_COLOR;
    this.ctx.fillRect(player.x * tileSize, player.y * tileSize, tileSize, tileSize);
  }
}
