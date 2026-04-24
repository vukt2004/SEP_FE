// src/lib/constants/routes.ts
export const ROUTES = {
  LANDING: "/",
  GAME: "/game",
  SNAKE: "/snake",
  PLATFORM: "/platform",
  GAME_SESSION_EXPIRED: "/game-session-expired",
  BUYER_POLICY_EN: "/policy/buyer/en",
  BUYER_POLICY_VI: "/policy/buyer/vi",
  SELLER_POLICY_EN: "/policy/seller/en",
  SELLER_POLICY_VI: "/policy/seller/vi",
  GAME_CREATION_RULE_EN: "/policy/game-creation/en",
  GAME_CREATION_RULE_VI: "/policy/game-creation/vi",
  MAP_EDITOR: "/game-editor",
  GAMEMENU: "/game-menu",

  // Learner
  LEARNER_LOGIN: "/login",
  LEARNER_APP: "/app",
  // Default learner landing (currently Marketplace)
  LEARNER_HOME: "/app/marketplace",
  /** Browse / play maps (ex-challenges) */
  LEARNER_MAPS_BROWSE: "/app/games",
  LEARNER_PACKAGES: "/app/packages",
  LEARNER_VERIFY_OTP: "/verify-otp",
  LEARNER_REGISTER: "/register",
  LEARNER_RESET_PASSWORD: "/reset-password",
  LEARNER_LEARN: "/app/browse",
  LEARNER_PROFILE: "/app/profile",
  LEARNER_LEADERBOARD: "/app/leaderboard",
  LEARNER_NOTIFICATIONS: "/app/notifications",
  LEARNER_WALLET: "/app/wallet",
  LEARNER_WALLET_PAYMENT_SUCCESS: "/app/wallet/payment-success",
  LEARNER_WALLET_PAYMENT_FAILURE: "/app/wallet/payment-failure",
  LEARNER_MAPS: "/app/my-games",
  LEARNER_MARKETPLACE: "/app/marketplace",
  LEARNER_CHAT: "/app/chat",
  LEARNER_MAP_DETAIL: "/app/game/:id",
  LEARNER_USER_MAPS: (userId: string) => `/app/user/${userId}/games`,
  LEARNER_CHAT_CONVERSATION: (conversationId: string) => `/app/chat/${conversationId}`,
  LEARNER_MAP_LEVEL_SELECT: (id: string) => `/app/game/${id}/levels`,
  LEARNER_ROOM_CREATE: "/app/room/create",
  LEARNER_ROOM_JOIN: "/app/room/join",
  /** Room detail/waiting – use with /app/room/:roomId (roomId must be single segment, no slashes) */
  LEARNER_ROOM_DETAIL: (roomId: string) => `/app/room/${String(roomId).replace(/\//g, "").trim()}`,
  /** Kết quả xếp hạng sau khi tất cả đã submit – truyền state: { ranking, roomId } */
  LEARNER_ROOM_RESULT: "/app/room/result",
  /** Chọn mục tiêu học tập (sau đăng nhập / lần đầu) */
  LEARNER_GOAL_SELECT: "/app/goal-select",
  /** Lộ trình của tôi – danh sách concept + map theo goal đã chọn */
  LEARNER_MY_PATH: "/app/my-path",
  LEARNER_COMPLAINTS: "/app/complaints",
  LEARNER_COMPLAINTS_NEW: "/app/complaints/new",
  LEARNER_COMPLAINT_DETAIL: (id: string) => `/app/complaints/${id}`,
  LEARNER_COMPLAINT_OVERVIEW: (id: string) => `/app/complaints/${id}/overview`,
  /** Đọc nội dung khái niệm – use with /app/concept/:id */
  LEARNER_CONCEPT: (id: string) => `/app/concept/${id}`,
  /** Danh sách concept – học thêm concept khác (query: goalId để lọc theo goal) */
  LEARNER_CONCEPTS: "/app/concepts",

  // CMS
  CMS_LOGIN: "/cms/login",
  CMS_APP: "/cms",
  CMS_DASHBOARD: "/cms/dashboard",
  CMS_MAPS: "/cms/games",
  CMS_REPORTS: "/cms/reports",
  CMS_REVENUE: "/cms/revenue",
  CMS_USERS: "/cms/users",
  CMS_SYSTEM_ANNOUNCEMENT: "/cms/notifications/system-announcement",
  CMS_PACKAGES: "/cms/packages",
  CMS_COMPLAINTS: "/cms/complaints",
  CMS_COMPLAINT_CATEGORIES: "/cms/complaints/categories",
  CMS_GAMEPLAY: "/cms/gameplay",
  CMS_ORBITCOIN: "/cms/orbitcoin",
  CMS_PROFILE: "/cms/profile",
} as const;
