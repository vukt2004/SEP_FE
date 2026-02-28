// src/app/router/index.tsx
import React from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { ROUTES } from "@/lib/constants/routes";
import { studentRoutes } from "./routes.student";
import { cmsRoutes } from "./routes.cms";
import { AppLoader, NotFoundPage, RouteErrorPage } from "./router.ui";

// Public pages (lazy)
const LandingPage = React.lazy(() => import("../../pages/Home"));
const StudentLoginPage = React.lazy(() => import("@/portals/student/pages/LoginPage"));
const StudentRegisterPage = React.lazy(() => import("@/portals/student/pages/RegisterPage"));
const StudentVerifyOtpPage = React.lazy(() => import("@/portals/student/pages/VerifyOtpPage"));

const CmsLoginPage = React.lazy(() => import("@/portals/cms/pages/LoginPage"));

const GameView = React.lazy(() => import("../../pages/Game-View/GameView"));
const PlatformGameView = React.lazy(() => import("../../pages/Game-View/PlatformGameView"));

const MapEditor = React.lazy(() => import("../../pages/Map-Editor/MapEditor"));

const routes: RouteObject[] = [
  {
    path: ROUTES.LANDING,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <LandingPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.GAME,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <GameView />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.PLATFORM,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <PlatformGameView />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.MAP_EDITOR ?? "/map-editor",
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <MapEditor />
      </React.Suspense>
    ),
  },

  // Public auth pages
  {
    path: ROUTES.STUDENT_LOGIN,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <StudentLoginPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.STUDENT_REGISTER ?? "/register",
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <StudentRegisterPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.STUDENT_VERIFY_OTP ?? "/verify-otp",
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <StudentVerifyOtpPage />
      </React.Suspense>
    ),
  },

  {
    path: ROUTES.CMS_LOGIN,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <CmsLoginPage />
      </React.Suspense>
    ),
  },

  // Convenience redirects
  {
    path: "/app",
    element: <Navigate to={ROUTES.STUDENT_HOME} replace />,
  },
  {
    path: "/cms",
    element: <Navigate to={ROUTES.CMS_DASHBOARD} replace />,
  },

  // Mount authenticated route groups (/app/* and /cms/*)
  {
    path: "/",
    element: <React.Suspense fallback={<AppLoader />} />,
    children: [studentRoutes, cmsRoutes],
  },

  // Catch-all
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
