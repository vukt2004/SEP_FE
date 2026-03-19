// src/.../RequireLearnerAuth.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useLearnerAuthStore } from "@/stores/auth/learnerAuth.store";

export function RequireLearnerAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useLearnerAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LEARNER_LOGIN} replace />;
  }

  return <>{children}</>;
}
