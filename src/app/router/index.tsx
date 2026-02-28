// src/app/router/index.tsx
import React from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { ROUTES } from "@/lib/constants/routes";
import { studentRoutes } from "./routes.student";
import { cmsRoutes } from "./routes.cms";
import { AppLoader, NotFoundPage, RouteErrorPage } from "./router.ui";

// Public pages
const LandingPage = React.lazy(() => import("../../pages/Home"));
const StudentLoginPage = React.lazy(() => import("@/portals/student/pages/LoginPage"));
const CmsLoginPage = React.lazy(() => import("@/portals/cms/pages/LoginPage"));
const GameView = React.lazy(() => import("../../pages/Game-View/GameView"));
const PlatformGameView = React.lazy(() => import("../../pages/Game-View/PlatformGameView"));
const StudentRegisterPage = React.lazy(() => import("@/portals/student/pages/RegisterPage"));
const StudentVerifyOtpPage = React.lazy(() => import("@/portals/student/pages/VerifyOtpPage"));

/**
 * Root route structure (normalized):
 *  - "/"            -> Landing (public)
 *  - "/login"       -> Student login (public)
 *  - "/cms/login"   -> CMS login (public)
 *  - "/app/*"       -> Student authenticated portal
 *  - "/cms/*"       -> CMS authenticated portal (except /cms/login)
 */
const routes: RouteObject[] = [
  {
    path: ROUTES.LANDING,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        {/* Root outlet-less structure: child routes render directly */}
        <LandingPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.GAME,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        {/* Root outlet-less structure: child routes render directly */}
        <GameView />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.PLATFORM,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        {/* Root outlet-less structure: child routes render directly */}
        <PlatformGameView />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.STUDENT_LOGIN,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <StudentLoginPage />
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

  // Convenience redirects (optional but helps UX)
  {
    path: "/app",
    element: <Navigate to={ROUTES.STUDENT_HOME} replace />,
  },
  {
    path: "/cms",
    element: <Navigate to={ROUTES.CMS_DASHBOARD} replace />,
  },

  // Mount authenticated route groups
  {
    // IMPORTANT: this mounts /app/* (studentRoutes.path = "app")
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
