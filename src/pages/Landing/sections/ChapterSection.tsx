import { motion } from "framer-motion";
import type { ChapterData } from "../landing.types";
import Container from "../shared/Container";
import { palette, landingEase } from "../landing.theme";
import ChapterBulletList from "./ChapterBulletList";
import ChapterSceneById from "./ChapterSceneById";

type ChapterSectionProps = {
  chapter: ChapterData;
};

export default function ChapterSection({ chapter }: ChapterSectionProps) {
  return (
    <section id={chapter.id} className="relative border-b" style={{ borderColor: palette.border }}>
      <Container className="grid gap-10 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-28">
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: landingEase }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div
                className="rounded-full border px-3 py-1 text-sm"
                style={{
                  background: palette.surface,
                  borderColor: palette.border,
                  color: chapter.toneColor,
                }}
              >
                {chapter.chapter}
              </div>
              <div className="text-sm" style={{ color: palette.muted }}>
                {chapter.eyebrow}
              </div>
            </div>

            <h2
              className="text-3xl font-bold leading-tight md:text-5xl"
              style={{ color: palette.text }}
            >
              {chapter.title}
            </h2>

            <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: palette.text2 }}>
              {chapter.desc}
            </p>

            <ChapterBulletList points={chapter.points} toneColor={chapter.toneColor} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: landingEase }}
          className="relative"
        >
          <ChapterSceneById id={chapter.id} />
        </motion.div>
      </Container>
    </section>
  );
}
