import { Navigate } from "react-router-dom";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";
import { ROUTES } from "@/lib/constants/routes";

export function RequireCmsAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useCmsAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.CMS_LOGIN} replace />;
  }

  return <>{children}</>;
}
