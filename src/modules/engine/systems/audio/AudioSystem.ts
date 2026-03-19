import { SoundEffect, type AudioConfig, type SoundInstance } from "./types";

export class AudioSystem {
  private sounds: Map<SoundEffect, SoundInstance> = new Map();
  private config: AudioConfig = {
    volume: 0.5,
    muted: false,
  };
  private isInitialized = false;

  /**
   * Sound effect file paths
   */
  private readonly soundPaths: Record<SoundEffect, string> = {
    [SoundEffect.Jump]: "/assets/RPG Maker Sound Effects/Jump.wav",
    [SoundEffect.Collect]: "/assets/RPG Maker Sound Effects/Collect.wav",
    [SoundEffect.Walk]: "/assets/RPG Maker Sound Effects/GrassWalk.wav",
    [SoundEffect.LaserGun]: "/assets/RPG Maker Sound Effects/LaserGun.wav",
    [SoundEffect.Text]: "/assets/RPG Maker Sound Effects/Text.wav",
  };

  /**
   * Initialize the audio system and preload all sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const loadPromises = Object.entries(this.soundPaths).map(([name, path]) => {
      return this.loadSound(name as SoundEffect, path);
    });

    await Promise.all(loadPromises);
    this.isInitialized = true;
  }

  /**
   * Load a single sound effect
   */
  private async loadSound(name: SoundEffect, path: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = new Audio(path);
      audio.volume = this.config.volume;
      audio.preload = "auto";

      audio.addEventListener("canplaythrough", () => {
        this.sounds.set(name, {
          name,
          audio,
          isLoaded: true,
        });
        resolve();
      });

      audio.addEventListener("error", (e) => {
        console.error(`Failed to load sound: ${name} from ${path}`, e);
        // Still resolve to not block initialization
        this.sounds.set(name, {
          name,
          audio,
          isLoaded: false,
        });
        resolve();
      });
    });
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundEffect): void {
    if (this.config.muted) {
      return;
    }

    const soundInstance = this.sounds.get(sound);
    if (!soundInstance || !soundInstance.isLoaded) {
      console.warn(`Sound not loaded: ${sound}`);
      return;
    }

    // Clone the audio element to allow multiple plays
    const audio = soundInstance.audio.cloneNode() as HTMLAudioElement;
    audio.volume = this.config.volume;
    audio.play().catch((err) => {
      console.error(`Failed to play sound: ${sound}`, err);
    });
  }

  /**
   * Set the master volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));

    // Update all loaded sounds
    this.sounds.forEach((soundInstance) => {
      soundInstance.audio.volume = this.config.volume;
    });
  }

  /**
   * Get the current volume
   */
  getVolume(): number {
    return this.config.volume;
  }

  /**
   * Mute all sounds
   */
  mute(): void {
    this.config.muted = true;
  }

  /**
   * Unmute all sounds
   */
  unmute(): void {
    this.config.muted = false;
  }

  /**
   * Toggle mute state
   */
  toggleMute(): void {
    this.config.muted = !this.config.muted;
  }

  /**
   * Check if audio is muted
   */
  isMuted(): boolean {
    return this.config.muted;
  }

  /**
   * Stop all currently playing sounds
   */
  stopAll(): void {
    this.sounds.forEach((soundInstance) => {
      soundInstance.audio.pause();
      soundInstance.audio.currentTime = 0;
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.isInitialized = false;
  }
}
