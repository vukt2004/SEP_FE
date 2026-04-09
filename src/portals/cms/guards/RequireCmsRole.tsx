import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";
import { useCmsAuthStore } from "@/stores/auth/cmsAuth.store";
import { getCmsHomeRoute, normalizeCmsRole, type CmsRole } from "@/lib/auth/role";

type RequireCmsRoleProps = {
	children: ReactNode;
	allowedRoles: CmsRole[];
};

export function RequireCmsRole({ children, allowedRoles }: RequireCmsRoleProps) {
	const location = useLocation();
	const isAuthenticated = useCmsAuthStore((s) => s.isAuthenticated);
	const role = useCmsAuthStore((s) => s.role);
	const resolvedRole = normalizeCmsRole(role);

	if (!isAuthenticated || !resolvedRole) {
		return <Navigate to={ROUTES.CMS_LOGIN} replace />;
	}

	if (!allowedRoles.includes(resolvedRole)) {
		const fallbackPath = getCmsHomeRoute(resolvedRole);
		if (location.pathname === fallbackPath) {
			return <Navigate to={ROUTES.CMS_LOGIN} replace />;
		}
		return <Navigate to={fallbackPath} replace />;
	}

	return <>{children}</>;
}
