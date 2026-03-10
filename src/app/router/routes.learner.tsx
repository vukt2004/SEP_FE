// src/app/router/routes.learner.tsx
import React, { Suspense } from "react";
import type { RouteObject } from "react-router-dom";

// Guard (learner token)
import { RequireLearnerAuth } from "@/portals/learner/guards/RequireLearnerAuth";

// Layout (learner shell)
const LearnerLayout = React.lazy(() => import("@/portals/learner/layout/LearnerLayout"));

// Pages (learner authenticated)
const LearnerHomePage = React.lazy(() => import("@/portals/learner/pages/HomePage"));
const LearnerChallengesPage = React.lazy(() => import("@/portals/learner/pages/ChallengesPage"));
const LearnerPackagesPage = React.lazy(() => import("@/portals/learner/pages/PackagesPage"));
const LearnerWalletPage = React.lazy(() => import("@/portals/learner/pages/WalletPage"));

// Pages (learner public)
const LearnerLoginPage = React.lazy(() => import("@/portals/learner/pages/LoginPage"));
const LearnerRegisterPage = React.lazy(() => import("@/portals/learner/pages/RegisterPage"));
// Phase 2 sẽ tạo file này:
const LearnerVerifyOtpPage = React.lazy(() => import("@/portals/learner/pages/VerifyOtpPage"));
const LearnerProfilePage = React.lazy(() => import("@/portals/learner/pages/ProfilePage"));
const LearnerModeSelectPage = React.lazy(() => import("@/portals/learner/pages/ModeSelectPage"));

/**
 * Public learner routes:
 * /learner/login
 * /learner/register
 * /learner/verify-otp
 */
export const learnerAuthRoutes: RouteObject = {
  path: "learner",
  children: [
    { path: "login", element: <LearnerLoginPage /> },
    { path: "register", element: <LearnerRegisterPage /> },
    { path: "verify-otp", element: <LearnerVerifyOtpPage /> }, // Phase 2
  ],
};

/**
 * Authenticated learner routes:
 * /app (guarded) -> /app/home
 */
export const learnerRoutes: RouteObject = {
  path: "app",
  element: (
    <RequireLearnerAuth>
      <Suspense fallback={<div style={{ padding: 16, color: "white" }}>Loading page...</div>}>
        <LearnerLayout />
      </Suspense>
    </RequireLearnerAuth>
  ),
  children: [
    { index: true, element: <LearnerHomePage /> },
    { path: "home", element: <LearnerHomePage /> },
    { path: "profile", element: <LearnerProfilePage /> },
    { path: "wallet", element: <LearnerWalletPage /> },
    { path: "challenges", element: <LearnerChallengesPage /> },
    { path: "packages", element: <LearnerPackagesPage /> },
    { path: "browse", element: <LearnerModeSelectPage /> },
  ],
};
