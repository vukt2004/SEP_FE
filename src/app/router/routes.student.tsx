// src/app/router/routes.student.tsx
import React from "react";
import type { RouteObject } from "react-router-dom";

// Guard (student token)
import { RequireStudentAuth } from "@/portals/student/guards/RequireStudentAuth";

// Layout (student shell)
const StudentLayout = React.lazy(() => import("@/portals/student/layout/StudentLayout"));

// Pages (student authenticated)
const StudentHomePage = React.lazy(() => import("@/portals/student/pages/HomePage"));

// You can extend these children later (levels, profile, etc.)
export const studentRoutes: RouteObject = {
  path: "app",
  element: (
    <RequireStudentAuth>
      <StudentLayout />
    </RequireStudentAuth>
  ),
  children: [
    {
      index: true,
      // Default entry: /app -> /app/home (handled by index route + Navigate in root router),
      // but we still keep a safe index route page if you want.
      element: <StudentHomePage />,
    },
    {
      path: "home",
      element: <StudentHomePage />,
    },
  ],
};
