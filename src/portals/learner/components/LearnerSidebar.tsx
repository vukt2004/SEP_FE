// src/portals/learner/components/LearnerSidebar.tsx
import { NavLink } from "react-router-dom";
import { Home, Gamepad2, User, Wallet, Package, Map } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export default function LearnerSidebar() {
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
        <SideNavLink to={ROUTES.LEARNER_HOME ?? "/app"} label="Home" icon={Home} />
        <SideNavLink
          to={ROUTES.LEARNER_LEARN ?? "/app/browse"}
          label="Game Mode Browse"
          icon={Gamepad2}
        />
        <SideNavLink to={ROUTES.LEARNER_PROFILE ?? "/app/profile"} label="Profile" icon={User} />
        <SideNavLink to={ROUTES.LEARNER_WALLET ?? "/app/wallet"} label="Wallet" icon={Wallet} />
        <SideNavLink
          to={ROUTES.LEARNER_PACKAGES ?? "/app/packages"}
          label="Packages"
          icon={Package}
        />
        <SideNavLink to={ROUTES.LEARNER_MAPS ?? "/app/my-maps"} label="My Maps" icon={Map} />
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
