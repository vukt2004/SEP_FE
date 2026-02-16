import type { LevelDefinition, TileType } from "../../map-system/types";
import type { Player } from "../core/types";
import { animationRegistry } from "../systems/animation/animationRegistry";
import type { AnimationSystem } from "../systems/animation/AnimationSystem";

const TILE_COLORS: Record<TileType, string> = {
  empty: "#eeeeee",
  wall: "#444444",
  start: "#55ccff",
  goal: "#22cc55",
};

const PLAYER_COLOR = "#2255cc";
const GOAL_COLOR = "#22cc55";
const DOOR_OPEN_COLOR = "#d4a574";
const DOOR_CLOSED_COLOR = "#8b4513";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private animationSystem: AnimationSystem;
  private debugMode: boolean = true;

  constructor(
    ctx: CanvasRenderingContext2D,
    animationSystem: AnimationSystem,
    debugMode: boolean = true,
  ) {
    this.ctx = ctx;
    this.animationSystem = animationSystem;
    this.debugMode = debugMode;
  }

  render(level: LevelDefinition, tileSize: number, player: Player): void {
    this.drawTiles(level, tileSize);
    this.drawObjects(level, tileSize);
    this.drawPlayer(player, tileSize);
  }

  private drawTiles(level: LevelDefinition, tileSize: number): void {
    const { tiles } = level;

    for (let row = 0; row < tiles.length; row++) {
      for (let col = 0; col < tiles[row].length; col++) {
        const tileType = tiles[row][col];
        this.ctx.fillStyle = TILE_COLORS[tileType] ?? TILE_COLORS["empty"];
        this.ctx.fillRect(col * tileSize, row * tileSize, tileSize, tileSize);
      }
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
