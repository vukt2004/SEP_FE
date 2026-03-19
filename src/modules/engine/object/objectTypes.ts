import type { Player } from "../core/types";
import type { LevelDefinition } from "../../map-system/types";

export interface ObjectBehavior {
  isCollidable?: (state?: string) => boolean;
  onInteract?: (state?: string) => string | undefined;
  onPlayerEnter?: (
    state?: string,
    level?: LevelDefinition,
    player?: Player,
  ) =>
    | {
        newState?: string;
        remove?: boolean;
        moveTo?: { row: number; col: number };
        delayRemove?: number;
      }
    | undefined;
  isWinObject?: boolean;
}
