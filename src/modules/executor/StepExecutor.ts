import type { BlockProgram, ASTNode, ConditionType } from "./types";
import type { ExecutionResult } from "./commands";

/**
 * Stack frame for execution state tracking
 * - nodes: The array of AST nodes to execute
 * - index: Current position in the nodes array
 * - repeatLeft: For repeat blocks, tracks remaining iterations
 * - whileCondition: For while loops, specifies which condition to check
 * - isDoWhile: For do-while loops, indicates this is a do-while frame
 * - doWhileFirstRun: For do-while loops, tracks if this is the first execution
 */
interface StackFrame {
  nodes: ASTNode[];
  index: number;
  repeatLeft?: number;
  whileCondition?: ConditionType;
  isDoWhile?: boolean;
  doWhileFirstRun?: boolean;
}

/**
 * StepExecutor interprets and executes a block-based program using a stack-based execution model.
 *
 * Execution model:
 * - Maintains a stack of frames, each representing a sequence of AST nodes to execute
 * - Executes the top frame's current node, then advances
 * - Control flow blocks (repeat, if, while) push new frames onto the stack
 * - When a frame completes, it's popped from the stack
 *
 * Features:
 * - Step-by-step execution via next()
 * - Automatic execution via run()
 * - Pause/resume support
 * - Repeat loops with proper iteration counting
 * - Conditional if branching (pathAhead, wallAhead)
 * - While loops with runtime condition checking
 * - Returns ExecutionResult with command and blockId for UI highlighting
 * - Absolute movement in 2D grid (up, down, left, right)
 */
export class StepExecutor {
  private stack: StackFrame[];
  private originalProgram: BlockProgram;
  private timeoutId: number | null;
  private isRunning: boolean;
  private isPaused: boolean;
  private conditionChecker: (condition: ConditionType) => boolean;
  private callback: ((result: ExecutionResult) => void) | null;
  private intervalMs: number;

  constructor(program: BlockProgram, conditionChecker: (condition: ConditionType) => boolean) {
    this.originalProgram = program;
    this.stack = [{ nodes: program, index: 0 }];
    this.timeoutId = null;
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
    this.stack = [{ nodes: this.originalProgram, index: 0 }];
  }

