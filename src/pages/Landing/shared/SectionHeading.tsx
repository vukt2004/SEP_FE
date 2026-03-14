import { motion } from "framer-motion";
import { palette, landingEase } from "../landing.theme";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  desc: string;
};

export default function SectionHeading({ eyebrow, title, desc }: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, ease: landingEase }}
      className="mx-auto mb-12 max-w-3xl text-center"
    >
      <div
        className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-sm"
        style={{ background: palette.surface, borderColor: palette.border, color: palette.cyan }}
      >
        {eyebrow}
      </div>
      <h2 className="text-3xl font-bold tracking-tight md:text-5xl" style={{ color: palette.text }}>
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 md:text-lg" style={{ color: palette.text2 }}>
        {desc}
      </p>
    </motion.div>
  );
}
