export const EngineCommand = {
  MOVE_FORWARD: "MOVE_FORWARD",
  TURN_LEFT: "TURN_LEFT",
  TURN_RIGHT: "TURN_RIGHT",
  INTERACT: "INTERACT",
} as const;

export type EngineCommand = (typeof EngineCommand)[keyof typeof EngineCommand];
