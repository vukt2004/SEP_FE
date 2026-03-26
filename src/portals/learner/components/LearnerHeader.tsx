// src/portals/learner/components/layout/LearnerHeader.tsx
import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Wallet,
  Package,
  LogOut,
  Store,
  Gamepad2,
  Map,
  Sun,
  Moon,
  Route,
  MessageSquareWarning,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { orbitCoinApi } from "@/services/api/learner/orbitcoin.api";
import { useThemeStore } from "@/stores/theme.store";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";

const iconBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  cursor: "pointer",
};

export default function LearnerHeader() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const locale = useLanguageStore((s) => s.locale);
  const toggleLocale = useLanguageStore((s) => s.toggle);
  const t = getT(locale);

  useEffect(() => {
    orbitCoinApi.getBalance().then((res) => {
      if (res.isSuccess && res.data) setBalance(res.data.balance);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const onLogout = () => {
    localStorage.removeItem("qo_learner_token");
    navigate(ROUTES.LANDING ?? "/", { replace: true });
  };

  const balanceStr = balance != null ? balance.toLocaleString() : "—";

  return (
    <header
      style={{
        position: "sticky",
        height: 72,
        top: 0,
        zIndex: 30,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        overflow: "visible",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
          padding: "0 48px",
          height: "100%",
          maxWidth: 1440,
          margin: "0 auto",
        }}
      >
        {/* Left: Logo + Nav tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 56, minWidth: 0 }}>
          <NavLink
            to={ROUTES.LANDING ?? "/"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 800,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ display: "block", lineHeight: 0 }}>
              <img
                src="/brand/logo.png"
                alt="QuackOrbit"
                style={{
                  height: 80,
                  width: "auto",
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </span>
          </NavLink>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_MARKETPLACE ?? "/app/marketplace"} icon={Store}>
                {t("marketplace")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_LEARN ?? "/app/browse"} icon={Gamepad2}>
                {t("playgame")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_PACKAGES ?? "/app/packages"} icon={Package}>
                {t("package")}
              </HeaderNavLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
              <HeaderNavLink to={ROUTES.LEARNER_MY_PATH ?? "/app/my-path"} icon={Route}>
                {t("myPath")}
              </HeaderNavLink>
            </motion.div>
          </nav>
        </div>

        {/* Right: theme, language, user menu */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <motion.button
            type="button"
            onClick={() => toggleTheme()}
            aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
            style={iconBtnStyle}
            title={theme === "dark" ? t("themeLight") : t("themeDark")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
          <motion.button
            type="button"
            onClick={() => toggleLocale()}
            aria-label={t("language")}
            style={{ ...iconBtnStyle, fontSize: 12, fontWeight: 700 }}
            title={locale === "en" ? t("languageVi") : t("languageEn")}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
            {locale === "en" ? "EN" : "VI"}
          </motion.button>
          <div
            ref={menuRef}
            style={{ position: "relative", display: "inline-block" }}
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <motion.button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                color: "var(--text)",
                fontWeight: 700,
                fontSize: 14,
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t("user")} • {balanceStr} OC
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    left: "auto",
                    marginTop: 0,
                    paddingTop: 4,
                    minWidth: 180,
                    width: "max-content",
                    background: "var(--elevated, var(--surface))",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
                    overflow: "hidden",
                  }}
                >
                  <NavLink
                    to={ROUTES.LEARNER_PROFILE ?? "/app/profile"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <User size={18} />
                    <span>{t("profile")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_WALLET ?? "/app/wallet"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <Wallet size={18} />
                    <span>{t("wallet")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_MAPS ?? "/app/my-maps"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <Map size={18} />
                    <span>{t("myMaps")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_MY_PATH ?? "/app/my-path"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <Route size={18} />
                    <span>{t("myPath")}</span>
                  </NavLink>
                  <NavLink
                    to={ROUTES.LEARNER_COMPLAINTS ?? "/app/complaints"}
                    onClick={() => setMenuOpen(false)}
                    style={menuLinkStyle}
                  >
                    <MessageSquareWarning size={18} />
                    <span>Complaints</span>
                  </NavLink>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      ...menuBtnStyle,
                      color: "var(--danger)",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <LogOut size={18} />
                    <span>{t("logout")}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}

function menuLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    color: isActive ? "var(--primary)" : "var(--text)",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: 14,
  };
}

const menuBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  width: "100%",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
  textAlign: "left",
};

function HeaderNavLink({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: React.ComponentType<{ size?: number }>;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 10,
        textDecoration: "none",
        color: isActive ? "var(--primary)" : "var(--muted)",
        fontWeight: 700,
        fontSize: 14,
        background: isActive
          ? "color-mix(in srgb, var(--primary) 12%, transparent)"
          : "transparent",
      })}
    >
      <Icon size={18} aria-hidden />
      <span>{children}</span>
    </NavLink>
  );
}
