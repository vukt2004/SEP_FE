/**
 * Decode role claims from the learner JWT (no signature verification — UI hints only).
 * ASP.NET Core often uses claim type "role" or short "role" in payload.
 */
export function getRolesFromLearnerJwt(token: string | null | undefined): string[] {
  if (!token || typeof token !== "string") return [];
  const parts = token.split(".");
  if (parts.length < 2) return [];
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    const payload = JSON.parse(json) as Record<string, unknown>;
    const claimKeys = ["role", "roles", "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
    for (const key of claimKeys) {
      const v = payload[key];
      if (Array.isArray(v)) return v.map(String);
      if (typeof v === "string" && v.length > 0) return [v];
    }
    return [];
  } catch {
    return [];
  }
}

/** Admin / Moderator may call POST /api/learner/maps/{id}/publish (Approved → Published). */
export function canPublishMapViaLearnerApi(token: string | null | undefined): boolean {
  const roles = getRolesFromLearnerJwt(token);
  return roles.some((r) => {
    const x = r.trim().toLowerCase();
    return x === "admin" || x === "moderator";
  });
}
