import { motion } from "framer-motion";
import Container from "../shared/Container";
import SectionHeading from "../shared/SectionHeading";
import { SurfaceCard } from "../shared/SurfaceCard";
import { highlightCards } from "../data/landing.data";
import { landingEase, palette } from "../landing.theme";
import { useTranslation } from "@/lib/i18n/translations";
import GridVeil from "../effects/GridVeil";

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
          style={{
            background: `color-mix(in srgb, ${tone} 14%, transparent)`,
            color: tone,
          }}
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

const highlightKeys = [
  { titleKey: "highlight1Title", descKey: "highlight1Desc" },
  { titleKey: "highlight2Title", descKey: "highlight2Desc" },
  { titleKey: "highlight3Title", descKey: "highlight3Desc" },
  { titleKey: "highlight4Title", descKey: "highlight4Desc" },
] as const;

export default function IntroHighlightsSection() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <GridVeil />
      <div className="relative z-10">
        <SectionHeading
          eyebrow={t("whyQuackOrbit")}
          title={t("introHighlightsTitle")}
          desc={t("introHighlightsDesc")}
        />

        <Container className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {highlightCards.map((card, index) => (
            <HighlightCard
              key={card.title}
              title={t(highlightKeys[index].titleKey)}
              desc={t(highlightKeys[index].descKey)}
              tone={card.tone}
              icon={card.icon}
              index={index}
            />
          ))}
        </Container>
      </div>
    </section>
  );
}
