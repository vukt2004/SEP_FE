import type { Entity } from "../../components/components";
import { isDynamic, isStatic, hasTransform, hasCollider } from "../../components/components";
import type { TileMap } from "../../../map-system/types";

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * TopDownMovementSystem
 *
 * Handles physics and collision resolution for top-down 2D games.
 * Uses axis-separated collision resolution for smooth wall sliding.
 *
 * Algorithm:
 * 1. Move entity along X-axis
 * 2. Check collisions, resolve if needed
 * 3. Move entity along Y-axis
 * 4. Check collisions, resolve if needed
 *
 * This allows entities to slide along walls naturally.
 */
export class TopDownMovementSystem {
  private entities: Entity[] = [];

  /**
   * Register an entity to be processed by this system
   */
  registerEntity(entity: Entity): void {
    if (!this.entities.includes(entity)) {
      this.entities.push(entity);
    }
  }

  /**
   * Unregister an entity from this system
   */
  unregisterEntity(entityId: string): void {
    this.entities = this.entities.filter((e) => e.id !== entityId);
  }

  /**
   * Get all registered entities
   */
  getEntities(): Entity[] {
    return this.entities;
  }

  /**
   * Main update loop - processes movement and collision resolution
   * @param deltaTime - Time since last frame in milliseconds
   * @param tileMap - Optional tilemap for tile-based collision
   */
  update(deltaTime: number, tileMap?: TileMap): void {
    // Convert deltaTime from milliseconds to seconds for physics calculations
    const dt = deltaTime / 1000;

    // Only process dynamic entities (entities with velocity that can move)
    const dynamicEntities = this.entities.filter(isDynamic);
    const staticEntities = this.entities.filter(isStatic);

    for (const entity of dynamicEntities) {
      this.updateEntity(entity, staticEntities, dt, tileMap);
    }
  }

  /**
   * Update a single entity with axis-separated collision resolution
   */
  private updateEntity(
    entity: Entity,
    staticEntities: Entity[],
    dt: number,
    tileMap?: TileMap,
  ): void {
    if (!hasTransform(entity) || !entity.velocity || !hasCollider(entity)) {
      return;
    }

    const transform = entity.transform;
    const velocity = entity.velocity.velocity;

    // Store original position for potential revert
    const originalX = transform.position.x;
    const originalY = transform.position.y;

    // ========== X-AXIS MOVEMENT ==========
    // Move along X first
    transform.position.x += velocity.x * dt;

    // Check collision on X-axis (both entity and tile)
    const hasEntityCollisionX = this.hasCollisionWithStatic(entity, staticEntities);
    const hasTileCollisionX = tileMap ? this.hasTileCollision(entity, tileMap) : false;

    if (hasEntityCollisionX || hasTileCollisionX) {
      // Collision detected - revert X movement
      transform.position.x = originalX;
      velocity.x = 0; // Stop X velocity
    }

    // ========== Y-AXIS MOVEMENT ==========
    // Then move along Y
    transform.position.y += velocity.y * dt;

    // Check collision on Y-axis (both entity and tile)
    const hasEntityCollisionY = this.hasCollisionWithStatic(entity, staticEntities);
    const hasTileCollisionY = tileMap ? this.hasTileCollision(entity, tileMap) : false;

    if (hasEntityCollisionY || hasTileCollisionY) {
      // Collision detected - revert Y movement
      transform.position.y = originalY;
      velocity.y = 0; // Stop Y velocity
    }
  }

  /**
   * Check if entity collides with any static entity
   */
  private hasCollisionWithStatic(entity: Entity, staticEntities: Entity[]): boolean {
    for (const staticEntity of staticEntities) {
      if (this.checkAABBCollision(entity, staticEntity)) {
        return true;
      }
    }
    return false;
  }

  /**
   * AABB collision detection between two entities
   * Returns true if entities overlap
   */
  private checkAABBCollision(a: Entity, b: Entity): boolean {
    if (!hasTransform(a) || !hasCollider(a) || !hasTransform(b) || !hasCollider(b)) {
      return false;
    }

    const boundsA = this.getEntityBounds(a);
    const boundsB = this.getEntityBounds(b);

    return (
      boundsA.x < boundsB.x + boundsB.width &&
      boundsA.x + boundsA.width > boundsB.x &&
      boundsA.y < boundsB.y + boundsB.height &&
      boundsA.y + boundsA.height > boundsB.y
    );
  }

  /**
   * Get axis-aligned bounding box for an entity
   */
  private getEntityBounds(entity: Entity): Rect {
    if (!hasTransform(entity) || !hasCollider(entity)) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const transform = entity.transform;
    const collider = entity.collider;
    const offset = collider.offset || { x: 0, y: 0 };

    return {
      x: transform.position.x + offset.x,
      y: transform.position.y + offset.y,
      width: collider.width,
      height: collider.height,
    };
  }

  /**
   * Check if entity collides with any solid tile (value === 1)
   * Only checks tiles overlapping the entity's AABB for performance
   */
  private hasTileCollision(entity: Entity, tileMap: TileMap): boolean {
    const bounds = this.getEntityBounds(entity);
    const tileSize = tileMap.tileSize;

    // Convert world coordinates to tile coordinates
    const minTileX = Math.floor(bounds.x / tileSize);
    const maxTileX = Math.floor((bounds.x + bounds.width - 1) / tileSize);
    const minTileY = Math.floor(bounds.y / tileSize);
    const maxTileY = Math.floor((bounds.y + bounds.height - 1) / tileSize);

    // Only check tiles that overlap with the entity's bounding box
    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        // Check bounds to avoid indexing outside the map
        if (
          tileY >= 0 &&
          tileY < tileMap.tiles.length &&
          tileX >= 0 &&
          tileX < tileMap.tiles[tileY].length
        ) {
          // Check if this tile is solid (value === 1)
          if (tileMap.tiles[tileY][tileX] === 1) {
            return true; // Collision with solid tile
          }
        }
      }
    }

    return false; // No collision with any solid tiles
  }

  /**
   * Clear all registered entities
   */
  clear(): void {
    this.entities = [];
  }
}