  /**
   * Check if there are more commands to execute
   */
  hasNext(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Execute one step and return the next command with its block ID
   *
   * Execution flow:
   * 1. Get the top stack frame
   * 2. If frame is exhausted (index >= nodes.length):
   *    - Handle repeat: decrement repeatLeft, reset index
   *    - Handle while: re-check condition, reset or pop
   *    - Otherwise: pop frame
   * 3. Get current node and advance index
   * 4. Handle node type:
   *    - Move commands: return ExecutionResult with move command and direction
   *    - Control flow: push new frames and continue
   * 5. Loop until a command is found or stack is empty
   *
   * @returns ExecutionResult with command and blockId, or null if execution is complete
   */
  next(): ExecutionResult | null {
    while (this.stack.length > 0) {
      const frame = this.stack[this.stack.length - 1];

      // Check if current frame is exhausted
      if (frame.index >= frame.nodes.length) {
        // Handle repeat loop continuation
        if (frame.repeatLeft !== undefined && frame.repeatLeft > 1) {
          frame.repeatLeft--;
          frame.index = 0; // Reset to beginning of loop
          continue;
        }

        // Handle while loop continuation
        if (frame.whileCondition && !frame.isDoWhile) {
          // Re-evaluate condition for regular while loop
          if (this.conditionChecker(frame.whileCondition)) {
            frame.index = 0; // Reset to beginning of loop
            continue;
          }
          // Condition false, exit while loop
          this.stack.pop();
          continue;
        }

        // Handle do-while loop continuation
        if (frame.isDoWhile && frame.whileCondition) {
          // For do-while, always execute at least once
          if (frame.doWhileFirstRun) {
            // First run complete, now check condition
            frame.doWhileFirstRun = false;
            if (this.conditionChecker(frame.whileCondition)) {
              frame.index = 0; // Reset to beginning of loop
              continue;
            }
          } else {
            // Check condition for subsequent runs
            if (this.conditionChecker(frame.whileCondition)) {
              frame.index = 0; // Reset to beginning of loop
              continue;
            }
          }
          // Condition false, exit do-while loop
          this.stack.pop();
          continue;
        }

        // Regular frame exhausted, pop it
        this.stack.pop();
        continue;
      }

      // Get current node and advance index
      const node = frame.nodes[frame.index];
      frame.index++;

      // Handle node based on type
      switch (node.type) {
        case "move":
          return {
            command: {
              type: "move",
              direction: node.direction,
            },
            blockId: node.blockId,
          };

        case "moveForward":
          return {
            command: {
              type: "moveForward",
            },
            blockId: node.blockId,
          };

        case "turn":
          return {
            command: {
              type: "turn",
              rotation: node.rotation,
            },
            blockId: node.blockId,
          };

        case "repeat": {
          // Push ONE frame with repeatLeft counter
          // The frame will automatically loop when exhausted
          // Defensive handling: ensure times is a valid positive number
          const times = Math.max(0, node.times ?? 0);
          if (times > 0) {
            this.stack.push({
              nodes: node.body,
              index: 0,
              repeatLeft: times,
            });
          }
          // Continue to process the pushed frame
          continue;
        }

        case "customIf": {
          // Evaluate dynamic condition
          const conditionResult = this.evaluateCondition(node.condition);
          if (conditionResult) {
            // Condition true: execute body
            if (node.body.length > 0) {
              this.stack.push({ nodes: node.body, index: 0 });
            }
          } else {
            // Condition false: execute else branch
            if (node.elseBranch.length > 0) {
              this.stack.push({ nodes: node.elseBranch, index: 0 });
            }
          }
          // Continue to next iteration
          continue;
        }

        case "customWhile": {
          // Evaluate dynamic condition
          const conditionResult = this.evaluateCondition(node.condition);
          if (conditionResult) {
            // Condition true: push while frame
            if (node.body.length > 0) {
              this.stack.push({
                nodes: node.body,
                index: 0,
                whileCondition: this.extractConditionType(node.condition),
              });
            }
          }
          // If condition false, skip the while block entirely
          continue;
        }

        case "customDoWhile": {
          // Do-while always executes body at least once
          if (node.body.length > 0) {
            this.stack.push({
              nodes: node.body,
              index: 0,
              whileCondition: this.extractConditionType(node.condition),
              isDoWhile: true,
              doWhileFirstRun: true,
            });
          }
          // Continue to process the pushed frame
          continue;
        }

        case "condition":
          // Condition blocks shouldn't be executed directly in the main flow
          // They should only be evaluated as part of if/while blocks
          console.warn("Condition block executed directly - this should not happen");
          continue;
      }
    }

    // Stack is empty, no more commands
    return null;
  }

  /**
   * Evaluate a condition node and return boolean result
   * @param conditionNode The condition AST node to evaluate
   * @returns true if condition is met, false otherwise
   */
  private evaluateCondition(conditionNode: ASTNode | null): boolean {
    if (!conditionNode) {
      return false;
    }

    if (conditionNode.type === "condition") {
      return this.conditionChecker(conditionNode.conditionType);
    }

    // Unknown condition type
    console.warn("Unknown condition type:", conditionNode.type);
    return false;
  }

  /**
   * Extract the condition type from a condition node
   * Used to store condition type in while loop frames
   * @param conditionNode The condition AST node
   * @returns The condition type, or undefined if not extractable
   */
  private extractConditionType(conditionNode: ASTNode | null): ConditionType | undefined {
    if (!conditionNode || conditionNode.type !== "condition") {
      return undefined;
    }
    return conditionNode.conditionType;
  }

  /**
   * Internal execution tick using recursive setTimeout
   * Safer than setInterval as it prevents overlapping execution
   */
  private tick(): void {
    // Check if execution should continue
    if (!this.isRunning) {
      return;
    }

    // Skip execution if paused, but schedule next tick
    if (this.isPaused) {
      this.timeoutId = window.setTimeout(() => this.tick(), this.intervalMs);
      return;
    }

    // Execute next command
    const result = this.next();

    if (result && this.callback) {
      // Command executed successfully, invoke callback
      this.callback(result);
      // Schedule next tick
      this.timeoutId = window.setTimeout(() => this.tick(), this.intervalMs);
    } else {
      // Execution complete (result is null), stop immediately
      this.stop();
    }
  }

  /**
   * Start automatic execution with a callback for each command
   * @param callback Function to call with each ExecutionResult (command + blockId)
   * @param intervalMs Delay between commands in milliseconds
   */
  run(callback: (result: ExecutionResult) => void, intervalMs: number = 500): void {
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

    // Start execution with first tick
    this.tick();
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
   * Clears the timeout and resets running state
   */
  stop(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
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
