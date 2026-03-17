import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { Sun, Moon } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import Container from "../shared/Container";
import { palette } from "../landing.theme";
import { chapterData } from "../data/landing.data";
import { useTranslation } from "@/lib/i18n/translations";
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";

const chapterEyebrowKeys: Record<string, string> = {
  arrival: "discover",
  learning: "learn",
  competition: "compete",
};

export default function LandingHeader() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isLoggedIn = !!tokenStorage.getLearnerToken();

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      alert("Vui lòng đăng nhập để vào Marketplace.");
      navigate(ROUTES.LEARNER_LOGIN);
      return;
    }
    navigate(ROUTES.LEARNER_MARKETPLACE ?? "/app/marketplace");
  };

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{ background: "var(--surface)", borderColor: palette.border }}
    >
      <Container className="flex items-center justify-between py-4 h-30">
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ scale: 1.04 }} className="flex items-center justify-center">
            <img src="/brand/logo.png" alt="QuackOrbit" className="h-35 w-auto object-contain" />
          </motion.div>

          <div>
            <div className="text-xl font-semibold" style={{ color: palette.text }}>
              QuackOrbit
            </div>
            <div className="text-xl" style={{ color: palette.muted }}>
              {t("landingTagline")}
            </div>
          </div>
        </div>

        <nav className="hidden items-center gap-8 md:flex">
          {chapterData.map((chapter) => (
            <motion.button
              key={chapter.id}
              onClick={(e) => {
                e.preventDefault();
                const element = document.getElementById(chapter.id);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative text-xl font-medium transition-all duration-300 pb-1"
              style={{ color: palette.text2 }}
            >
              {t(chapterEyebrowKeys[chapter.id] ?? chapter.eyebrow)}
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 w-0"
                animate={{ width: "0%" }}
                whileHover={{ width: "100%" }}
                transition={{ duration: 0.3 }}
                style={{ background: palette.primary }}
              />
            </motion.button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={() => toggleTheme()}
            aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border"
            style={{
              borderColor: palette.border,
              color: palette.text,
              background: palette.surface2,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => toggleLocale()}
            aria-label={t("language")}
            className="flex h-10 min-w-[3rem] items-center justify-center rounded-xl border px-2 text-sm font-bold"
            style={{
              borderColor: palette.border,
              color: palette.text,
              background: palette.surface2,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {locale === "en" ? "EN" : "VI"}
          </motion.button>
          <motion.button
            type="button"
            onClick={handleMarketplaceClick}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl border px-5 py-2 text-sm font-semibold transition-all duration-200"
            style={{
              borderColor: isLoggedIn ? palette.primary : palette.border,
              color: isLoggedIn ? palette.primary : palette.text2,
              background: isLoggedIn
                ? "color-mix(in srgb, var(--primary) 12%, transparent)"
                : "transparent",
            }}
          >
            {isLoggedIn ? t("goToApp") : t("marketplace")}
          </motion.button>
          {!isLoggedIn && (
            <>
              <NavLink to="/login">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl border px-5 py-2 text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  style={{
                    borderColor: palette.primary,
                    color: palette.primary,
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  }}
                >
                  {t("login")}
                </motion.button>
              </NavLink>
              <NavLink to="/register">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  style={{
                    background: palette.primary,
                    color: "#fff",
                  }}
                >
                  {t("register")}
                </motion.button>
              </NavLink>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
