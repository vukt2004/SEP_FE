export type EngineEvent =
  | { type: "win" }
  | {
      type: "objectStateChanged";
      objectId: string;
      newState?: string;
    }
  | {
      type: "collision:enter";
      entityAId: string;
      entityBId: string;
    };
