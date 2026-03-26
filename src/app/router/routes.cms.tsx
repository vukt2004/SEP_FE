// src/app/router/routes.cms.tsx
import React from "react";
import type { RouteObject } from "react-router-dom";

// Guard (cms token + (optionally) role check inside)
import { RequireCmsAuth } from "@/portals/cms/guards/RequireCmsAuth";

// Layout (cms shell)
const CmsLayout = React.lazy(() => import("@/portals/cms/layout/CmsLayout"));

// Pages (cms authenticated)
const CmsDashboardPage = React.lazy(() => import("@/portals/cms/pages/DashboardPage"));
const CmsUsersPage = React.lazy(() => import("@/portals/cms/pages/UsersPage"));
const CmsMapsPage = React.lazy(() => import("@/portals/cms/pages/MapsPage"));
const CmsReportsPage = React.lazy(() => import("@/portals/cms/pages/ReportsPage"));
const CmsPackagesPage = React.lazy(() => import("@/portals/cms/pages/PackagesPage"));
const CmsProfilePage = React.lazy(() => import("@/portals/cms/pages/ProfilePage"));
const CmsComplaintsPage = React.lazy(() => import("@/portals/cms/pages/ComplaintsPage"));
const CmsComplaintDetailPage = React.lazy(() => import("@/portals/cms/pages/ComplaintDetailPage"));

// Optional: if you want a separate role guard, you can wrap dashboard/routes with it.
// import { RequireCmsRole } from "@/portals/cms/guards/RequireCmsRole";

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
      element: <CmsDashboardPage />,
    },
    {
      path: "dashboard",
      element: <CmsDashboardPage />,
    },
    {
      path: "users",
      element: <CmsUsersPage />,
    },
    {
      path: "maps",
      element: <CmsMapsPage />,
    },
    {
      path: "reports",
      element: <CmsReportsPage />,
    },
    {
      path: "packages",
      element: <CmsPackagesPage />,
    },
    {
      path: "complaints",
      element: <CmsComplaintsPage />,
    },
    {
      path: "complaints/:id",
      element: <CmsComplaintDetailPage />,
    },
    {
      path: "profile",
      element: <CmsProfilePage />,
    },
  ],
};
