import type { ObjectBehavior } from "../object/objectTypes";

export const objectRegistry: Record<string, ObjectBehavior> = {
  goal: {
    isWinObject: true,
  },

  door: {
    isCollidable: (state) => state !== "open",
    onInteract: (state) => (state === "open" ? "closed" : "open"),
  },
};
