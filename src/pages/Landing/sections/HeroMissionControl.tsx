import { motion } from "framer-motion";
import { Crosshair, Timer } from "lucide-react";
import Pill from "../shared/Pill";
import { PanelCard, SurfaceCard } from "../shared/SurfaceCard";
import { palette } from "../landing.theme";
import MissionGridPreview from "./MissionGridPreview";
import { useTranslation } from "@/lib/i18n/translations";

export default function HeroMissionControl() {
  const { t } = useTranslation();
  return (
    <SurfaceCard className="relative w-full max-w-2xl overflow-hidden p-5 shadow-[0_32px_90px_rgba(0,0,0,0.32)]">
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "rgba(237,243,251,0.16)" }}
      />

      <div
        className="mb-4 flex items-center justify-between rounded-[22px] border px-4 py-3"
        style={{ background: palette.surface2, borderColor: palette.border }}
      >
        <div>
          <div className="text-xs" style={{ color: palette.muted }}>
            {t("featuredChallenge")}
          </div>
          <div className="text-sm font-semibold" style={{ color: palette.text }}>
            {t("featuredDesc")}
          </div>
        </div>
        <Pill tone="accent">{t("liveDemo")}</Pill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <PanelCard className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                {t("landingIceOrbit")}
              </div>
              <div className="text-xs" style={{ color: palette.muted }}>
                {t("landingCollectGoal")}
              </div>
            </div>
            <Crosshair size={18} style={{ color: palette.accent }} />
          </div>

          <MissionGridPreview />
        </PanelCard>

        <div className="space-y-4">
          <PanelCard className="p-4">
            <div className="mb-3 text-sm font-semibold" style={{ color: palette.text }}>
              {t("blockStrategy")}
            </div>

            <div className="space-y-2">
              {[
                ["repeatUntilStarsCollected", palette.primary],
                ["moveForward", palette.cyan],
                ["ifObstacleAhead", palette.accent],
                ["turnRight", palette.yellow],
              ].map(([labelKey, color], index) => (
                <motion.div
                  key={labelKey}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 + index * 0.07, duration: 0.35 }}
                  className="rounded-2xl border px-3 py-3 text-sm font-medium"
                  style={{ background: palette.surface2, borderColor: palette.border, color }}
                >
                  {t(labelKey)}
                </motion.div>
              ))}
            </div>
          </PanelCard>

          <PanelCard className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold" style={{ color: palette.text }}>
                {t("currentResult")}
              </div>
              <Timer size={16} style={{ color: palette.accent }} />
            </div>

            <div className="space-y-3 text-sm">
              {[
                ["correctness", "82%"],
                ["timeUsed", "01:19"],
                ["blocksUsed", "10"],
                ["rankPreview", "#2 / 6"],
              ].map(([keyKey, value]) => (
                <div
                  key={keyKey}
                  className="flex items-center justify-between rounded-2xl px-3 py-2"
                  style={{ background: palette.surface2 }}
                >
                  <span style={{ color: palette.text2 }}>{t(keyKey)}</span>
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
}
