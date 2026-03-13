import { motion } from "framer-motion";
import { PanelCard, SurfaceCard } from "../shared/SurfaceCard";
import { Timer } from "lucide-react";
import { palette } from "../landing.theme";
import { Crosshair } from "lucide-react";
import Pill from "../shared/Pill";
import MissionGridPreview from "./MissionGridPreview";

const HeroMissionControl = () => {
  return (
    <SurfaceCard>
      <div>
        <div className="text-xs" style={{ color: palette.muted }}>
          Orbital sequence
        </div>
        <div className="text-sm font-semibold" style={{ color: palette.text }}>
          Mission control preview
        </div>
      </div>
      <Pill tone="accent">Live</Pill>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PanelCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                Duck Orbit // Act I
              </div>
              <div className="text-xs" style={{ color: palette.muted }}>
                Observe before you solve
              </div>
            </div>
            <Crosshair size={18} style={{ color: palette.accent }} />
          </div>

          <MissionGridPreview />
        </PanelCard>

        <div className="space-y-4">
          <PanelCard className="p-4">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              Logic blocks
            </div>

            <div className="space-y-2">
              {[
                ["Repeat until all stars collected", palette.primary],
                ["Move forward", palette.cyan],
                ["If obstacle ahead", palette.accent],
                ["Turn right", palette.yellow],
              ].map(([label, color], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + index * 0.07, duration: 0.35 }}
                  className="rounded-2xl border px-3 py-3 text-sm font-medium"
                  style={{ background: palette.surface2, borderColor: palette.border, color }}
                >
                  {label}
                </motion.div>
              ))}
            </div>
          </PanelCard>

          <PanelCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                Cinematic tension
              </div>
              <Timer size={16} style={{ color: palette.accent }} />
            </div>

            <div className="space-y-3 text-sm">
              {[
                ["Correctness", "82%"],
                ["Speed", "01:19"],
                ["Efficiency", "10 blocks"],
                ["Arena rank", "#2 / 6"],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl px-3 py-2"
                  style={{ background: palette.surface2 }}
                >
                  <span style={{ color: palette.text2 }}>{key}</span>
                  <span className="font-semibold" style={{ color: palette.text }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </PanelCard>
        </div>
      </div>
    </SurfaceCard>
  );
};

export default HeroMissionControl;
