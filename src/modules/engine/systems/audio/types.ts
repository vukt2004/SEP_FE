export const SoundEffect = {
  Jump: "jump",
  Collect: "collect",
  Walk: "walk",
  LaserGun: "laser",
  Text: "text",
} as const;

export type SoundEffect = (typeof SoundEffect)[keyof typeof SoundEffect];

export interface AudioConfig {
  volume: number; // 0.0 to 1.0
  muted: boolean;
}

export interface SoundInstance {
  name: SoundEffect;
  audio: HTMLAudioElement;
  isLoaded: boolean;
}
