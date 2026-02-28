// src/app/router/routes.student.tsx
import React from "react";
import type { RouteObject } from "react-router-dom";

// Guard (student token)
import { RequireStudentAuth } from "@/portals/student/guards/RequireStudentAuth";

// Layout (student shell)
const StudentLayout = React.lazy(() => import("@/portals/student/layout/StudentLayout"));

// Pages (student authenticated)
const StudentHomePage = React.lazy(() => import("@/portals/student/pages/HomePage"));

// Pages (student public)
const StudentLoginPage = React.lazy(() => import("@/portals/student/pages/LoginPage"));
const StudentRegisterPage = React.lazy(() => import("@/portals/student/pages/RegisterPage"));
// Phase 2 sẽ tạo file này:
const StudentVerifyOtpPage = React.lazy(() => import("@/portals/student/pages/VerifyOtpPage"));

/**
 * Public student routes:
 * /student/login
 * /student/register
 * /student/verify-otp
 */
export const studentAuthRoutes: RouteObject = {
  path: "student",
  children: [
    { path: "login", element: <StudentLoginPage /> },
    { path: "register", element: <StudentRegisterPage /> },
    { path: "verify-otp", element: <StudentVerifyOtpPage /> }, // Phase 2
  ],
};

/**
 * Authenticated student routes:
 * /app (guarded) -> /app/home
 */
export const studentRoutes: RouteObject = {
  path: "app",
  element: (
    <RequireStudentAuth>
      <StudentLayout children={undefined} />
    </RequireStudentAuth>
  ),
  children: [
    { index: true, element: <StudentHomePage /> },
    { path: "home", element: <StudentHomePage /> },
  ],
};
