// src/app/router/index.tsx
import React from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
  type RouteObject,
} from "react-router-dom";

import { ROUTES } from "@/lib/constants/routes";
import { learnerRoutes } from "./routes.learner";
import { cmsRoutes } from "./routes.cms";
import { AppLoader, NotFoundPage, RouteErrorPage } from "./router.ui";

// Public pages (lazy)
const LandingPage = React.lazy(() => import("../../pages/Home"));
const LearnerLoginPage = React.lazy(() => import("@/portals/learner/pages/LoginPage"));
const LearnerRegisterPage = React.lazy(() => import("@/portals/learner/pages/RegisterPage"));
const LearnerVerifyOtpPage = React.lazy(() => import("@/portals/learner/pages/VerifyOtpPage"));
const LearnerResetPasswordPage = React.lazy(() => import("@/portals/learner/pages/ResetPasswordPage"));

const CmsLoginPage = React.lazy(() => import("@/portals/cms/pages/LoginPage"));

const GameView = React.lazy(() => import("../../pages/Game-View/GameView"));
const SnakeGameView = React.lazy(() => import("../../pages/Game-View/SnakeGameView"));
const PlatformGameView = React.lazy(() => import("../../pages/Game-View/PlatformGameView"));
const GameSessionExpiredPage = React.lazy(
  () => import("../../pages/Game-View/GameSessionExpiredPage"),
);
const BuyerPolicyENPage = React.lazy(() => import("../../pages/policy/BuyerPolicyEN"));
const BuyerPolicyVIPage = React.lazy(() => import("../../pages/policy/BuyerPolicyVI"));
const SellerPolicyENPage = React.lazy(() => import("../../pages/policy/SellerPolicyEN"));
const SellerPolicyVIPage = React.lazy(() => import("../../pages/policy/SellerPolicyVI"));
const GameCreationRuleENPage = React.lazy(() => import("../../pages/policy/GameCreationRuleEN"));
const GameCreationRuleVIPage = React.lazy(() => import("../../pages/policy/GameCreationRuleVI"));

const MapEditor = React.lazy(() => import("../../pages/Map-Editor/MapEditor"));

function ScrollToTopLayout() {
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return <Outlet />;
}

const routes: RouteObject[] = [
  {
    path: "/",
    element: <ScrollToTopLayout />,
    children: [
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
        path: ROUTES.SNAKE,
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
        path: ROUTES.GAME_SESSION_EXPIRED,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <GameSessionExpiredPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.BUYER_POLICY_EN,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <BuyerPolicyENPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.BUYER_POLICY_VI,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <BuyerPolicyVIPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.SELLER_POLICY_EN,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <SellerPolicyENPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.SELLER_POLICY_VI,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <SellerPolicyVIPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.GAME_CREATION_RULE_EN,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <GameCreationRuleENPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.GAME_CREATION_RULE_VI,
        errorElement: <RouteErrorPage />,
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <GameCreationRuleVIPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.MAP_EDITOR ?? "/game-editor",
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
        path: ROUTES.LEARNER_RESET_PASSWORD ?? "/reset-password",
        element: (
          <React.Suspense fallback={<AppLoader />}>
            <LearnerResetPasswordPage />
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
    ],
  },
];

export const router = createBrowserRouter(routes);
