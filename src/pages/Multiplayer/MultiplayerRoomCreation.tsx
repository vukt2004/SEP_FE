import React, { useState } from "react";
import { ChevronLeft, Settings, Share2, Clock, Users, Shield } from "lucide-react";

interface Player {
  name: string;
  status: "Host" | "Waiting";
  active: boolean;
}

interface RoomFormState {
  privacy: "public" | "private";
  maxPlayers: number;
  prepTime: number;
}

// Sub-component: Player Card
const PlayerCard: React.FC<{ player: Player; index: number }> = ({ player, index }) => (
  <div
    className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
      player.active
        ? "border-[#2563EB]/50 bg-gradient-to-r from-[#2563EB]/10 to-transparent"
        : "border-[#22324C] bg-[#14233A]/50"
    }`}
  >
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold transition-all ${
          player.active
            ? "bg-gradient-to-br from-[#2563EB] to-[#1d47a3] text-white shadow-lg shadow-[#2563EB]/30"
            : "bg-[#22324C] text-[#7C879C]"
        }`}
      >
        {player.active ? "DK" : index + 1}
      </div>
      <div>
        <div className="font-semibold text-[#E5E7EB]">{player.name}</div>
        <div className={`text-xs ${player.active ? "text-[#60A5FA]" : "text-[#7C879C]"}`}>
          {player.status}
        </div>
      </div>
    </div>
    <button
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
        player.active
          ? "bg-[#22C55E]/20 text-[#86EFAC] hover:bg-[#22C55E]/30"
          : "bg-[#2563EB]/20 text-[#60A5FA] hover:bg-[#2563EB]/30"
      }`}
    >
      {player.active ? "✓ Connected" : "+ Invite"}
    </button>
  </div>
);

// Sub-component: Challenge Tag
const ChallengeTag: React.FC<{ tag: string }> = ({ tag }) => {
  const getTagStyles = (tag: string): string => {
    switch (tag) {
      case "Loops":
        return "border-[#2563EB]/40 bg-[#2563EB]/15 text-[#60A5FA]";
      case "Conditions":
        return "border-[#F97316]/40 bg-[#F97316]/15 text-[#FDBA74]";
      case "Ice World":
        return "border-[#06B6D4]/40 bg-[#06B6D4]/15 text-[#67E8F9]";
      default:
        return "border-[#22324C]/50 bg-[#14233A] text-[#A7B0C0]";
    }
  };

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-105 ${getTagStyles(tag)}`}
    >
      {tag}
    </span>
  );
};

// Sub-component: Toggle Switch
const ToggleSwitch: React.FC<{ enabled: boolean; onChange: (val: boolean) => void }> = ({
  enabled,
  onChange,
}) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`flex h-6 w-11 items-center rounded-full border px-1 transition-all duration-200 ${
      enabled
        ? "border-[#22C55E]/40 bg-[#22C55E]/15 justify-end"
        : "border-[#22324C]/50 bg-[#14233A] justify-start"
    }`}
  >
    <div
      className={`h-4 w-4 rounded-full transition-all ${
        enabled ? "bg-[#22C55E] shadow-lg shadow-[#22C55E]/30" : "bg-[#7C879C]"
      }`}
    />
  </button>
);

