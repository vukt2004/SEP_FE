export type EngineEvent =
  | { type: "win" }
  | {
      type: "winConditionNotMet";
      message: string;
      collectedFruits: number;
      requiredFruits: number;
    }
  | { type: "engine:failed" }
  | {
      type: "objectStateChanged";
      objectId: string;
      newState?: string;
    }
  | {
      type: "collision:enter";
      entityAId: string;
      entityBId: string;
    }
  | {
      type: "fruitCollected";
      fruitId: string;
      totalCollected: number;
    };
