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
  LEARNER_HOME: "/app/home",
  LEARNER_CHALLENGES: "/app/challenges",
  LEARNER_PACKAGES: "/app/packages",
  LEARNER_VERIFY_OTP: "/verify-otp",
  LEARNER_REGISTER: "/register",
  LEARNER_LEARN: "/app/browse",
  LEARNER_PROFILE: "/app/profile",
  LEARNER_WALLET: "/app/wallet",
  LEARNER_MAPS: "/app/my-maps",
  LEARNER_MAP_DETAIL: "/app/map/:id",
  LEARNER_ROOM_CREATE: "/app/room/create",
  LEARNER_ROOM_JOIN: "/app/room/join",

  // CMS
  CMS_LOGIN: "/cms/login",
  CMS_APP: "/cms",
  CMS_DASHBOARD: "/cms/dashboard",
  CMS_USERS: "/cms/users",
} as const;
