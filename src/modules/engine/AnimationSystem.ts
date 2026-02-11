import type { AnimationDefinition } from "./animationTypes";

interface RuntimeAnimation {
  currentFrameIndex: number;
  elapsedTime: number;
}

export class AnimationSystem {
  private runtimeMap: Record<string, RuntimeAnimation> = {};

  update(objectId: string, animation: AnimationDefinition, deltaTime: number): void {
    let runtime = this.runtimeMap[objectId];

    if (!runtime) {
      runtime = { currentFrameIndex: 0, elapsedTime: 0 };
      this.runtimeMap[objectId] = runtime;
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

  getCurrentFrame(objectId: string): number {
    const runtime = this.runtimeMap[objectId];
    if (!runtime) return 0;
    return runtime.currentFrameIndex;
  }
}
