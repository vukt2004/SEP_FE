import type { AnimationDefinition } from "./animationTypes";

interface RuntimeAnimation {
  currentFrameIndex: number;
  elapsedTime: number;
  lastState: string;
}

export class AnimationSystem {
  private runtimeMap: Map<string, RuntimeAnimation> = new Map();

  private getKey(objectId: string, state: string): string {
    return `${objectId}_${state}`;
  }

  update(objectId: string, state: string, animation: AnimationDefinition, deltaTime: number): void {
    const key = this.getKey(objectId, state);
    let runtime = this.runtimeMap.get(key);

    if (!runtime || runtime.lastState !== state) {
      runtime = { currentFrameIndex: 0, elapsedTime: 0, lastState: state };
      this.runtimeMap.set(key, runtime);
    }

    runtime.elapsedTime += deltaTime;

    if (runtime.elapsedTime >= animation.frameDuration) {
      runtime.elapsedTime -= animation.frameDuration;
      runtime.currentFrameIndex++;

      if (runtime.currentFrameIndex >= animation.frames.length) {
        runtime.currentFrameIndex = animation.loop ? 0 : animation.frames.length - 1;
      }
    }
  }

  getCurrentFrame(objectId: string, state: string): number {
    const key = this.getKey(objectId, state);
    const runtime = this.runtimeMap.get(key);
    if (!runtime) return 0;
    return runtime.currentFrameIndex;
  }
}
