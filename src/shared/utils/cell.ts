export interface GridCell {
  x: number;
  y: number;
}

export function stringifyCell(x: number, y: number): string {
  return `${x},${y}`;
}

export function parseCell(cell: string): GridCell | null {
  const parts = cell.split(",");
  if (parts.length !== 2) {
    return null;
  }

  const x = Number(parts[0]);
  const y = Number(parts[1]);

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.trunc(x),
    y: Math.trunc(y),
  };
}

export function getRawNeighbors(cell: string): string[] {
  const parsed = parseCell(cell);
  if (!parsed) {
    return [];
  }

  return [
    stringifyCell(parsed.x + 1, parsed.y),
    stringifyCell(parsed.x - 1, parsed.y),
    stringifyCell(parsed.x, parsed.y + 1),
    stringifyCell(parsed.x, parsed.y - 1),
  ];
}
