import { motion } from "framer-motion";
import { Flag } from "lucide-react";
import Ring from "../effects/Ring";
import { palette } from "../landing.theme";
import { PanelCard } from "../shared/SurfaceCard";
import ChapterSceneShell from "../sections/ChapterSceneShell";

export default function ArrivalScene() {
  return (
    <ChapterSceneShell>
      <div className="relative grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Ring size={260} top="16%" left="66%" color="rgba(37,99,235,0.18)" duration={18} />
        <Ring size={170} top="52%" left="12%" color="rgba(249,115,22,0.18)" duration={12} />

        <PanelCard className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                Explore the mission map
              </div>
              <div className="text-xs" style={{ color: palette.muted }}>
                See the goal, obstacles and collectibles first
              </div>
            </div>
            <Flag size={18} style={{ color: palette.accent }} />
          </div>

          <div
            className="rounded-[24px] border p-4"
            style={{ background: palette.surface2, borderColor: palette.border }}
          >
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl border"
                  initial={{ opacity: 0.2 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  style={{
                    background: [3, 11, 14, 19].includes(i)
                      ? "rgba(249,115,22,0.16)"
                      : [6, 13, 20].includes(i)
                        ? "rgba(6,182,212,0.16)"
                        : palette.surface3,
                    borderColor: palette.border,
                  }}
                />
              ))}
            </div>
          </div>
        </PanelCard>

        <div className="space-y-4">
          <PanelCard className="p-5">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              What learners see first
            </div>

            <div className="space-y-3">
              {[
                "A clear mission goal",
                "A visible route with obstacles",
                "A puzzle that invites planning",
              ].map((item, index) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + index * 0.08, duration: 0.35 }}
                  className="rounded-2xl border px-4 py-3 text-sm font-medium"
                  style={{
                    background: palette.surface2,
                    borderColor: palette.border,
                    color: index === 1 ? palette.accent : palette.text2,
                  }}
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </PanelCard>

          <PanelCard className="p-5">
            <div className="mb-2 text-sm font-semibold" style={{ color: palette.text }}>
              Why this matters
            </div>
            <p className="text-sm leading-7" style={{ color: palette.text2 }}>
              Before learning how to solve the puzzle, players understand what they are trying to
              achieve. This makes learning logic clearer and less abstract from the start.
            </p>
          </PanelCard>
        </div>
      </div>
    </ChapterSceneShell>
  );
}
