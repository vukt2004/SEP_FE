# Mock Level Data

This folder contains JSON files representing level definitions for the educational game engine.

**Location:** `public/mock-data/` - Files here are served by Vite at `/mock-data/` URL path.

## 🎨 Multi-Game-Type Asset System

The game uses a **multi-game-type asset system** with game-specific sprite assets:

- **Topdown levels**: Use Sprout Lands sprite pack
- **Platformer levels**: Use Pixel Adventure sprite pack
- **Asset definitions**: Located in `src/shared/assets/{gameType}/`
- **Asset images**: Located in `public/assets/`

### Layer System

Levels now support **multiple rendering layers** for depth and visual richness:

- **background**: Base layer tiles
- **ground**: Mid-layer tiles (e.g., decorations on the floor)
- **foreground**: Top layer tiles (e.g., tree canopies that render over the player)
- **collision**: Boolean grid for movement logic (independent of visuals)

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
  "width": 20,
  "height": 15,
  "tileset": "default",
  "layers": {
    "background": [
      [1, 1, 1, 1, ...],
      [1, 2, 0, 0, ...],
      ...
    ],
    "ground": [
      [0, 0, 0, 0, ...],
      [0, 4, 0, 0, ...],
      ...
    ],
    "foreground": [
      [0, 0, 0, 0, ...],
      [0, 7, 8, 0, ...],
      ...
    ],
    "collision": [
      [true, true, true, true, ...],
      [true, false, false, false, ...],
      ...
    ]
  },
  "startPosition": { "row": 1, "col": 1 },
  "goalPosition": { "row": 10, "col": 13 },
  "objects": [
    {
      "id": "object-1",
      "type": "coin",
      "position": { "row": 1, "col": 5 },
      "metadata": { "points": 10 }
    }
  ],
  "metadata": {
    "difficulty": "medium",
    "description": "Level description",
    "targetAlgorithm": "DFS",
    "estimatedSteps": 30
  }
}
```

## Layer System

### Background Layer

Numeric array defining **visual appearance**. Each tile ID maps to a sprite definition in the tileset JSON files.

**Topdown Tiles** (Sprout Lands - `src/shared/assets/topdown/tilesets/default.json`):

- `0` - Grass (light green)
- `1` - Grass (dark green)
- `2` - Grass (medium)
- `3` - Grass (variant)
- `4` - Small plant
- `5` - Bridge left
- `6` - Bridge right
- `7` - Tree canopy (left)
- `8` - Tree canopy (center)
- `9` - Bush
- `10-15` - Water, soil, fence, chest, path

**Platformer Tiles** (Pixel Adventure - `src/shared/assets/platformer/tilesets/default.json`):

- `0` - Sky/empty
- `1` - Stone block
- `2` - Ground top-left
- `3` - Ground top-right
- `4-12` - Various terrain blocks

See `TILE_SYSTEM.md` for complete tile reference and adding custom tiles.

### Ground Layer (Optional)

Numeric array for mid-layer tiles. Renders between background and player. Use `0` for transparent/empty.

### Foreground Layer (Optional)

Numeric array for top-layer tiles. **Renders above the player** for depth effects (e.g., tree canopies, overhangs). Use `0` for transparent/empty.

### Collision Layer

Boolean array defining **movement logic**:

- `true` = Blocked (cannot walk through)
- `false` = Walkable (can move here)

**Important:** Collision is **independent** of visual layers:

- Visual tiles don't determine collision
- Decorative walls can be walkable
- Invisible barriers are possible (empty tile but collision = true)

## Usage

### Loading a Level

```typescript
import { loadLevelFromMockData } from "../utils/levelLoader";

const level = await loadLevelFromMockData("level-topdown-1771989668367");

// Use directly with GameEngine
const tileSize = 48;
const gameType = "topdown"; // or "platformer"
const engine = new GameEngine(level, tileSize, ctx, config, gameType);
```

## Migration Plan

**Current:** Mock JSON files in this folder
**Future:** API endpoints returning the same JSON structure

The loader utility (`levelLoader.ts`) will be updated to call API endpoints instead of fetching local files. The data structure will remain the same.

## Adding New Levels

1. Create a new JSON file: `level-{name}.json`
2. Follow the structure shown above with numeric tile IDs
3. Add an entry to `levels-index.json` with correct type ("topdown" or "platform")
4. Choose appropriate tiles from the tileset (see TILE_SYSTEM.md)
5. All layers are [row][col] format, top-left origin (0,0)
6. Use `0` for transparent tiles in ground/foreground layers
7. Test the level in the game view
