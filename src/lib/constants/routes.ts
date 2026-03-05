// src/lib/constants/routes.ts
export const ROUTES = {
  LANDING: "/",
  GAME: "/game",
  PLATFORM: "/platform",
  MAP_EDITOR: "/map-editor",
  GAMEMENU: "/game-menu",

  // Student
  STUDENT_LOGIN: "/login",
  STUDENT_APP: "/app",
  STUDENT_HOME: "/app/home",
  STUDENT_CHALLENGES: "/app/challenges",
  STUDENT_PACKAGES: "/app/packages",
  STUDENT_VERIFY_OTP: "/verify-otp",
  STUDENT_REGISTER: "/register",
  STUDENT_LEARN: "/app/browse",
  STUDENT_PROFILE: "/app/profile",

  // CMS
  CMS_LOGIN: "/cms/login",
  CMS_APP: "/cms",
  CMS_DASHBOARD: "/cms/dashboard",
  CMS_USERS: "/cms/users",
} as const;
