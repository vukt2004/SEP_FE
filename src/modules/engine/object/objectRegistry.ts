import type { ObjectBehavior } from "../object/objectTypes";

export const objectRegistry: Record<string, ObjectBehavior> = {
  goal: {
    isWinObject: true,
  },

  coin: {
    isCollidable: () => false, // Player can walk through coins
    // coins are collectibles but don't trigger win condition
  },

  door: {
    isCollidable: (state) => state !== "open",
    onInteract: (state) => (state === "open" ? "closed" : "open"),
  },
};
