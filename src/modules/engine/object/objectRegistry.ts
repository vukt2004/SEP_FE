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

  chest: {
    isCollidable: () => true,
    // Open once; subsequent interactions do nothing
    onInteract: (state) => (state === "open" ? undefined : "open"),
  },

  box1: {
    isCollidable: (state) => state !== "break",
    // Break once; subsequent interactions do nothing
    onInteract: (state) => (state === "break" ? undefined : "break"),
  },

  box2: {
    isCollidable: (state) => state !== "break",
    onInteract: (state) => (state === "break" ? undefined : "break"),
  },

  box3: {
    isCollidable: (state) => state !== "break",
    onInteract: (state) => (state === "break" ? undefined : "break"),
  },

  trap: {
    isCollidable: () => false, // Spikes are usually walked over to take damage, etc
    onInteract: (state) => (state === "blink" ? "idle" : "blink"),
  },
};
