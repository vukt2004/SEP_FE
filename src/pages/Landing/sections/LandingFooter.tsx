import Container from "../shared/Container";
import { palette } from "../landing.theme";
import { useTranslation } from "@/lib/i18n/translations";

export default function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer
      className="border-t px-6 py-8"
      style={{ borderColor: palette.border, background: palette.surface }}
    >
      <Container className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="text-lg font-semibold" style={{ color: palette.text }}>
            QuackOrbit
          </div>
          <div className="mt-1 text-sm" style={{ color: palette.muted }}>
            {t("footerTagline")}
          </div>
        </div>

        <div className="flex gap-6 text-sm" style={{ color: palette.text2 }}>
          <a href="#arrival">{t("discover")}</a>
          <a href="#learning">{t("learn")}</a>
          <a href="#competition">{t("compete")}</a>
          <a href="#finale">{t("startJourney")}</a>
        </div>
      </Container>
    </footer>
  );
}
