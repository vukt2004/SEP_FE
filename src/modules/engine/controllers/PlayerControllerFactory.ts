import type { IPlayerController } from "./IPlayerController";
import { TopDownController } from "./TopDownController";
import { PlatformController } from "./PlatformController";
import { LevelType } from "../core/GameConfig";

/**
 * Factory for creating player controllers based on level type
 * Uses Strategy Pattern to select appropriate controller
 */
export class PlayerControllerFactory {
  private static controllers: Map<LevelType, IPlayerController> = new Map();

  /**
   * Get or create a controller for the specified level type
   */
  static getController(levelType: LevelType): IPlayerController {
    // Use singleton pattern for controllers (they're stateless)
    if (!this.controllers.has(levelType)) {
      this.controllers.set(levelType, this.createController(levelType));
    }
    return this.controllers.get(levelType)!;
  }

  /**
   * Create a new controller instance based on level type
   */
  private static createController(levelType: LevelType): IPlayerController {
    switch (levelType) {
      case LevelType.TopDown:
        return new TopDownController();
      case LevelType.Platform:
        return new PlatformController();
      default:
        throw new Error(`Unknown level type: ${levelType}`);
    }
  }
}
