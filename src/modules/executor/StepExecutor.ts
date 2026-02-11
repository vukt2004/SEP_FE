import type { BlockProgram, Block } from "./types";
import { EngineCommand } from "./commands";

interface StackFrame {
  blocks: Block[];
  index: number;
}

export class StepExecutor {
  private stack: StackFrame[];
  private intervalId: number | null;
  private conditionChecker: () => boolean;

  constructor(program: BlockProgram, conditionChecker: () => boolean) {
    this.stack = [{ blocks: program, index: 0 }];
    this.intervalId = null;
    this.conditionChecker = conditionChecker;
  }

  reset(): void {
    // Reset to initial program state would require storing original program
    // For now, just clear the stack
    this.stack = [];
  }

  hasNext(): boolean {
    return this.stack.length > 0;
  }

  next(): EngineCommand | null {
    while (this.stack.length > 0) {
      const frame = this.stack[this.stack.length - 1];

      if (frame.index >= frame.blocks.length) {
        // Frame exhausted, pop it
        this.stack.pop();
        continue;
      }

      const block = frame.blocks[frame.index];
      frame.index++;

      switch (block.type) {
        case "move":
          return EngineCommand.MOVE_FORWARD;
        case "turnLeft":
          return EngineCommand.TURN_LEFT;
        case "turnRight":
          return EngineCommand.TURN_RIGHT;
        case "repeat": {
          // Push children multiple times onto stack
          for (let i = 0; i < block.times; i++) {
            this.stack.push({ blocks: block.children, index: 0 });
          }
          // Continue to next iteration to process pushed blocks
          continue;
        }
        case "ifObstacleAhead": {
          // Evaluate condition at runtime
          if (this.conditionChecker()) {
            this.stack.push({ blocks: block.children, index: 0 });
          }
          // Continue to next iteration
          continue;
        }
      }
    }

    return null;
  }

  run(callback: (cmd: EngineCommand) => void, intervalMs: number): void {
    if (this.intervalId !== null) {
      return; // Already running
    }

    this.intervalId = window.setInterval(() => {
      if (this.hasNext()) {
        const cmd = this.next();
        if (cmd) {
          callback(cmd);
        }
      } else {
        this.stop();
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
