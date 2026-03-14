import { motion } from "framer-motion";
import type { ChapterData } from "../landing.types";
import Container from "../shared/Container";
import { palette, landingEase } from "../landing.theme";
import ChapterBulletList from "./ChapterBulletList";
import ChapterSceneById from "./ChapterSceneById";
import { useTranslation } from "@/lib/i18n/translations";
import GridVeil from "../effects/GridVeil";

type ChapterSectionProps = {
  chapter: ChapterData;
};

const chapterActKeys: Record<string, string> = {
  arrival: "landingAct1",
  learning: "landingAct2",
  competition: "landingAct3",
};
const chapterEyebrowKeys: Record<string, string> = {
  arrival: "discover",
  learning: "learn",
  competition: "compete",
};
const chapterTitleKeys: Record<string, string> = {
  arrival: "landingArrivalTitle",
  learning: "landingLearningTitle",
  competition: "landingCompetitionTitle",
};
const chapterDescKeys: Record<string, string> = {
  arrival: "landingArrivalDesc",
  learning: "landingLearningDesc",
  competition: "landingCompetitionDesc",
};
const chapterPointKeys: Record<string, string[]> = {
  arrival: ["landingArrivalPoint1", "landingArrivalPoint2", "landingArrivalPoint3"],
  learning: ["landingLearningPoint1", "landingLearningPoint2", "landingLearningPoint3"],
  competition: ["landingCompetitionPoint1", "landingCompetitionPoint2", "landingCompetitionPoint3"],
};

export default function ChapterSection({ chapter }: ChapterSectionProps) {
  const { t } = useTranslation();
  const actKey = chapterActKeys[chapter.id];
  const eyebrowKey = chapterEyebrowKeys[chapter.id];
  const titleKey = chapterTitleKeys[chapter.id];
  const descKey = chapterDescKeys[chapter.id];
  const pointKeys = chapterPointKeys[chapter.id] ?? [];
  const points = pointKeys.map((key) => t(key));

  return (
    <section
      id={chapter.id}
      className="relative overflow-hidden border-b"
      style={{ borderColor: palette.border }}
    >
      <GridVeil />
      <Container className="relative z-10 grid gap-10 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-28">
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
                {actKey ? t(actKey) : chapter.chapter}
              </div>
              <div className="text-sm" style={{ color: palette.muted }}>
                {eyebrowKey ? t(eyebrowKey) : chapter.eyebrow}
              </div>
            </div>

            <h2
              className="text-3xl font-bold leading-tight md:text-5xl"
              style={{ color: palette.text }}
            >
              {titleKey ? t(titleKey) : chapter.title}
            </h2>

            <p className="mt-5 text-base leading-8 md:text-lg" style={{ color: palette.text2 }}>
              {descKey ? t(descKey) : chapter.desc}
            </p>

            <ChapterBulletList
              points={points.length ? points : chapter.points}
              toneColor={chapter.toneColor}
            />
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
