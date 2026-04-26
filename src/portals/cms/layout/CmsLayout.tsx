/**
 * CMS Layout Component
 *
 * Main layout for CMS admin panel with:
 * - Sidebar navigation
 * - Header with user info and logout
 * - Main content area
 */

import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";
import { ROUTES } from "@/lib/constants/routes";
import { useState } from "react";
import { getCmsRoleLabel, type CmsRole } from "@/lib/auth/role";
import { useTranslation } from "@/lib/i18n/translations";
import { useLanguageStore } from "@/stores/language.store";
import {
  LayoutDashboard,
  Map,
  Users,
  Package,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  MessageSquareWarning,
  Megaphone,
  SlidersHorizontal,
  Coins,
  BarChart3,
  Tags,
  type LucideIcon,
} from "lucide-react";

const CmsLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, role } = useCmsAuthStore();
  const { t } = useTranslation();
  const locale = useLanguageStore((s) => s.locale);
  const setLocale = useLanguageStore((s) => s.setLocale);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.CMS_LOGIN);
  };

  const navItems: Array<{
    path: string;
    labelKey: string;
    icon: LucideIcon;
    roles: CmsRole[];
  }> = [
    {
      path: ROUTES.CMS_DASHBOARD,
      labelKey: "cmsLayout.nav.dashboard",
      icon: LayoutDashboard,
      roles: ["admin"],
    },
    {
      path: ROUTES.CMS_FINANCE_DASHBOARD,
      labelKey: "cmsLayout.nav.financeDashboard",
      icon: BarChart3,
      roles: ["admin"],
    },
    {
      path: ROUTES.CMS_ORBITCOIN,
      labelKey: "cmsLayout.nav.orbitcoin",
      icon: Coins,
      roles: ["admin"],
    },
    { path: ROUTES.CMS_USERS, labelKey: "cmsLayout.nav.users", icon: Users, roles: ["admin"] },
    {
      path: ROUTES.CMS_MAPS,
      labelKey: "cmsLayout.nav.games",
      icon: Map,
      roles: ["admin", "moderator"],
    },
    {
      path: ROUTES.CMS_GAMEPLAY,
      labelKey: "cmsLayout.nav.gameplay",
      icon: SlidersHorizontal,
      roles: ["admin"],
    },
    {
      path: ROUTES.CMS_PACKAGES,
      labelKey: "cmsLayout.nav.packages",
      icon: Package,
      roles: ["admin"],
    },
    {
      path: ROUTES.CMS_COMPLAINTS,
      labelKey: "cmsLayout.nav.complaints",
      icon: MessageSquareWarning,
      roles: ["admin", "moderator"],
    },
    {
      path: ROUTES.CMS_COMPLAINT_CATEGORIES,
      labelKey: "cmsLayout.nav.complaintCategories",
      icon: Tags,
      roles: ["admin"],
    },
    {
      path: ROUTES.CMS_SYSTEM_ANNOUNCEMENT,
      labelKey: "cmsLayout.nav.announcement",
      icon: Megaphone,
      roles: ["admin"],
    },
  ];

  const visibleNavItems = role ? navItems.filter((item) => item.roles.includes(role)) : [];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: isSidebarCollapsed ? "80px" : "260px",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <img src="/brand/logo.png" alt="Logo" style={{ height: "50px", width: "auto" }} />
          {!isSidebarCollapsed && (
            <div>
              <div style={{ color: "var(--text)", fontSize: "18px", fontWeight: "bold" }}>
                QuackOrbit
              </div>
              <div style={{ color: "var(--text-2)", fontSize: "12px" }}>
                {t("cmsLayout.cmsLabel")} {getCmsRoleLabel(role)}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "4px",
                  textDecoration: "none",
                  color: isActive(item.path) ? "var(--text)" : "var(--text-2)",
                  background: isActive(item.path) ? "var(--surface-2)" : "transparent",
                  border: isActive(item.path)
                    ? "1px solid var(--primary)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = "var(--surface-2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <IconComponent size={20} />
                {!isSidebarCollapsed && <span>{t(item.labelKey)}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          style={{
            padding: "12px",
            border: "none",
            borderTop: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isSidebarCollapsed && <span>{t("cmsLayout.collapse")}</span>}
        </button>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <h1 style={{ color: "var(--text)", fontSize: "20px", fontWeight: "600", margin: 0 }}>
              {(() => {
                const activeItem = visibleNavItems.find((item) => isActive(item.path));
                return activeItem ? t(activeItem.labelKey) : t("cmsLayout.titleFallback");
              })()}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <button
              type="button"
              onClick={() => setLocale(locale === "en" ? "vi" : "en")}
              style={{
                padding: "8px 12px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-2)",
                cursor: "pointer",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              title={t("language")}
            >
              <span>{locale === "en" ? t("languageVi") : t("languageEn")}</span>
            </button>

            {/* Role Badge */}
            <div
              style={{
                padding: "6px 12px",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: "999px",
                color: "var(--text-2)",
                fontSize: "13px",
                textTransform: "capitalize",
              }}
            >
              {getCmsRoleLabel(role)}
            </div>

            {/* Profile Button */}
            <button
              onClick={() => navigate(ROUTES.CMS_PROFILE)}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-2)",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-2)";
              }}
            >
              <User size={18} />
              <span>{t("cmsLayout.profile")}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-2)",
                cursor: "pointer",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
                e.currentTarget.style.borderColor = "var(--danger)";
                e.currentTarget.style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-2)";
              }}
            >
              <LogOut size={18} />
              <span>{t("logout")}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            background: "var(--bg)",
            overflowY: "auto",
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CmsLayout;
