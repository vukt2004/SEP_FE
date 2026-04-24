// src/app/router/routes.cms.tsx
import React from "react";
import type { RouteObject } from "react-router-dom";
import { Navigate } from "react-router-dom";

// Guard (cms token + (optionally) role check inside)
import { RequireCmsAuth } from "@/portals/cms/guards/RequireCmsAuth";
import { RequireCmsRole } from "@/portals/cms/guards/RequireCmsRole";

// Layout (cms shell)
const CmsLayout = React.lazy(() => import("@/portals/cms/layout/CmsLayout"));

// Pages (cms authenticated)
const CmsDashboardPage = React.lazy(() => import("@/portals/cms/pages/DashboardPage"));
const CmsFinanceDashboardPage = React.lazy(() => import("@/portals/cms/pages/FinanceDashboardPage"));
const CmsUsersPage = React.lazy(() => import("@/portals/cms/pages/UsersPage"));
const CmsMapsPage = React.lazy(() => import("@/portals/cms/pages/MapsPage"));
const CmsReportsPage = React.lazy(() => import("@/portals/cms/pages/ReportsPage"));
const CmsPackagesPage = React.lazy(() => import("@/portals/cms/pages/PackagesPage"));
const CmsProfilePage = React.lazy(() => import("@/portals/cms/pages/ProfilePage"));
const CmsSystemAnnouncementPage = React.lazy(
  () => import("@/portals/cms/pages/SystemAnnouncementPage"),
);
const CmsComplaintsPage = React.lazy(() => import("@/portals/cms/pages/ComplaintsPage"));
const CmsComplaintDetailPage = React.lazy(() => import("@/portals/cms/pages/ComplaintDetailPage"));
const CmsComplaintCategoryConfigsPage = React.lazy(
  () => import("@/portals/cms/pages/ComplaintCategoryConfigsPage"),
);
const CmsGameplaySettingsPage = React.lazy(
  () => import("@/portals/cms/pages/GameplaySettingsPage"),
);
const CmsOrbitCoinExchangeRatePage = React.lazy(
  () => import("@/portals/cms/pages/OrbitCoinExchangeRatePage"),
);

export const cmsRoutes: RouteObject = {
  path: "cms",
  element: (
    <RequireCmsAuth>
      <CmsLayout />
    </RequireCmsAuth>
  ),
  children: [
    {
      index: true,
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsDashboardPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "dashboard",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsDashboardPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "finance-dashboard",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsFinanceDashboardPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "users",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsUsersPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "notifications/system-announcement",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsSystemAnnouncementPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "games",
      element: (
        <RequireCmsRole allowedRoles={["admin", "moderator"]}>
          <CmsMapsPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "gameplay",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsGameplaySettingsPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "orbitcoin",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsOrbitCoinExchangeRatePage />
        </RequireCmsRole>
      ),
    },
    {
      path: "reports",
      element: (
        <RequireCmsRole allowedRoles={["admin", "moderator"]}>
          <CmsReportsPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "revenue",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <Navigate to="/cms/finance-dashboard?tab=overview" replace />
        </RequireCmsRole>
      ),
    },
    {
      path: "packages",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsPackagesPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "complaints",
      element: (
        <RequireCmsRole allowedRoles={["admin", "moderator"]}>
          <CmsComplaintsPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "complaints/:id",
      element: (
        <RequireCmsRole allowedRoles={["admin", "moderator"]}>
          <CmsComplaintDetailPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "complaints/categories",
      element: (
        <RequireCmsRole allowedRoles={["admin"]}>
          <CmsComplaintCategoryConfigsPage />
        </RequireCmsRole>
      ),
    },
    {
      path: "profile",
      element: (
        <RequireCmsRole allowedRoles={["admin", "moderator"]}>
          <CmsProfilePage />
        </RequireCmsRole>
      ),
    },
  ],
};
