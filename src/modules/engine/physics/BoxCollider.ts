import type { ICollider, Rect } from "./colliderTypes";

export class BoxCollider implements ICollider {
  public entityId: string;
  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public isTrigger: boolean;

  constructor(
    entityId: string,
    x: number,
    y: number,
    width: number,
    height: number,
    isTrigger: boolean = false,
  ) {
    this.entityId = entityId;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.isTrigger = isTrigger;
  }

  getBounds(): Rect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
