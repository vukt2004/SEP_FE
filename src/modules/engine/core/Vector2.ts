export interface Vector2 {
  x: number;
  y: number;
}

export const Vector2 = {
  zero(): Vector2 {
    return { x: 0, y: 0 };
  },

  add(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x + b.x, y: a.y + b.y };
  },

  subtract(a: Vector2, b: Vector2): Vector2 {
    return { x: a.x - b.x, y: a.y - b.y };
  },

  multiply(v: Vector2, scalar: number): Vector2 {
    return { x: v.x * scalar, y: v.y * scalar };
  },

  length(v: Vector2): number {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  normalize(v: Vector2): Vector2 {
    const len = Vector2.length(v);
    if (len === 0) return Vector2.zero();
    return { x: v.x / len, y: v.y / len };
  },

  copy(v: Vector2): Vector2 {
    return { x: v.x, y: v.y };
  },
};
