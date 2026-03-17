import { motion } from "framer-motion";
import { palette, landingEase } from "../landing.theme";

type ChapterBulletListProps = {
  points: string[];
  toneColor: string;
};

export default function ChapterBulletList({ points, toneColor }: ChapterBulletListProps) {
  return (
    <div className="mt-8 space-y-4">
      {points.map((point, index) => (
        <motion.div
          key={point}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.08, duration: 0.4, ease: landingEase }}
          className="flex items-start gap-3"
        >
          <div className="mt-2 h-2.5 w-2.5 rounded-full" style={{ background: toneColor }} />
          <span style={{ color: palette.text2 }}>{point}</span>
        </motion.div>
      ))}
    </div>
  );
}
