import { motion } from "framer-motion";
import Container from "../shared/Container";
import SectionHeading from "../shared/SectionHeading";
import { SurfaceCard } from "../shared/SurfaceCard";
import { highlightCards } from "../data/landing.data";
import { landingEase, palette } from "../landing.theme";

type IconComponent = React.ComponentType<{ size?: number }>;

type HighlightCardProps = {
  title: string;
  desc: string;
  tone: string;
  icon: IconComponent;
  index: number;
};

function HighlightCard({ title, desc, tone, icon: Icon, index }: HighlightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: landingEase }}
    >
      <SurfaceCard className="p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div
          className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: `${tone}20`, color: tone }}
        >
          <Icon size={24} />
        </div>
        <h3 className="text-xl font-semibold" style={{ color: palette.text }}>
          {title}
        </h3>
        <p className="mt-3 leading-7" style={{ color: palette.text2 }}>
          {desc}
        </p>
      </SurfaceCard>
    </motion.div>
  );
}

export default function IntroHighlightsSection() {
  return (
    <section className="px-6 py-24">
      <SectionHeading
        eyebrow="Cinematic direction"
        title="Bản này không cố bán sản phẩm quá sớm — nó dựng bầu không khí trước"
        desc="Component structure được dựng trước để sau đó bạn có thể tách file thật trong project mà không đập lại layout tổng thể."
      />

      <Container className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {highlightCards.map((card, index) => (
          <HighlightCard key={card.title} {...card} index={index} />
        ))}
      </Container>
    </section>
  );
}
