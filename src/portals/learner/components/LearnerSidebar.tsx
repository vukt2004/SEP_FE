// src/portals/learner/components/LearnerSidebar.tsx
import { NavLink } from "react-router-dom";
import { Gamepad2, Map, Store, Route } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";

export default function LearnerSidebar() {
  const { t } = useTranslation();
  return (
    <aside
      style={{
        width: 240,
        minHeight: "calc(100vh - 95px)",
        background: "var(--elevated, var(--surface))",
        borderRight: "1px solid var(--border)",
        position: "sticky",
        top: 95,
        alignSelf: "flex-start",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <nav
        aria-label="Learner navigation"
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {/* Marketplace as primary tab */}
        <SideNavLink
          to={ROUTES.LEARNER_MARKETPLACE ?? "/app/marketplace"}
          label={t("marketplace")}
          icon={Store}
        />
        <SideNavLink
          to={ROUTES.LEARNER_LEARN ?? "/app/browse"}
          label={t("gameModeBrowse")}
          icon={Gamepad2}
        />
        <SideNavLink
          to={ROUTES.LEARNER_MY_PATH ?? "/app/my-path"}
          label={t("myPath")}
          icon={Route}
        />
        <SideNavLink to={ROUTES.LEARNER_MAPS ?? "/app/my-games"} label={t("myMaps")} icon={Map} />
      </nav>
    </aside>
  );
}

function SideNavLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: "none",
        color: isActive ? "var(--text)" : "var(--muted)",
        fontWeight: 700,
        padding: "12px 14px",
        borderRadius: 12,
        background: isActive ? "var(--surface)" : "transparent",
        border: isActive ? "1px solid var(--border)" : "1px solid transparent",
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
        transition: "all 0.2s ease",
      })}
    >
      <Icon size={18} aria-hidden />
      <span>{label}</span>
    </NavLink>
  );
}
