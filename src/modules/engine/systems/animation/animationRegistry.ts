import type { AnimationDefinition } from "./animationTypes";

export type AnimationStateMap = {
  [state: string]: AnimationDefinition;
};

export const animationRegistry: {
  [type: string]: AnimationStateMap;
} = {};
