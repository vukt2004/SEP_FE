# Mock Level Data

This folder contains JSON files representing level definitions for the educational game engine.

**Location:** `public/mock-data/` - Files here are served by Vite at `/mock-data/` URL path.

## 🎨 Sprite-Based Rendering

The game now uses **sprite-based tiles** from `/public/assets` for visual richness!

- **Background layer**: Visual tiles rendered from sprite sheets
- **Collision layer**: Separate boolean grid for movement logic
- **Tile Registry**: Maps tile IDs to sprite positions (see `TILE_SYSTEM.md`)

## Structure

### levels-index.json

Main index file that lists all available levels. Used to browse and select levels.

```json
{
  "levels": [
    {
      "id": "level-id",
      "file": "level-file.json",
      "name": "Display Name",
      "type": "topdown | platform",
      "difficulty": "easy | medium | hard"
    }
  ]
}
```

### Level Files

Individual level definition files following the `LevelDefinition` type:

```json
{
  "id": "unique-level-id",
  "name": "Level Display Name",
  "width": 15,
  "height": 12,
  "layers": {
    "background": [
      ["wall", "wall", "wall", ...],
      ["wall", "start", "empty", ...],
      ...
    ],
    "collision": [
      [true, true, true, ...],
      [true, false, false, ...],
      ...
    ]
  },
  "startPosition": { "row": 1, "col": 1 },
  "goalPosition": { "row": 10, "col": 13 },
  "objects": [
    {
      "id": "object-1",
      "type": "door",
      "position": { "row": 1, "col": 5 },
      "initialState": "closed",
      "metadata": {}
    }
  ],
  "metadata": {
    "difficulty": "easy",
    "description": "Level description",
    "targetAlgorithm": "BFS",
    "estimatedSteps": 25
  }
}
```

## Layer System

### Background Layer

String array defining **visual appearance**. Each tile ID maps to a sprite in the tile registry.

**Available Tile IDs:**

- `"empty"` - Blue background sky
- `"wall"` - Stone block from terrain tileset
- `"start"` - Blue tile (start marker)
- `"goal"` - Green tile (goal marker)
- `"grass"` - Green grass tile
- `"terrain-block"` - Brown ground block

See `TILE_SYSTEM.md` for adding custom tiles.

### Collision Layer

Boolean array defining **movement logic**:

- `true` = Blocked (cannot walk through)
- `false` = Walkable (can move here)

**Important:** Background and collision layers are **independent**:

- Visual tile doesn't determine collision
- You can have decorative walls that are walkable
- Or invisible barriers (empty tile but collision = true)

## Usage

### Loading a Level

```typescript
import { loadLevelFromMockData } from "../utils/levelLoader";

const level = await loadLevelFromMockData("level-tutorial-01");

// Use directly with GameEngine
const tileSize = 16;
const engine = new GameEngine(level, tileSize, ctx, config);
```

## Migration Plan

**Current:** Mock JSON files in this folder
**Future:** API endpoints returning the same JSON structure

The loader utility (`levelLoader.ts`) will be updated to call API endpoints instead of fetching local files. The data structure will remain the same.

## Adding New Levels

1. Create a new JSON file: `level-{name}.json`
2. Follow the structure above
3. Add an entry to `levels-index.json`
4. Tiles array is [row][col] format, top-left origin
5. Test the level by updating the `loadLevelFromMockData` call in view components
