export type EngineEvent =
  | { type: "win" }
  | {
      type: "objectStateChanged";
      objectId: string;
      newState?: string;
    };
