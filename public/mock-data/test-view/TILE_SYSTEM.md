# Tile System Documentation

## Overview

The tile rendering system uses **game-type-specific sprite assets** to visualize maps. The system supports multiple game types (topdown, platformer) with their own dedicated sprite packs.

## Architecture

### Multi-Game-Type Asset System

Assets are organized by game type:

```
src/shared/assets/
  topdown/
    tilesets/default.json    - Sprout Lands tiles
    animations/player.json   - Character animations
    objects/objects.json     - Interactive objects
  platformer/
    tilesets/default.json    - Pixel Adventure tiles
    animations/player.json   - Character animations
    objects/objects.json     - Interactive objects

public/assets/
  Sprout Lands - Sprites - Basic pack/  - Topdown sprites
  Pixel Adventure 1/                     - Platformer sprites
```

### Tileset Definition Format

Tilesets are defined in JSON files using numeric tile IDs:

```json
{
  "name": "default",
  "description": "Tileset description",
  "tiles": {
    "0": {
      "imagePath": "/assets/Sprite Pack/Tilesets/Grass.png",
      "tileX": 1,
      "tileY": 0,
      "tileSize": 16
    },
    "1": {
      "imagePath": "/assets/Sprite Pack/Terrain/Terrain.png",
      "tileX": 0,
      "tileY": 0,
      "tileSize": 16
    }
  }
}
```

**TileDefinition Properties:**

- `imagePath` - Absolute path to sprite sheet (starts with `/assets/`)
- `tileX` - X position in tileset (in tiles, 0-based)
- `tileY` - Y position in tileset (in tiles, 0-based)
- `tileSize` - Size of one tile in pixels (usually 16 or 32)

### Tileset Cache

Automatically loads and caches tileset images:

- Images loaded once and reused across frames
- Async loading with promise handling
- Automatic error recovery with fallback rendering

### Rendering Pipeline

1. **Initialization Phase**:
   - GameEngine receives `gameType` parameter ("topdown" or "platformer")
   - Loads tileset definitions from `src/shared/assets/{gameType}/tilesets/`
   - Preloads all tileset images referenced in the level

2. **Render Phase** (every frame):
   - Renders layers in order: background → ground → objects/player → foreground
   - For each tile, looks up definition and draws from cached sprite sheet
   - Tile ID `0` is treated as transparent/empty

## Available Tiles

### Topdown Tiles (Sprout Lands)

Location: `src/shared/assets/topdown/tilesets/default.json`

| Tile ID | Description              | Source Image                | Position |
| ------- | ------------------------ | --------------------------- | -------- |
| 0       | Grass (light)            | Grass.png                   | (1,0)    |
| 1       | Grass (dark)             | Grass.png                   | (0,0)    |
| 2       | Grass (medium)           | Grass.png                   | (2,0)    |
| 3       | Grass (variant)          | Grass.png                   | (3,0)    |
| 4       | Small plant              | Basic_Plants.png            | (0,0)    |
| 5       | Bridge left              | Wood_Bridge.png             | (0,0)    |
| 6       | Bridge right             | Wood_Bridge.png             | (1,0)    |
| 7       | Tree canopy L            | Basic_Grass_Biom_things.png | (0,0)    |
| 8       | Tree canopy C            | Basic_Grass_Biom_things.png | (1,0)    |
| 9       | Bush                     | Basic_Plants.png            | (1,0)    |
| 10      | Water                    | Water.png                   | (0,0)    |
| 11-15   | Soil, fence, chest, path | Various                     | Various  |

### Platformer Tiles (Pixel Adventure)

Location: `src/shared/assets/platformer/tilesets/default.json`

| Tile ID | Description      | Source Image        | Position |
| ------- | ---------------- | ------------------- | -------- |
| 0       | Sky/empty        | Terrain (16x16).png | (6,0)    |
| 1       | Stone block      | Terrain (16x16).png | (1,0)    |
| 2       | Ground top-left  | Terrain (16x16).png | (0,0)    |
| 3       | Ground top-right | Terrain (16x16).png | (2,0)    |
| 4-12    | Terrain variants | Terrain (16x16).png | Various  |

## Adding New Tiles

### Step 1: Add Tile to Tileset JSON

Edit the appropriate tileset file:

- Topdown: `src/shared/assets/topdown/tilesets/default.json`
- Platformer: `src/shared/assets/platformer/tilesets/default.json`

```json
{
  "name": "default",
  "description": "My tileset",
  "tiles": {
    "16": {
      "imagePath": "/assets/Pixel Adventure 1/Terrain/Terrain (16x16).png",
      "tileX": 3,
      "tileY": 1,
      "tileSize": 16
    }
  }
}
```

### Step 2: Use in Level Data

Update level JSON files to use the new tile ID (numeric):

```json
{
  "layers": {
    "background": [
      [1, 1, 1, 1, 1],
      [1, 16, 0, 0, 1],
      [1, 1, 1, 1, 1]
    ],
    "collision": [
      [true, true, true, true, true],
      [true, false, false, false, true],
      [true, true, true, true, true]
    ]
  }
}
```

### Step 3: Test

The tile will automatically be loaded and rendered when the level initializes. Refresh the page to see changes.

## Layer System Details

### Background Layer

- Base visual layer
- Rendered first (bottom-most)
- Use for floors, walls, base terrain

### Ground Layer (Optional)

- Mid-layer for decorations
- Rendered after background, before player
- Use for small objects on the ground (flowers, rocks, items)
- Use `0` for transparent/empty cells

### Foreground Layer (Optional)

- Top layer for depth effects
- Rendered AFTER player (covers player)
- Use for tree canopies, overhangs, bridges
- Creates visual depth and hiding spots
- Use `0` for transparent/empty cells

### Collision Layer

- Boolean grid (true/false)
- Independent of visual layers
- `true` = blocked, `false` = walkable

## Available Sprite Packs

### Sprout Lands - Sprites - Basic pack (Topdown)

Located in `/public/assets/Sprout Lands - Sprites - Basic pack/`

**Tilesets:**

- Grass.png - Grass variations
- Water.png - Water tiles
- Tilled_Dirt.png - Farmland
- Fences.png - Fence pieces
- Wooden*House*\*.png - Building tiles

**Objects:**

- Basic_Plants.png - Flowers, bushes
- Basic_Grass_Biom_things.png - Trees, rocks
- Wood_Bridge.png - Bridge pieces
- Chest.png - Treasure chest
- Paths.png - Path tiles

**Characters:**

- Basic Charakter Spritesheet.png - Player sprites (48x48)

### Pixel Adventure 1 (Platformer)

Located in `/public/assets/Pixel Adventure 1/`

**Terrain:**

- Terrain (16x16).png - Ground blocks, platforms

**Main Characters:**

- Mask Dude/ - Player character (32x32)
  - Idle, Run, Jump, Fall, Hit, Wall Jump, Double Jump

**Items:**

- Fruits/ - Collectibles (Apple, Banana, Cherry, etc.)
- Boxes/ - Breakable boxes
- Checkpoints/ - Level checkpoints

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
