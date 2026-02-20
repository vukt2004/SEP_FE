export const EngineState = {
  Idle: "idle",
  Running: "running",
  Paused: "paused",
  Won: "won",
  Failed: "failed",
  Stopped: "stopped",
} as const;

export type EngineState = (typeof EngineState)[keyof typeof EngineState];
