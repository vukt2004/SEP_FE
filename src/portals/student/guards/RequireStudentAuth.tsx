import { Navigate } from "react-router-dom";
import { useStudentAuthStore } from "@/stores/auth/studentAuth.store";
import { ROUTES } from "@/lib/constants/routes";

export function RequireStudentAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStudentAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.STUDENT_LOGIN} replace />;
  }

  return <>{children}</>;
}
