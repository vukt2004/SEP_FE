import type { ObjectBehavior } from "../object/objectTypes";

export const objectRegistry: Record<string, ObjectBehavior> = {
  goal: {
    isWinObject: true,
  },

  fruit: {
    isCollidable: () => false, // Player can walk through fruits
    // fruits are collectibles but don't trigger win condition
  },

  door: {
    isCollidable: (state) => state !== "open",
    onInteract: (state) => (state === "open" ? "closed" : "open"),
  },
};
