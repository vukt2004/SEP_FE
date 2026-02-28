import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";

export function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStudentAuthStore((s) => s.isAuthenticated);
  const hydrate = useStudentAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.STUDENT_LOGIN} replace />;
  }

  return <>{children}</>;
}
