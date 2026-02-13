export type Direction = "up" | "down" | "left" | "right";

export interface Player {
  id: string;
  x: number; // grid column
  y: number; // grid row
  facing: Direction; // gameplay direction (for movement)
  direction: "left" | "right"; // sprite direction (for flipping)
  isMoving: boolean;
  animationState: string;
}
