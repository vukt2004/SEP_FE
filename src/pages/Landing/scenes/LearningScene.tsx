import { motion } from "framer-motion";
import { Waypoints } from "lucide-react";
import { palette } from "../landing.theme";
import { PanelCard } from "../shared/SurfaceCard";
import ChapterSceneShell from "../sections/ChapterSceneShell";

export default function LearningScene() {
  return (
    <ChapterSceneShell>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <PanelCard className="p-5">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              Build the logic
            </div>

            <div className="space-y-2">
              {[
                ["Look at the map", palette.cyan],
                ["Build the loop", palette.primary],
                ["Test the condition", palette.accent],
                ["Adjust the route", palette.yellow],
              ].map(([label, color], index) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, duration: 0.35 }}
                  className="rounded-2xl border px-4 py-3 text-sm font-medium"
                  style={{ background: palette.surface2, borderColor: palette.border, color }}
                >
                  {label}
                </motion.div>
              ))}
            </div>
          </PanelCard>

          <PanelCard className="p-5">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              Learning feedback
            </div>
            <p className="text-sm leading-7" style={{ color: palette.text2 }}>
              QuackOrbit shows learners what happens after each decision. When a strategy isn't
              right, they can adjust it step by step and learn from the results they've just
              produced.
            </p>
          </PanelCard>
        </div>

        <PanelCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                Simulation stage
              </div>
              <div className="text-xs" style={{ color: palette.muted }}>
                See how your strategy works inside the world
              </div>
            </div>
            <Waypoints size={18} style={{ color: palette.primary }} />
          </div>

          <div
            className="grid grid-cols-8 gap-2 rounded-[24px] border p-3"
            style={{ background: palette.surface2, borderColor: palette.border }}
          >
            {Array.from({ length: 48 }).map((_, i) => {
              const duck = i === 16;
              const goal = i === 39;
              const hazard = [4, 12, 20, 27, 35].includes(i);

              return (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl border"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.02 * i, duration: 0.25 }}
                  style={{
                    background: duck
                      ? "rgba(249,115,22,0.16)"
                      : goal
                        ? "rgba(34,197,94,0.16)"
                        : hazard
                          ? "rgba(37,99,235,0.16)"
                          : palette.surface3,
                    borderColor: duck || goal ? "rgba(237,243,251,0.15)" : palette.border,
                  }}
                />
              );
            })}
          </div>
        </PanelCard>
      </div>
    </ChapterSceneShell>
  );
}
