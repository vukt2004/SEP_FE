import type { Vector2 } from "../core/Vector2";

/**
 * Transform Component - Represents position in 2D space
 */
export interface TransformComponent {
  position: Vector2;
}

/**
 * Velocity Component - Represents movement speed
 */
export interface VelocityComponent {
  velocity: Vector2;
}

/**
 * Collider Component - AABB collision bounds
 */
export interface ColliderComponent {
  width: number;
  height: number;
  offset?: Vector2; // Optional offset from position
  isStatic: boolean; // Static entities don't move (walls, obstacles)
}

/**
 * Platform Component - For platformer physics
 */
export interface PlatformComponent {
  gravity: number; // Gravity acceleration (pixels/second²)
  grounded: boolean; // Is entity standing on ground
  jumpForce: number; // Jump velocity (negative for upward)
}

/**
 * Entity with components
 * Use ComponentTags to specify which components an entity has
 */
export interface Entity {
  id: string;
  transform?: TransformComponent;
  velocity?: VelocityComponent;
  collider?: ColliderComponent;
  platform?: PlatformComponent;
}

/**
 * Type guards for checking component existence
 */
export function hasTransform(entity: Entity): entity is Entity & { transform: TransformComponent } {
  return entity.transform !== undefined;
}

export function hasVelocity(entity: Entity): entity is Entity & { velocity: VelocityComponent } {
  return entity.velocity !== undefined;
}

export function hasCollider(entity: Entity): entity is Entity & { collider: ColliderComponent } {
  return entity.collider !== undefined;
}

export function hasPlatform(entity: Entity): entity is Entity & { platform: PlatformComponent } {
  return entity.platform !== undefined;
}

/**
 * Check if entity is dynamic (has velocity and is not static)
 */
export function isDynamic(entity: Entity): boolean {
  return hasVelocity(entity) && hasCollider(entity) && !entity.collider.isStatic;
}

/**
 * Check if entity is static (no velocity or marked as static)
 */
export function isStatic(entity: Entity): boolean {
  return hasCollider(entity) && entity.collider.isStatic;
}

/**
 * Check if entity is a platform entity (has all required components for platformer physics)
 */
export function isPlatformEntity(entity: Entity): boolean {
  return hasTransform(entity) && hasVelocity(entity) && hasCollider(entity) && hasPlatform(entity);
}
