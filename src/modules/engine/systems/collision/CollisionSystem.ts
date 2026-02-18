import type { ICollider, Rect } from "../../physics/colliderTypes";
import type { EngineEvent } from "../../core/engineEvents";

function isColliding(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export class CollisionSystem {
  private colliders: Map<string, ICollider> = new Map();
  private previousCollisions: Set<string> = new Set();
  private eventEmitter: ((event: EngineEvent) => void) | null = null;

  registerCollider(collider: ICollider): void {
    this.colliders.set(collider.entityId, collider);
  }

  unregisterCollider(entityId: string): void {
    this.colliders.delete(entityId);
  }

  getCollider(entityId: string): ICollider | undefined {
    return this.colliders.get(entityId);
  }

  setEventEmitter(emitter: (event: EngineEvent) => void): void {
    this.eventEmitter = emitter;
  }

  update(): void {
    const colliderArray = Array.from(this.colliders.values());
    const currentCollisions = new Set<string>();

    // O(n²) collision detection
    for (let i = 0; i < colliderArray.length; i++) {
      for (let j = i + 1; j < colliderArray.length; j++) {
        const colliderA = colliderArray[i];
        const colliderB = colliderArray[j];

        const boundsA = colliderA.getBounds();
        const boundsB = colliderB.getBounds();

        if (isColliding(boundsA, boundsB)) {
          const collisionKey = this.getCollisionKey(colliderA.entityId, colliderB.entityId);
          currentCollisions.add(collisionKey);

          // Emit collision:enter event if this is a new collision
          if (!this.previousCollisions.has(collisionKey)) {
            this.emitCollisionEnter(colliderA.entityId, colliderB.entityId);
          }
        }
      }
    }

    // Update previous collisions for next frame
    this.previousCollisions = currentCollisions;
  }

  private getCollisionKey(entityAId: string, entityBId: string): string {
    // Sort to ensure consistent key regardless of order
    return entityAId < entityBId ? `${entityAId}_${entityBId}` : `${entityBId}_${entityAId}`;
  }

  private emitCollisionEnter(entityAId: string, entityBId: string): void {
    if (this.eventEmitter) {
      this.eventEmitter({
        type: "collision:enter",
        entityAId,
        entityBId,
      });
    }
  }

  clear(): void {
    this.colliders.clear();
    this.previousCollisions.clear();
  }
}
