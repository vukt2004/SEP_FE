export interface AnimationDefinition {
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;
  frames: number[];
  frameDuration: number;
  loop: boolean;
  row?: number; // Sprite sheet row offset (for multi-row spritesheets)
  columns?: number; // Number of columns in the sprite sheet (for multi-row animations)
}
