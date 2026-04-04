// src/lib/constants/routes.ts
export const ROUTES = {
  LANDING: "/",
  GAME: "/game",
  PLATFORM: "/platform",
  MAP_EDITOR: "/map-editor",
  GAMEMENU: "/game-menu",

  // Learner
  LEARNER_LOGIN: "/login",
  LEARNER_APP: "/app",
  // Default learner landing (currently Marketplace)
  LEARNER_HOME: "/app/marketplace",
  /** Browse / play maps (ex-challenges) */
  LEARNER_MAPS_BROWSE: "/app/maps",
  LEARNER_PACKAGES: "/app/packages",
  LEARNER_VERIFY_OTP: "/verify-otp",
  LEARNER_REGISTER: "/register",
  LEARNER_LEARN: "/app/browse",
  LEARNER_PROFILE: "/app/profile",
  LEARNER_LEADERBOARD: "/app/leaderboard",
  LEARNER_WALLET: "/app/wallet",
  LEARNER_WALLET_PAYMENT_SUCCESS: "/app/wallet/payment-success",
  LEARNER_WALLET_PAYMENT_FAILURE: "/app/wallet/payment-failure",
  LEARNER_MAPS: "/app/my-maps",
  LEARNER_MARKETPLACE: "/app/marketplace",
  LEARNER_MAP_DETAIL: "/app/map/:id",
  LEARNER_MAP_LEVEL_SELECT: (id: string) => `/app/map/${id}/levels`,
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
  /** Đọc nội dung khái niệm – use with /app/concept/:id */
  LEARNER_CONCEPT: (id: string) => `/app/concept/${id}`,
  /** Danh sách concept – học thêm concept khác (query: goalId để lọc theo goal) */
  LEARNER_CONCEPTS: "/app/concepts",

  // CMS
  CMS_LOGIN: "/cms/login",
  CMS_APP: "/cms",
  CMS_DASHBOARD: "/cms/dashboard",
  CMS_MAPS: "/cms/maps",
  CMS_USERS: "/cms/users",
  CMS_COMPLAINTS: "/cms/complaints",
  CMS_GAMEPLAY: "/cms/gameplay",
  CMS_ORBITCOIN: "/cms/orbitcoin",
} as const;
