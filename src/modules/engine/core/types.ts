export type Direction = "up" | "down" | "left" | "right";

export interface Player {
  id: string;
  x: number; // grid column (logical position)
  y: number; // grid row (logical position)
  pixelX: number; // visual x position in pixels (interpolated)
  pixelY: number; // visual y position in pixels (interpolated)
  targetPixelX: number; // target x position for interpolation
  targetPixelY: number; // target y position for interpolation
  facing: Direction; // gameplay direction (for movement)
  direction: "left" | "right"; // sprite direction (for flipping)
  isMoving: boolean;
  animationState: string;
  isJumping: boolean;
  isFalling: boolean;
  jumpPower: number; // tiles to jump up
  isGrounded: boolean;
}
