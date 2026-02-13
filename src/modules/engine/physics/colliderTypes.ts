export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ICollider {
  entityId: string;
  getBounds(): Rect;
  isTrigger: boolean;
}
