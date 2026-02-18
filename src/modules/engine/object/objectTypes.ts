export interface ObjectBehavior {
  isCollidable?: (state?: string) => boolean;
  onInteract?: (state?: string) => string | undefined;
  isWinObject?: boolean;
}
