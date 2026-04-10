import { ROUTES } from "@/lib/constants/routes";

export type CmsRole = "admin" | "moderator";

const ROLE_CLAIM_KEYS = [
	"role",
	"roles",
	"http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
] as const;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
	const parts = token.split(".");
	if (parts.length < 2) return null;

	try {
		const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		const json = decodeURIComponent(
			Array.prototype.map
				.call(atob(base64), (c: string) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
				.join(""),
		);
		return JSON.parse(json) as Record<string, unknown>;
	} catch {
		return null;
	}
}

export function normalizeCmsRole(value: string | null | undefined): CmsRole | null {
	if (!value) return null;

	const role = value.trim().toLowerCase();
	if (role === "admin" || role === "administrator") return "admin";
	if (role === "moderator" || role === "mod") return "moderator";
	return null;
}

export function getRolesFromCmsJwt(token: string | null | undefined): string[] {
	if (!token || typeof token !== "string") return [];

	const payload = decodeJwtPayload(token);
	if (!payload) return [];

	for (const key of ROLE_CLAIM_KEYS) {
		const value = payload[key];
		if (Array.isArray(value)) return value.map(String);
		if (typeof value === "string" && value.length > 0) return [value];
	}

	return [];
}

export function resolveCmsRole(
	apiRoles: string[] | null | undefined,
	token: string | null | undefined,
): CmsRole | null {
	const normalizedApiRoles = (apiRoles ?? [])
		.map((r) => normalizeCmsRole(r))
		.filter((r): r is CmsRole => Boolean(r));

	if (normalizedApiRoles.includes("admin")) return "admin";
	if (normalizedApiRoles.includes("moderator")) return "moderator";

	const normalizedTokenRoles = getRolesFromCmsJwt(token)
		.map((r) => normalizeCmsRole(r))
		.filter((r): r is CmsRole => Boolean(r));

	if (normalizedTokenRoles.includes("admin")) return "admin";
	if (normalizedTokenRoles.includes("moderator")) return "moderator";

	return null;
}

export function getCmsHomeRoute(role: CmsRole): string {
	return role === "admin" ? ROUTES.CMS_DASHBOARD : ROUTES.CMS_MAPS;
}

export function getCmsRoleLabel(role: CmsRole | null | undefined): string {
	if (role === "admin") return "Admin";
	if (role === "moderator") return "Moderator";
	return "Unknown";
}
