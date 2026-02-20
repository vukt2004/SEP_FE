import { animationRegistry } from "./animationRegistry";
import type { AnimationDefinition } from "./animationTypes";

interface AnimationStateConfig {
  sprite: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number;
  loop: boolean;
}

interface AnimationConfig {
  objectType: string;
  states: {
    [state: string]: AnimationStateConfig;
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function loadAnimations(): Promise<void> {
  const modules = import.meta.glob<{ default: AnimationConfig }>(
    "/src/shared/assets/animations/*.json",
    {
      eager: true,
    },
  );

  const loadPromises: Promise<void>[] = [];

  for (const path in modules) {
    const module = modules[path];
    const config = module.default;

    if (!config || !config.objectType || !config.states) {
      console.warn(`Invalid animation config at ${path}`);
      continue;
    }

    const { objectType, states } = config;

    // Initialize state map for this object type
    if (!animationRegistry[objectType]) {
      animationRegistry[objectType] = {};
    }

    // Load all states for this object type
    for (const stateName in states) {
      const stateConfig = states[stateName];

      const loadPromise = loadImage(stateConfig.sprite).then((image) => {
        // Generate frames array from frameCount
        const frames: number[] = [];
        for (let i = 0; i < stateConfig.frameCount; i++) {
          frames.push(i);
        }

        const animDef: AnimationDefinition = {
          image,
          frameWidth: stateConfig.frameWidth,
          frameHeight: stateConfig.frameHeight,
          frames,
          frameDuration: stateConfig.frameDuration,
          loop: stateConfig.loop,
        };

        animationRegistry[objectType][stateName] = animDef;
      });

      loadPromises.push(loadPromise);
    }
  }

  await Promise.all(loadPromises);
}
