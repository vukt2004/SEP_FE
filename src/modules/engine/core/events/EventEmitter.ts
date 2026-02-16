/**
 * Generic type-safe EventEmitter for event-driven architecture
 *
 * Supports discriminated union event types with full type inference
 * Uses Map and Set for efficient listener management
 * Prevents duplicate listener registration
 *
 * @example
 * type MyEvents =
 *   | { type: "userLogin"; userId: string }
 *   | { type: "userLogout" };
 *
 * const emitter = new EventEmitter<MyEvents>();
 *
 * // Callback is automatically typed to { type: "userLogin"; userId: string }
 * emitter.on("userLogin", (event) => {
 *   console.log(event.userId); // ✅ Type-safe
 * });
 */
export class EventEmitter<T extends { type: string }> {
  private listeners: Map<string, Set<(event: T) => void>>;

  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event listener for a specific event type
   * Callback is automatically narrowed to the specific event shape
   * Duplicate listeners are automatically prevented
   *
   * @param type - The event type to listen for
   * @param callback - Function to call when event is emitted (narrowed to specific event type)
   */
  on<K extends T["type"]>(type: K, callback: (event: Extract<T, { type: K }>) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const callbacks = this.listeners.get(type)!;
    // Cast necessary for internal storage - runtime guarantees type safety
    callbacks.add(callback as (event: T) => void);
  }

  /**
   * Register a one-time event listener
   * Automatically removed after first invocation
   *
   * @param type - The event type to listen for
   * @param callback - Function to call once when event is emitted
   */
  once<K extends T["type"]>(type: K, callback: (event: Extract<T, { type: K }>) => void): void {
    const onceWrapper = (event: Extract<T, { type: K }>) => {
      this.off(type, onceWrapper);
      callback(event);
    };
    this.on(type, onceWrapper);
  }

  /**
   * Remove an event listener for a specific event type
   * Callback type must match the one used in on()
   *
   * @param type - The event type to stop listening to
   * @param callback - The specific callback to remove
   */
  off<K extends T["type"]>(type: K, callback: (event: Extract<T, { type: K }>) => void): void {
    const callbacks = this.listeners.get(type);
    if (!callbacks) {
      return;
    }

    callbacks.delete(callback as (event: T) => void);

    // Clean up empty sets to prevent memory leaks
    if (callbacks.size === 0) {
      this.listeners.delete(type);
    }
  }

  /**
   * Emit an event to all registered listeners
   * Event type is narrowed based on the type property
   * Listeners are called synchronously in registration order
   *
   * @param event - The event object to emit
   */
  emit<K extends T["type"]>(event: Extract<T, { type: K }>): void {
    const callbacks = this.listeners.get(event.type);
    if (!callbacks) {
      return;
    }

    // Iterate over a copy to allow listeners to modify subscriptions
    const callbackArray = Array.from(callbacks);
    for (const callback of callbackArray) {
      callback(event as T);
    }
  }

  /**
   * Remove all listeners for a specific type, or all listeners if no type provided
   *
   * @param type - Optional event type to clear. If omitted, clears all listeners
   */
  removeAll(type?: T["type"]): void {
    if (type === undefined) {
      // Clear all listeners
      this.listeners.clear();
    } else {
      // Clear listeners for specific type
      this.listeners.delete(type);
    }
  }

  /**
   * Get the number of listeners for a specific event type
   * Useful for debugging and testing
   *
   * @param type - The event type to check
   * @returns Number of registered listeners
   */
  listenerCount(type: T["type"]): number {
    const callbacks = this.listeners.get(type);
    return callbacks ? callbacks.size : 0;
  }

  /**
   * Check if there are any listeners registered
   *
   * @param type - Optional event type to check. If omitted, checks all types
   * @returns True if listeners exist
   */
  hasListeners(type?: T["type"]): boolean {
    if (type === undefined) {
      return this.listeners.size > 0;
    }
    return this.listenerCount(type) > 0;
  }
}
