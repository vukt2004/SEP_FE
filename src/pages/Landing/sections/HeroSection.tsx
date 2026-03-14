import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Play } from "lucide-react";
import { palette, landingEase } from "../landing.theme";
import Container from "../shared/Container";
import Pill from "../shared/Pill";
import { PrimaryButton } from "../shared/Buttons";
import GridVeil from "../effects/GridVeil";
import Ring from "../effects/Ring";
import StarLayer from "../effects/StarLayer";
import HeroMissionControl from "./HeroMissionControl";
import HeroStats from "./HeroStats";
import { useTranslation } from "@/lib/i18n/translations";

export default function HeroSection() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });

  const yTitle = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const yPanel = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacityHint = useTransform(scrollYProgress, [0, 0.28], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative isolate min-h-screen overflow-hidden border-b"
      style={{ borderColor: palette.border }}
    >
      <StarLayer />
      <GridVeil />
      <Ring size={660} top="-8%" left="60%" color="rgba(37,99,235,0.16)" duration={38} />
      <Ring size={420} top="14%" left="6%" color="rgba(249,115,22,0.16)" duration={26} />
      <Ring size={260} top="60%" left="72%" color="rgba(6,182,212,0.16)" duration={20} />

      <Container className="relative z-10 grid min-h-screen items-center gap-12 py-24 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div style={{ y: yTitle }} className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: landingEase }}
            className="mb-5 flex flex-wrap gap-3"
          >
            <Pill tone="cyan">{t("pillPlatform")}</Pill>
            <Pill tone="primary">{t("pillBlock")}</Pill>
            <Pill tone="accent">{t("pillMulti")}</Pill>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.8, ease: landingEase }}
            className="text-5xl font-black leading-[1.02] md:text-7xl"
            style={{ color: palette.text }}
          >
            {t("heroTitle")}
            <span style={{ color: palette.accent }}> {t("heroTitleAccent")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.8, ease: landingEase }}
            className="mt-6 max-w-2xl text-lg leading-8 md:text-xl"
            style={{ color: palette.text2 }}
          >
            {t("heroDesc")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.8, ease: landingEase }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <PrimaryButton>
              <Play size={18} />
              {t("playDemo")}
            </PrimaryButton>
          </motion.div>

          <HeroStats />
        </motion.div>

        <motion.div style={{ y: yPanel }} className="relative flex items-center justify-center">
          <HeroMissionControl />
        </motion.div>
      </Container>

      <motion.div
        style={{ opacity: opacityHint }}
        className="absolute inset-x-0 bottom-8 z-10 flex justify-center"
      >
        <div className="flex flex-col items-center gap-2 text-sm" style={{ color: palette.muted }}>
          <span>Scroll to discover how QuackOrbit works</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
