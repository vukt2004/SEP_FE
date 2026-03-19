import type { ObjectBehavior } from "../object/objectTypes";
import type { Player } from "../core/types";
import type { LevelDefinition, GridObjectDefinition } from "../../map-system/types";

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

  sliding_block: {
    isCollidable: () => false,
    onPlayerEnter: (
      _state: string | undefined,
      level: LevelDefinition | undefined,
      player: Player | undefined,
    ) => {
      if (!level || !player) return undefined;

      // Calculate approach direction: opposite of facing
      const opposite: Record<string, string> = {
        up: "down",
        down: "up",
        left: "right",
        right: "left",
      };
      const approach = opposite[player.facing];

      // All directions
      const directions = ["up", "down", "left", "right"];
      // Exclude approach
      const possible = directions.filter((d) => d !== approach);

      // Shuffle possible directions
      for (let i = possible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [possible[i], possible[j]] = [possible[j], possible[i]];
      }

      // Deltas
      const deltas: Record<string, { dx: number; dy: number }> = {
        up: { dx: 0, dy: -1 },
        down: { dx: 0, dy: 1 },
        left: { dx: -1, dy: 0 },
        right: { dx: 1, dy: 0 },
      };

      const currentPos = { row: player.y, col: player.x };

      for (const dir of possible) {
        const newRow = currentPos.row + deltas[dir].dy;
        const newCol = currentPos.col + deltas[dir].dx;

        // Check bounds
        if (newRow < 0 || newRow >= level.height || newCol < 0 || newCol >= level.width) continue;

        // Check collision layer
        if (level.layers.collision[newRow][newCol]) continue;

        // Check no other object
        const hasObject = (level.objects as GridObjectDefinition[])?.some(
          (o: GridObjectDefinition) => o.position.row === newRow && o.position.col === newCol,
        );
        if (hasObject) continue;

        // Valid, move to there
        return { moveTo: { row: newRow, col: newCol } };
      }

      // No valid move
      return undefined;
    },
  },

  disappearing_block: {
    isCollidable: () => false,
    onPlayerEnter: (state) => {
      if (state !== "disappearing") {
        return { newState: "disappearing", delayRemove: 1000 };
      }
      return undefined;
    },
  },
};
