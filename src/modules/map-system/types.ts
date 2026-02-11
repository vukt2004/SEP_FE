export interface MapObject {
  id: string;
  type: string;
  x: number; // pixel-based position
  y: number;
  state?: string;
}

export interface TileMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  objects: MapObject[];
}
