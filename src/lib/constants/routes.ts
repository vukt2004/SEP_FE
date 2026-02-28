// src/lib/constants/routes.ts
export const ROUTES = {
  LANDING: "/",
  GAME: "/game",
  PLATFORM: "/platform",

  // Student
  STUDENT_LOGIN: "/login",
  STUDENT_APP: "/app",
  STUDENT_HOME: "/app/home",
  STUDENT_VERIFY_OTP: "/verify-otp",
  STUDENT_REGISTER: "/register",

  // CMS
  CMS_LOGIN: "/cms/login",
  CMS_APP: "/cms",
  CMS_DASHBOARD: "/cms/dashboard",
} as const;
