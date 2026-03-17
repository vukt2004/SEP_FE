import { useState } from "react";
import type { AudioSystem } from "../../modules/engine/systems/audio/AudioSystem";

interface AudioControlsProps {
  audioSystem: AudioSystem | null;
}

export function AudioControls({ audioSystem }: AudioControlsProps) {
  const [isMuted, setIsMuted] = useState(() => audioSystem?.isMuted() ?? false);
  const [volume, setVolume] = useState(() => audioSystem?.getVolume() ?? 0.5);

  const handleMuteToggle = () => {
    if (!audioSystem) return;

    audioSystem.toggleMute();
    setIsMuted(audioSystem.isMuted());
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioSystem) return;

    const newVolume = parseFloat(e.target.value);
    audioSystem.setVolume(newVolume);
    setVolume(newVolume);
  };

  if (!audioSystem) return null;

  return (
    <div className="audio-controls" style={styles.container}>
      <button
        onClick={handleMuteToggle}
        style={styles.muteButton}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={handleVolumeChange}
        style={styles.volumeSlider}
        title="Volume"
      />
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    background: "rgba(0, 0, 0, 0.5)",
    borderRadius: "8px",
    position: "absolute" as const,
    top: "10px",
    right: "10px",
    zIndex: 1000,
  },
  muteButton: {
    background: "transparent",
    border: "none",
    fontSize: "20px",
    cursor: "pointer",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  volumeSlider: {
    width: "100px",
    cursor: "pointer",
  },
};
