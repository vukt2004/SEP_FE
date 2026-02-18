# Tile System Documentation

## Overview

The tile rendering system uses sprite-based tiles from the `/public/assets` folder to visualize the game map. This provides a visually rich experience compared to solid color tiles.

## Architecture

### Tile Registry (`src/modules/engine/rendering/tileRegistry.ts`)

Defines tile mappings from tile IDs to sprite positions in tileset images.

**TileDefinition Interface:**

```typescript
interface TileDefinition {
  imagePath: string; // Path to tileset image
  tileX: number; // X position in tileset (in tiles)
  tileY: number; // Y position in tileset (in tiles)
  tileSize: number; // Size of one tile in pixels
}
```

**Example Tile Definition:**

```typescript
wall: {
  imagePath: "/assets/Pixel Adventure 1/Terrain/Terrain (16x16).png",
  tileX: 1,    // Second tile horizontally
  tileY: 0,    // First row
  tileSize: 16 // Each tile is 16x16 pixels
}
```

### Tileset Cache

Automatically loads and caches tileset images to prevent redundant downloads:

- Images are loaded once and reused
- Async loading with promise handling
- Automatic error recovery with console warnings

### Rendering Pipeline

1. **Preload Phase** (on engine initialization):
   - Scans level for all unique tile IDs
   - Loads corresponding tilesets asynchronously
   - Caches images for rendering

2. **Render Phase** (every frame):
   - For each tile position, looks up tile definition
   - Draws tile from cached tileset if available
   - Falls back to solid colors if tileset not loaded

## Available Tiles

### Current Tile IDs

| Tile ID         | Description      | Tileset          | Position |
| --------------- | ---------------- | ---------------- | -------- |
| `empty`         | Empty floor/sky  | Blue background  | (0,0)    |
| `wall`          | Solid wall block | Terrain 16x16    | (1,0)    |
| `start`         | Start position   | Blue background  | (0,0)    |
| `goal`          | Goal position    | Green background | (0,0)    |
| `terrain-block` | Ground block     | Terrain 16x16    | (0,0)    |
| `grass`         | Grass tile       | Green background | (0,0)    |

## Adding New Tiles

### Step 1: Add Tile Definition

Edit `src/modules/engine/rendering/tileRegistry.ts`:

```typescript
export const tileRegistry: Record<string, TileDefinition> = {
  // ... existing tiles ...

  "my-custom-tile": {
    imagePath: "/assets/Pixel Adventure 1/Terrain/Terrain (16x16).png",
    tileX: 2, // Third tile in X direction
    tileY: 1, // Second row in Y direction
    tileSize: 16,
  },
};
```

### Step 2: Use in Level Data

Update level JSON files to use the new tile ID:

```json
{
  "layers": {
    "background": [
      ["wall", "wall", "wall"],
      ["wall", "my-custom-tile", "wall"],
      ["wall", "wall", "wall"]
    ],
    "collision": [
      [true, true, true],
      [true, false, true],
      [true, true, true]
    ]
  }
}
```

### Step 3: Test

The tile will automatically be loaded and rendered when the level initializes.

## Available Tilesets

### Pixel Adventure 1

Located in `/public/assets/Pixel Adventure 1/`

- **Terrain (16x16).png**: Various terrain blocks (grass, stone, dirt)
- **Background**: Colored background patterns
  - Blue.png, Brown.png, Gray.png, Green.png, Pink.png, Purple.png, Yellow.png

### Sprout Lands

Located in `/public/assets/Sprout Lands - Sprites - Basic pack/Tilesets/`

- Grass.png: Grass tiles with variations
- Water.png: Water tiles
- Tilled Dirt: Various farmland tiles
- Wooden House: Building tiles

## Tileset Coordinates

Tilesets are organized in grids. To find the coordinates:

1. **Open the tileset image** in an image editor
2. **Count tiles** starting from top-left (0,0)
3. **X increases** going right
4. **Y increases** going down

Example for a 16x16 tileset image (256x256 pixels):

```
(0,0)  (1,0)  (2,0)  (3,0) ...
(0,1)  (1,1)  (2,1)  (3,1) ...
(0,2)  (1,2)  (2,2)  (3,2) ...
...
```

## Performance Considerations

- **Caching**: Tilesets are loaded once and cached
- **Preloading**: All tilesets are loaded before game starts
- **Fallback**: If tileset loading fails, solid colors are used
- **Memory**: Each unique tileset consumes memory (typically 256KB-1MB per image)

## Troubleshooting

### Tiles appear as solid colors

**Cause**: Tileset not loaded or tile ID not in registry

**Solution**:

1. Check browser console for loading errors
2. Verify tile ID exists in `tileRegistry`
3. Verify image path is correct
4. Check network tab for HTTP errors

### Tiles appear stretched or wrong size

**Cause**: Tile size mismatch

**Solution**:

1. Verify `tileSize` in TileDefinition matches actual tile size in image
2. Check tileset image dimensions are multiples of tile size

### Wrong tile displayed

**Cause**: Incorrect tileX/tileY coordinates

**Solution**:

1. Open tileset in image editor
2. Count tiles from (0,0) to find correct coordinates
3. Update TileDefinition

## Future Enhancements

Potential improvements:

- Auto-tiling system (connect tiles based on neighbors)
- Animated tiles (water, lava, etc.)
- Tile variations (randomize grass tiles)
- Procedural tile generation
- Tileset composition (combine multiple tilesets)
