# Object Sprites System

This directory contains the object sprite loading system for the map editor, similar to the tileset loading system.

## Structure

- **ObjectDefinition.ts** - TypeScript interface defining object sprite properties
- **ObjectSpriteLoader.ts** - Loads object definitions from JSON files
- **ObjectSpriteCache.ts** - Caches loaded sprite images
- **objects.json** - Default object sprite definitions
- **index.ts** - Main exports

## Usage

```typescript
import {
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
} from "@/shared/assets/objects";

const loader = new ObjectSpriteLoader();
const cache = new ObjectSpriteCache();

// Load definitions
const objects = await loader.loadObjectDefinitions("objects");

// Load sprite images
for (const objDef of Object.values(objects)) {
  await cache.loadSprite(objDef.imagePath);
}

// Get cached sprite
const playerSprite = cache.getSprite(objects.player.imagePath);
```

## Object Definition Format

Each object in `objects.json` has the following structure:

```json
{
  "objectType": {
    "imagePath": "/path/to/sprite.png",
    "frameWidth": 32,
    "frameHeight": 32,
    "frameIndex": 0
  }
}
```

- **imagePath**: Path to the sprite sheet image
- **frameWidth**: Width of a single frame in pixels
- **frameHeight**: Height of a single frame in pixels
- **frameIndex**: Which frame to use from the sprite sheet (0 = first frame)

## Adding New Objects

1. Add the sprite definition to `objects.json`
2. The loader and cache will automatically handle the new object
3. Update the renderer to handle the new object type

## Integration

The system is used by:

- **GridRenderer.ts** - Renders objects on the map editor canvas
- Can be extended for game runtime rendering with animations
