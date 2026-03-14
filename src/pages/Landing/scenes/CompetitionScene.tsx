import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { palette } from "../landing.theme";
import { PanelCard } from "../shared/SurfaceCard";
import ChapterSceneShell from "../sections/ChapterSceneShell";

export default function CompetitionScene() {
  return (
    <ChapterSceneShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.92fr]">
        <PanelCard className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                Multiplayer arena
              </div>
              <div className="text-xs" style={{ color: palette.muted }}>
                Solve together, compete fairly, improve faster
              </div>
            </div>
            <Swords size={18} style={{ color: palette.accent }} />
          </div>

          <div className="space-y-3">
            {[
              ["NovaDuck", "82 pts", palette.accent],
              ["OrbitLearner", "79 pts", palette.cyan],
              ["LoopRider", "74 pts", palette.primary],
              ["TinyQuack", "66 pts", palette.text2],
            ].map(([name, score, color], index) => (
              <motion.div
                key={String(name)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.35 }}
                className="flex items-center justify-between rounded-2xl border px-4 py-3"
                style={{ background: palette.surface2, borderColor: palette.border }}
              >
                <div className="font-medium" style={{ color }}>
                  {name}
                </div>
                <div className="text-sm font-semibold" style={{ color: palette.text }}>
                  {score}
                </div>
              </motion.div>
            ))}
          </div>
        </PanelCard>

        <div className="space-y-4">
          <PanelCard className="p-5">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              Match scoring
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Correctness", "90%"],
                ["Speed", "01:03"],
                ["Efficiency", "9 blocks"],
                ["Replay value", "High"],
              ].map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl px-4 py-3"
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

          <PanelCard className="p-5">
            <div className="mb-2 text-sm font-semibold" style={{ color: palette.text }}>
              Why multiplayer helps
            </div>
            <p className="text-sm leading-7" style={{ color: palette.text2 }}>
              Multiplayer mode increases motivation by transforming a logic puzzle into a more
              paced, ranked challenge with a clear sense of accomplishment.
            </p>
          </PanelCard>
        </div>
      </div>
    </ChapterSceneShell>
  );
}
