# Audio System

This document describes the audio system implemented in the game engine.

## Overview

The audio system provides sound effects for various game events such as jumping, walking, collecting items, and winning.

## Sound Effects Available

The following sound effects are available in `/public/assets/RPG Maker Sound Effects/`:

- **Jump.wav** - Plays when the player jumps (platformer mode)
- **GrassWalk.wav** - Plays when the player moves
- **Collect.wav** - Plays when collecting fruits/items
- **Text.wav** - Plays on win (can be replaced with a win sound)
- **LaserGun.wav** - Available for future use

## Architecture

### AudioSystem Class

Location: `src/modules/engine/systems/audio/AudioSystem.ts`

The `AudioSystem` class manages all sound effects in the game:

**Key Methods:**

- `initialize()` - Preloads all sound effects
- `play(sound: SoundEffect)` - Plays a specific sound effect
- `setVolume(volume: number)` - Sets master volume (0.0 to 1.0)
- `mute()` / `unmute()` - Mute/unmute all sounds
- `toggleMute()` - Toggle mute state
- `stopAll()` - Stops all currently playing sounds

### Integration with GameEngine

The AudioSystem is integrated into the GameEngine and automatically plays sounds for:

1. **Movement** - Walk sound plays when player successfully moves
2. **Jumping** - Jump sound plays when player jumps
3. **Fruit Collection** - Collect sound plays when collecting fruits
4. **Win Condition** - Text sound plays when game is won

### Audio Controls UI

Location: `src/pages/Game-View/AudioControls.tsx`

A UI component that provides:

- Mute/unmute button (🔇/🔊)
- Volume slider (0% to 100%)

The component is positioned in the top-right corner of the game canvas.

## Usage

### Accessing the Audio System

From the GameEngine instance:

```typescript
const audioSystem = engine.getAudioSystem();

// Control volume
audioSystem.setVolume(0.7); // 70% volume

// Mute/unmute
audioSystem.mute();
audioSystem.unmute();

// Play a specific sound manually
audioSystem.play(SoundEffect.Collect);
```

### Adding New Sound Effects

1. Add the sound file to `/public/assets/RPG Maker Sound Effects/`
2. Add a new enum value in `src/modules/engine/systems/audio/types.ts`:
   ```typescript
   export enum SoundEffect {
     // ... existing sounds
     NewSound = "newsound",
   }
   ```
3. Add the sound path in `AudioSystem.ts`:
   ```typescript
   private readonly soundPaths: Record<SoundEffect, string> = {
     // ... existing sounds
     [SoundEffect.NewSound]: "/assets/RPG Maker Sound Effects/NewSound.wav",
   };
   ```
4. Play it where needed:
   ```typescript
   this.audioSystem.play(SoundEffect.NewSound);
   ```

## Notes

- Sounds are preloaded during engine initialization
- Multiple instances of the same sound can play simultaneously
- The audio system automatically stops all sounds when the engine is stopped
- Volume and mute settings persist during gameplay