const MultiplayerRoomCreation: React.FC = () => {
  const [formState, setFormState] = useState<RoomFormState>({
    privacy: "public",
    maxPlayers: 4,
    prepTime: 90,
  });

  const [toggles, setToggles] = useState({ spectators: true, autoStart: true, replay: false });

  const slotBadges = [2, 4, 6, 8];
  const players: Player[] = [
    { name: "DuckCommander", status: "Host", active: true },
    { name: "Open Slot", status: "Waiting", active: false },
    { name: "Open Slot", status: "Waiting", active: false },
    { name: "Open Slot", status: "Waiting", active: false },
  ];

  const challengeTags = ["Loops", "Conditions", "Beginner", "Ice World"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1220] via-[#0F1B2D] to-[#0B1220] text-[#E5E7EB]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10">
        {/* Header */}
        <header className="mb-8 rounded-2xl border border-[#22324C]/50 bg-gradient-to-br from-[#0F1B2D] to-[#14233A] p-6 shadow-2xl shadow-black/30 backdrop-blur-sm lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#06B6D4]/30 bg-[#06B6D4]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#06B6D4]">
                <Shield size={14} />
                <span>Competitive Mode</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#E5E7EB] to-[#A7B0C0] lg:text-4xl">
                Create Waiting Room
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#A7B0C0]/90 lg:text-base">
                Build a friendly match lobby for 2–8 players before jumping into the block-based
                puzzle.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:flex-nowrap">
              <button className="group flex items-center gap-2 rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 px-4 py-2.5 text-sm font-semibold text-[#E5E7EB] transition-all hover:border-[#22324C] hover:bg-[#14233A]">
                <ChevronLeft
                  size={16}
                  className="transition-transform group-hover:-translate-x-0.5"
                />
                Back
              </button>
              <button className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#2563EB] to-[#1d47a3] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#2563EB]/30 transition-all hover:shadow-xl hover:shadow-[#2563EB]/40 hover:scale-105">
                <Settings size={16} className="transition-transform group-hover:rotate-180" />
                Save Preset
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid gap-6 lg:gap-8 xl:grid-cols-[1.2fr_0.75fr]">
          {/* Left Section - Room Setup */}
          <section className="rounded-2xl border border-[#22324C]/50 bg-gradient-to-br from-[#0F1B2D] to-[#14233A]/50 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm lg:p-8">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#E5E7EB]">Room Setup</h2>
                <p className="mt-2 text-sm text-[#7C879C]">Configure your multiplayer experience</p>
              </div>
              <button className="group flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#F97316] to-[#ea580c] px-5 py-2.5 text-sm font-bold text-[#0B1220] shadow-lg shadow-[#F97316]/30 transition-all hover:shadow-xl hover:shadow-[#F97316]/40 hover:scale-105">
                <Share2 size={16} className="transition-transform group-hover:rotate-12" />
                Create Room
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Room Name */}
              <div className="md:col-span-2">
                <label className="mb-3 block text-sm font-semibold text-[#E5E7EB]">Room Name</label>
                <input
                  type="text"
                  defaultValue="Duck Orbit Training Room"
                  className="w-full rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 px-4 py-3 text-sm text-[#E5E7EB] transition placeholder-[#7C879C] focus:border-[#2563EB]/50 focus:bg-[#14233A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                />
              </div>

              {/* Privacy */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-[#E5E7EB]">Privacy</label>
                <div className="rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 px-4 py-3 text-sm text-[#A7B0C0]">
                  🔐 Private Code
                </div>
              </div>

              {/* Max Players */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-[#E5E7EB]">
                  <Users className="mb-1 inline mr-2 h-4 w-4" />
                  Max Players
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {slotBadges.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setFormState({ ...formState, maxPlayers: slot })}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-bold transition-all ${
                        formState.maxPlayers === slot
                          ? "border-[#F97316]/50 bg-gradient-to-br from-[#F97316] to-[#d97706] text-[#0B1220] shadow-lg shadow-[#F97316]/30"
                          : "border-[#22324C]/50 bg-[#14233A]/30 text-[#A7B0C0] hover:bg-[#14233A]/50"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenge Selection */}
              <div className="md:col-span-2">
                <label className="mb-3 block text-sm font-semibold text-[#E5E7EB]">Challenge</label>
                <div className="rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 inline-flex rounded-full border border-[#06B6D4]/40 bg-[#06B6D4]/10 px-3 py-1 text-xs font-semibold text-[#06B6D4]">
                        ⭐ Selected Puzzle
                      </div>
                      <h3 className="mt-2 text-lg font-bold text-[#E5E7EB]">Frozen Orbit Relay</h3>
                      <p className="mt-2 text-sm leading-6 text-[#A7B0C0]/90">
                        Guide the duck through sliding ice tiles, collect batteries, and reach the
                        station gate with limited steps.
                      </p>
                    </div>
                    <button className="mt-4 rounded-lg border border-[#22324C]/50 bg-[#0F1B2D]/50 px-4 py-2 text-sm font-semibold text-[#E5E7EB] transition hover:bg-[#22324C]/30 lg:mt-0 lg:whitespace-nowrap">
                      Change Challenge
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {challengeTags.map((tag) => (
                      <ChallengeTag key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preparation Time */}
              <div>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#E5E7EB]">
                  <Clock size={16} className="text-[#06B6D4]" />
                  Preparation Time
                </label>
                <div className="space-y-3 rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#A7B0C0]">Current setting</span>
                    <span className="font-bold text-[#E5E7EB]">{formState.prepTime}s</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="10"
                    value={formState.prepTime}
                    onChange={(e) =>
                      setFormState({ ...formState, prepTime: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-[#0B1220] rounded-full appearance-none cursor-pointer accent-[#2563EB]"
                  />
                  <div className="flex justify-between text-xs text-[#7C879C]">
                    <span>30s</span>
                    <span>60s</span>
                    <span>90s</span>
                    <span>120s</span>
                  </div>
                </div>
              </div>

              {/* Room Rules */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-[#E5E7EB]">
                  Room Rules
                </label>
                <div className="space-y-3 rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 p-4">
                  {Object.entries(toggles).map(([key, value]) => {
                    const labels: Record<string, string> = {
                      spectators: "Allow spectators",
                      autoStart: "Auto-start when full",
                      replay: "Show replay after ranking",
                    };
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-[#A7B0C0]">{labels[key]}</span>
                        <ToggleSwitch
                          enabled={value}
                          onChange={(newVal) => setToggles({ ...toggles, [key]: newVal })}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* Room Waiting Lobby Preview */}
            <section className="rounded-2xl border border-[#22324C]/50 bg-gradient-to-br from-[#0F1B2D] to-[#14233A]/50 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 inline-flex rounded-full border border-[#F97316]/40 bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#F97316]">
                    👁 Live Preview
                  </div>
                  <h2 className="text-xl font-bold text-[#E5E7EB]">Waiting Lobby</h2>
                  <p className="mt-1 text-sm text-[#7C879C]">Player view after creation</p>
                </div>
                <div className="rounded-lg border border-[#22324C]/50 bg-[#14233A]/50 px-3 py-2 text-right">
                  <div className="text-xs text-[#7C879C]">Room Code</div>
                  <div className="font-black tracking-widest text-[#06B6D4]">QO-7X9K</div>
                </div>
              </div>

              <div className="rounded-lg border border-[#22324C]/50 bg-[#14233A]/30 p-4">
                <div className="mb-4 space-y-2 border-b border-[#22324C]/50 pb-4">
                  <h3 className="font-bold text-[#E5E7EB]">Duck Orbit Training Room</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#7C879C]">
                    <span>🌐 Public</span>
                    <span>•</span>
                    <span>{formState.maxPlayers} Players</span>
                    <span>•</span>
                    <span>{formState.prepTime}s Prep</span>
                  </div>
                  <div className="mt-2 inline-flex rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-2 py-1 text-xs font-bold text-[#86EFAC]">
                    ✓ Ready to Publish
                  </div>
                </div>

                <div className="space-y-2">
                  {players.map((player, index) => (
                    <PlayerCard key={`${player.name}-${index}`} player={player} index={index} />
                  ))}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default MultiplayerRoomCreation;
