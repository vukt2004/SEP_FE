export type Direction = "up" | "down" | "left" | "right";

export interface Player {
  x: number; // grid column
  y: number; // grid row
  direction: Direction;
}
