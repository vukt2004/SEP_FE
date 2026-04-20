import { ArrowRight, Rocket } from "lucide-react";
import { NavLink } from "react-router-dom";
import Ring from "../effects/Ring";
import { palette } from "../landing.theme";
import { PrimaryButton } from "../shared/Buttons";
import Container from "../shared/Container";
import SectionHeading from "../shared/SectionHeading";
import { SurfaceCard } from "../shared/SurfaceCard";
import { useTranslation } from "@/lib/i18n/translations";
import GridVeil from "../effects/GridVeil";

export default function FinaleSection() {
  const { t } = useTranslation();
  return (
    <section id="finale" className="relative overflow-hidden px-6 py-24">
      <GridVeil />
      <div className="relative z-10">
        <SectionHeading
          eyebrow={t("startYourJourney")}
          title={t("finaleTitle")}
          desc={t("finaleDesc")}
        />

        <Container>
          <SurfaceCard className="relative overflow-hidden p-10 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
            <Ring size={360} top="50%" left="50%" color="rgba(37,99,235,0.16)" duration={24} />
            <Ring size={240} top="50%" left="50%" color="rgba(249,115,22,0.16)" duration={18} />

            <div className="relative z-10">
              <div
                className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{ background: "rgba(249,115,22,0.16)", color: palette.accent }}
              >
                <Rocket size={28} />
              </div>

              <h3 className="text-3xl font-bold md:text-5xl" style={{ color: palette.text }}>
                {t("startLearningThroughPlay")}
              </h3>

              <p
                className="mx-auto mt-5 max-w-3xl text-lg leading-8"
                style={{ color: palette.text2 }}
              >
                {t("finaleSubDesc")}
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <NavLink to="/app/my-path">
                  <PrimaryButton>
                    {t("startTheMission")}
                    <ArrowRight size={18} />
                  </PrimaryButton>
                </NavLink>
              </div>
            </div>
          </SurfaceCard>
        </Container>
      </div>
    </section>
  );
}
