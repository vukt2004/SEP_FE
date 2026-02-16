# Mock Level Data

This folder contains JSON files representing level definitions for the educational game engine.

**Location:** `public/mock-data/` - Files here are served by Vite at `/mock-data/` URL path.

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
  "tiles": [
    ["wall", "wall", ...],
    ["wall", "start", "empty", ...],
    ...
  ],
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

## Tile Types

- `"empty"` - Walkable tile
- `"wall"` - Blocked tile
- `"start"` - Starting position (also walkable)
- `"goal"` - Goal position (also walkable)

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
