import { motion } from "framer-motion";
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import Container from "../shared/Container";
import { palette } from "../landing.theme";
import { chapterData } from "../data/landing.data";

export default function LandingHeader() {
  const navigate = useNavigate();
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

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{ background: "rgba(7,14,25,0.82)", borderColor: palette.border }}
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
              Learn programming logic through play
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
              {chapter.eyebrow}
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
            onClick={handleMarketplaceClick}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-xl border px-5 py-2 text-sm font-semibold transition-all duration-200"
            style={{
              borderColor: isLoggedIn ? palette.primary : palette.border,
              color: isLoggedIn ? palette.primary : palette.text2,
              background: isLoggedIn ? `rgba(${palette.primary}, 0.1)` : "transparent",
            }}
          >
            {isLoggedIn ? "Go to App" : "Marketplace"}
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
                    background: `rgba(${palette.primary}, 0.1)`,
                  }}
                >
                  Login
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
                  Register
                </motion.button>
              </NavLink>
            </>
          )}
        </div>
      </Container>
    </header>
  );
}
