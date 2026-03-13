import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Play } from "lucide-react";
import { palette, landingEase } from "../landing.theme";
import Container from "../shared/Container";
import Pill from "../shared/Pill";
import { PrimaryButton, SecondaryButton } from "../shared/Buttons";
import GridVeil from "../effects/GridVeil";
import Ring from "../effects/Ring";
import StarLayer from "../effects/StarLayer";
import HeroMissionControl from "./HeroMissionControl";
import HeroStats from "./HeroStats";

export default function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const opacityHint = useTransform(scrollYProgress, [0, 0.28], [1, 0]);
  const yTitle = useTransform(scrollYProgress, [0, 0.28], [0, -60]);
  const yPanel = useTransform(scrollYProgress, [0, 0.28], [0, 60]);

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
            <Pill tone="cyan">Cinematic landing</Pill>
            <Pill tone="primary">Story-driven scroll</Pill>
            <Pill tone="accent">Game-feel first</Pill>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.8, ease: landingEase }}
            className="text-5xl font-black leading-[1.02] md:text-7xl"
            style={{ color: palette.text }}
          >
            Người xem không nên chỉ thấy một trang web.
            <span style={{ color: palette.accent }}> Họ phải thấy một cuộc phóng tàu.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.8, ease: landingEase }}
            className="mt-6 max-w-2xl text-lg leading-8 md:text-xl"
            style={{ color: palette.text2 }}
          >
            Với QuackOrbit, landing page nên tạo cảm giác như đang khởi động một hành trình học
            logic trong không gian: có độ sâu, có cao trào và có nhịp cuộn rõ ràng.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.8, ease: landingEase }}
            className="mt-8 flex flex-wrap gap-4"
          >
            <PrimaryButton>
              <Play size={18} />
              Begin the mission
            </PrimaryButton>
            <SecondaryButton>View the cinematic flow</SecondaryButton>
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
          <span>Scroll to descend into the orbit</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown size={18} />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
