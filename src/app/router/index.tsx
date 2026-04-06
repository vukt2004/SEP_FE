// src/app/router/index.tsx
import React from "react";
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from "react-router-dom";

import { ROUTES } from "@/lib/constants/routes";
import { learnerRoutes } from "./routes.learner";
import { cmsRoutes } from "./routes.cms";
import { AppLoader, NotFoundPage, RouteErrorPage } from "./router.ui";

// Public pages (lazy)
const LandingPage = React.lazy(() => import("../../pages/Home"));
const LearnerLoginPage = React.lazy(() => import("@/portals/learner/pages/LoginPage"));
const LearnerRegisterPage = React.lazy(() => import("@/portals/learner/pages/RegisterPage"));
const LearnerVerifyOtpPage = React.lazy(() => import("@/portals/learner/pages/VerifyOtpPage"));

const CmsLoginPage = React.lazy(() => import("@/portals/cms/pages/LoginPage"));

const GameView = React.lazy(() => import("../../pages/Game-View/GameView"));
const SnakeGameView = React.lazy(() => import("../../pages/Game-View/SnakeGameView"));
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
    path: ROUTES.APPLE_WORM,
    errorElement: <RouteErrorPage />,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <SnakeGameView />
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
    path: ROUTES.LEARNER_LOGIN,
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <LearnerLoginPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.LEARNER_REGISTER ?? "/register",
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <LearnerRegisterPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.LEARNER_VERIFY_OTP ?? "/verify-otp",
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <LearnerVerifyOtpPage />
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
    element: <Navigate to={ROUTES.LEARNER_HOME} replace />,
  },
  {
    path: "/cms",
    element: <Navigate to={ROUTES.CMS_DASHBOARD} replace />,
  },

  // Mount authenticated route groups (/app/* and /cms/*)
  {
    path: "/",
    element: (
      <React.Suspense fallback={<AppLoader />}>
        <Outlet />
      </React.Suspense>
    ),
    children: [learnerRoutes, cmsRoutes],
  },

  // Catch-all
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(routes);
