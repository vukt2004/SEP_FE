import type { BlockProgram, Block } from "./types";
import { EngineCommand } from "./commands";

/**
 * Stack frame for execution state tracking
 * - blocks: The array of blocks to execute
 * - index: Current position in the blocks array
 * - repeatLeft: For repeat blocks, tracks remaining iterations
 * - isWhile: Marks this frame as a while loop that needs condition re-checking
 */
interface StackFrame {
  blocks: Block[];
  index: number;
  repeatLeft?: number;
  isWhile?: boolean;
}

/**
 * StepExecutor interprets and executes a block-based program using a stack-based execution model.
 *
 * Execution model:
 * - Maintains a stack of frames, each representing a sequence of blocks to execute
 * - Executes the top frame's current block, then advances
 * - Control flow blocks (repeat, if, while) push new frames onto the stack
 * - When a frame completes, it's popped from the stack
 *
 * Features:
 * - Step-by-step execution via next()
 * - Automatic execution via run()
 * - Pause/resume support
 * - Repeat loops with proper iteration counting
 * - If-else branching
 * - While loops with runtime condition checking
 */
export class StepExecutor {
  private stack: StackFrame[];
  private originalProgram: BlockProgram;
  private intervalId: number | null;
  private isRunning: boolean;
  private isPaused: boolean;
  private conditionChecker: () => boolean;
  private callback: ((cmd: EngineCommand) => void) | null;
  private intervalMs: number;

  constructor(program: BlockProgram, conditionChecker: () => boolean) {
    this.originalProgram = program;
    this.stack = [{ blocks: program, index: 0 }];
    this.intervalId = null;
    this.isRunning = false;
    this.isPaused = false;
    this.conditionChecker = conditionChecker;
    this.callback = null;
    this.intervalMs = 500;
  }

  /**
   * Reset execution to the beginning of the program
   */
  reset(): void {
    this.stop();
    this.stack = [{ blocks: this.originalProgram, index: 0 }];
  }

  /**
   * Check if there are more commands to execute
   */
  hasNext(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Execute one step and return the next command
   *
   * Execution flow:
   * 1. Get the top stack frame
   * 2. If frame is exhausted (index >= blocks.length):
   *    - Handle repeat: decrement repeatLeft, reset index
   *    - Handle while: re-check condition, reset or pop
   *    - Otherwise: pop frame
   * 3. Get current block and advance index
   * 4. Handle block type:
   *    - Simple commands: return immediately
   *    - Control flow: push new frames and continue
   * 5. Loop until a command is found or stack is empty
   */
  next(): EngineCommand | null {
    while (this.stack.length > 0) {
      const frame = this.stack[this.stack.length - 1];

      // Check if current frame is exhausted
      if (frame.index >= frame.blocks.length) {
        // Handle repeat loop continuation
        if (frame.repeatLeft !== undefined && frame.repeatLeft > 1) {
          frame.repeatLeft--;
          frame.index = 0; // Reset to beginning of loop
          continue;
        }

        // Handle while loop continuation
        if (frame.isWhile) {
          // Re-evaluate condition
          if (this.conditionChecker()) {
            frame.index = 0; // Reset to beginning of loop
            continue;
          }
          // Condition false, exit while loop
          this.stack.pop();
          continue;
        }

        // Regular frame exhausted, pop it
        this.stack.pop();
        continue;
      }

      // Get current block and advance index
      const block = frame.blocks[frame.index];
      frame.index++;

      // Handle block based on type
      switch (block.type) {
        case "move":
          return EngineCommand.MOVE_FORWARD;

        case "turnLeft":
          return EngineCommand.TURN_LEFT;

        case "turnRight":
          return EngineCommand.TURN_RIGHT;

        case "repeat": {
          // Push ONE frame with repeatLeft counter
          // The frame will automatically loop when exhausted
          if (block.times > 0) {
            this.stack.push({
              blocks: block.children,
              index: 0,
              repeatLeft: block.times,
            });
          }
          // Continue to process the pushed frame
          continue;
        }

        case "ifObstacleAhead": {
          // Evaluate condition at runtime
          if (this.conditionChecker()) {
            // Condition true: execute children
            if (block.children.length > 0) {
              this.stack.push({ blocks: block.children, index: 0 });
            }
          } else if (block.elseChildren && block.elseChildren.length > 0) {
            // Condition false: execute elseChildren if present
            this.stack.push({ blocks: block.elseChildren, index: 0 });
          }
          // Continue to next iteration
          continue;
        }

        case "whileObstacleAhead": {
          // Evaluate condition at runtime
          if (this.conditionChecker()) {
            // Condition true: push while frame
            if (block.children.length > 0) {
              this.stack.push({
                blocks: block.children,
                index: 0,
                isWhile: true,
              });
            }
          }
          // If condition false, skip the while block entirely
          continue;
        }
      }
    }

    // Stack is empty, no more commands
    return null;
  }

  /**
   * Start automatic execution with a callback for each command
   * @param callback Function to call with each command
   * @param intervalMs Delay between commands in milliseconds
   */
  run(callback: (cmd: EngineCommand) => void, intervalMs: number = 500): void {
    if (this.isRunning && !this.isPaused) {
      return; // Already running and not paused
    }

    if (this.isPaused) {
      // Resume from pause
      this.resume();
      return;
    }

    // Start new run
    this.isRunning = true;
    this.isPaused = false;
    this.callback = callback;
    this.intervalMs = intervalMs;

    this.intervalId = window.setInterval(() => {
      if (!this.isPaused) {
        if (this.hasNext()) {
          const cmd = this.next();
          if (cmd && this.callback) {
            this.callback(cmd);
          }
        } else {
          // Execution complete
          this.stop();
        }
      }
    }, this.intervalMs);
  }

  /**
   * Pause execution without clearing the interval
   * Execution can be resumed with resume()
   */
  pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
    }
  }

  /**
   * Resume execution after pause
   */
  resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
    }
  }

  /**
   * Stop execution completely
   * Clears the interval and resets running state
   */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.isPaused = false;
    this.callback = null;
  }

  /**
   * Get current execution state
   */
  getState(): { isRunning: boolean; isPaused: boolean; hasNext: boolean } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      hasNext: this.hasNext(),
    };
  }
}
