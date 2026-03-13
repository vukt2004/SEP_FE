import { motion } from "framer-motion";
import { ArrowRight, Bot } from "lucide-react";
import Container from "../shared/Container";
import { palette } from "../landing.theme";
import { chapterData } from "../data/landing.data";

export default function LandingHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{ background: "rgba(7,14,25,0.82)", borderColor: palette.border }}
    >
      <Container className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: -10, scale: 1.06 }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border"
            style={{ background: palette.surface, borderColor: palette.border }}
          >
            <Bot size={22} style={{ color: palette.accent }} />
          </motion.div>

          <div>
            <div className="text-lg font-semibold" style={{ color: palette.text }}>
              QuackOrbit
            </div>
            <div className="text-xs" style={{ color: palette.muted }}>
              A cinematic game-based learning journey
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {chapterData.map((chapter) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              className="text-sm transition-opacity hover:opacity-100"
              style={{ color: palette.text2, opacity: 0.92 }}
            >
              {chapter.eyebrow}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            className="rounded-xl border px-4 py-2 text-sm font-medium"
            style={{ borderColor: palette.border, color: palette.text }}
          >
            Login
          </button>

          <button
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            style={{ background: palette.primary, color: "#fff" }}
          >
            Start Learning
            <ArrowRight size={16} />
          </button>
        </div>
      </Container>
    </header>
  );
}
