// src/app/router/routes.learner.tsx
import React, { Suspense } from "react";
import type { RouteObject } from "react-router-dom";

// Guard (learner token)
import { RequireLearnerAuth } from "@/portals/learner/guards/RequireLearnerAuth";

// Layout (learner shell)
const LearnerLayout = React.lazy(() => import("@/portals/learner/layout/LearnerLayout"));

// Pages (learner authenticated)
//const LearnerHomePage = React.lazy(() => import("@/portals/learner/pages/HomePage"));
const LearnerMapsBrowsePage = React.lazy(() => import("@/portals/learner/pages/MapsPage"));
const LearnerPackagesPage = React.lazy(() => import("@/portals/learner/pages/PackagesPage"));
const LearnerWalletPage = React.lazy(() => import("@/portals/learner/pages/WalletPageClean"));
const LearnerPaymentSuccessPage = React.lazy(
  () => import("@/portals/learner/pages/PaymentSuccessPage"),
);
const LearnerPaymentFailurePage = React.lazy(
  () => import("@/portals/learner/pages/PaymentFailurePage"),
);
const LearnerMyMapsPage = React.lazy(() => import("@/portals/learner/pages/MyMapsPage"));
const LearnerMapDetailPage = React.lazy(() => import("@/portals/learner/pages/MapDetailPage"));
const LearnerUserMapsPage = React.lazy(() => import("@/portals/learner/pages/UserMapsPage"));
const LearnerChatConversationPage = React.lazy(
  () => import("@/portals/learner/pages/ChatConversationPage"),
);
const LearnerMapLevelSelectPage = React.lazy(
  () => import("@/portals/learner/pages/MapLevelSelectPage"),
);
const LearnerMarketplacePage = React.lazy(() => import("@/portals/learner/pages/MarketplacePage"));
const LearnerComplaintsPage = React.lazy(() => import("@/portals/learner/pages/ComplaintsPage"));
const LearnerComplaintDetailPage = React.lazy(
  () => import("@/portals/learner/pages/ComplaintDetailPage"),
);
const LearnerComplaintOverviewPage = React.lazy(
  () => import("@/portals/learner/pages/ComplaintOverviewPage"),
);

// Pages (learner public)
const LearnerLoginPage = React.lazy(() => import("@/portals/learner/pages/LoginPage"));
const LearnerRegisterPage = React.lazy(() => import("@/portals/learner/pages/RegisterPage"));
// Phase 2 sẽ tạo file này:
const LearnerVerifyOtpPage = React.lazy(() => import("@/portals/learner/pages/VerifyOtpPage"));
const LearnerProfilePage = React.lazy(() => import("@/portals/learner/pages/ProfilePage"));
const LearnerLeaderboardPage = React.lazy(() => import("@/portals/learner/pages/LeaderboardPage"));
const LearnerNotificationsPage = React.lazy(
  () => import("@/portals/learner/pages/NotificationsPage"),
);
const LearnerModeSelectPage = React.lazy(() => import("@/portals/learner/pages/ModeSelectPage"));
const LearnerRoomCreatePage = React.lazy(() => import("@/portals/learner/pages/RoomCreatePage"));
const LearnerRoomJoinPage = React.lazy(() => import("@/portals/learner/pages/RoomJoinPage"));
const LearnerRoomDetailPage = React.lazy(() => import("@/portals/learner/pages/RoomDetailPage"));
const LearnerRoomResultPage = React.lazy(() => import("@/portals/learner/pages/RoomResultPage"));
const LearnerGoalSelectPage = React.lazy(() => import("@/portals/learner/pages/GoalSelectPage"));
const LearnerMyPathPage = React.lazy(() => import("@/portals/learner/pages/MyPathPage"));
const LearnerConceptDetailPage = React.lazy(
  () => import("@/portals/learner/pages/ConceptDetailPage"),
);
const LearnerConceptsListPage = React.lazy(
  () => import("@/portals/learner/pages/ConceptsListPage"),
);

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
 * /app (guarded) -> /app/marketplace
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
    // Default entry: Marketplace
    { index: true, element: <LearnerMarketplacePage /> },
    { path: "profile", element: <LearnerProfilePage /> },
    { path: "leaderboard", element: <LearnerLeaderboardPage /> },
    { path: "notifications", element: <LearnerNotificationsPage /> },
    { path: "wallet", element: <LearnerWalletPage /> },
    { path: "wallet/buyer", element: <LearnerWalletPage /> },
    { path: "wallet/creator", element: <LearnerWalletPage /> },
    { path: "wallet/payment-success", element: <LearnerPaymentSuccessPage /> },
    { path: "wallet/payment-failure", element: <LearnerPaymentFailurePage /> },
    { path: "games", element: <LearnerMapsBrowsePage /> },
    { path: "packages", element: <LearnerPackagesPage /> },
    { path: "browse", element: <LearnerModeSelectPage /> },
    { path: "my-games", element: <LearnerMyMapsPage /> },
    { path: "marketplace", element: <LearnerMarketplacePage /> },
    { path: "game/:id", element: <LearnerMapDetailPage /> },
    { path: "user/:userId/games", element: <LearnerUserMapsPage /> },
    { path: "chat", element: <LearnerChatConversationPage /> },
    { path: "chat/:conversationId", element: <LearnerChatConversationPage /> },
    { path: "game/:id/levels", element: <LearnerMapLevelSelectPage /> },
    { path: "room/create", element: <LearnerRoomCreatePage /> },
    { path: "room/join", element: <LearnerRoomJoinPage /> },
    { path: "room/result", element: <LearnerRoomResultPage /> },
    { path: "room/:roomId", element: <LearnerRoomDetailPage /> },
    { path: "goal-select", element: <LearnerGoalSelectPage /> },
    { path: "my-path", element: <LearnerMyPathPage /> },
    { path: "concept/:id", element: <LearnerConceptDetailPage /> },
    { path: "concepts", element: <LearnerConceptsListPage /> },
    { path: "complaints", element: <LearnerComplaintsPage /> },
    { path: "complaints/new", element: <LearnerComplaintsPage /> },
    { path: "complaints/:id", element: <LearnerComplaintDetailPage /> },
    { path: "complaints/:id/overview", element: <LearnerComplaintOverviewPage /> },
  ],
};
