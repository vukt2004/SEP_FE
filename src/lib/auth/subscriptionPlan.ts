import { learnerPackagesApi } from "@/services/api/learner/packages.api";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import type { UserPackage } from "@/types/api/learner/packages";

export type SubscriptionPlan = "free" | "pro" | "creator";
export type AssetTier = "basic" | "advanced";
export type PlanRoleContext = "learner" | "cms";

const PLAN_ALIASES: Record<string, SubscriptionPlan> = {
  free: "free",
  basic: "free",
  starter: "free",

  pro: "pro",
  premium: "pro",

  creator: "creator",
  enterprise: "creator",
  admin: "creator",
  moderator: "creator",
  mod: "creator",
};

const PLAN_CACHE_TTL_MS = 30_000;

let cachedPlan: SubscriptionPlan | null = null;
let cachedAt = 0;
let cachedLearnerToken: string | null = null;
let pendingPlanRequest: Promise<SubscriptionPlan> | null = null;

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 1,
  creator: 2,
};

function normalizePlanValue(value: unknown): SubscriptionPlan | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const plan = normalizePlanValue(item);
      if (plan) {
        return plan;
      }
    }
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized.length === 0) {
    return null;
  }

  // Accept package names like "Creator package" or "Pro 30 days".
  if (normalized.includes("creator") || normalized.includes("enterprise")) {
    return "creator";
  }
  if (normalized.includes("pro") || normalized.includes("premium")) {
    return "pro";
  }
  if (normalized.includes("free") || normalized.includes("basic") || normalized.includes("starter")) {
    return "free";
  }

  return PLAN_ALIASES[normalized] ?? null;
}

/**
 * Map package name from API into supported subscription plans.
 */
function resolvePlanFromPackageName(name: unknown): SubscriptionPlan {
  return normalizePlanValue(name) ?? "free";
}

/**
 * Clear in-memory plan cache, useful after login/logout/package purchase.
 */
export function clearCurrentUserPlanCache(): void {
  cachedPlan = null;
  cachedAt = 0;
  cachedLearnerToken = null;
  pendingPlanRequest = null;
}

function isPackageActiveNow(pkg: UserPackage, now: Date): boolean {
  const remainingValid = pkg.remaining === null || pkg.remaining > 0;
  const expiresAtMs = Date.parse(pkg.expiresAt);
  const expiryValid = Number.isFinite(expiresAtMs) ? expiresAtMs > now.getTime() : true;
  return remainingValid && expiryValid;
}

function resolvePlanFromPackages(items: UserPackage[]): SubscriptionPlan {
  if (!Array.isArray(items) || items.length === 0) {
    return "free";
  }

  const now = new Date();
  const activeItems = items.filter((pkg) => isPackageActiveNow(pkg, now));
  const candidates = activeItems.length > 0 ? activeItems : items;

  let bestPlan: SubscriptionPlan = "free";
  for (const pkg of candidates) {
    const plan = resolvePlanFromPackageName(pkg.name);
    if (PLAN_RANK[plan] > PLAN_RANK[bestPlan]) {
      bestPlan = plan;
    }
  }

  return bestPlan;
}

/**
 * Resolve plan from authenticated user context.
 * - Learner context: use /api/learner/marketplace/my-packages
 * - CMS context: skip package lookup and keep creator-level access
 */
export async function getCurrentUserPlan(
  forceRefresh: boolean = false,
  roleContext?: PlanRoleContext,
): Promise<SubscriptionPlan> {
  const learnerToken = tokenStorage.getLearnerToken();
  const cmsToken = tokenStorage.getCmsToken();

  const shouldCheckLearnerPackage =
    roleContext === "learner" || (roleContext === undefined && Boolean(learnerToken) && !cmsToken);

  if (!shouldCheckLearnerPackage) {
    if (cmsToken) {
      return "creator";
    }
    return "free";
  }

  if (!learnerToken) {
    return "free";
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedPlan &&
    cachedLearnerToken === learnerToken &&
    now - cachedAt < PLAN_CACHE_TTL_MS
  ) {
    return cachedPlan;
  }

  if (!forceRefresh && pendingPlanRequest) {
    return pendingPlanRequest;
  }

  pendingPlanRequest = learnerPackagesApi
    .getMyPackages(1, 20)
    .then((response): SubscriptionPlan => {
      const items = response.data?.data?.items ?? [];
      const plan = resolvePlanFromPackages(items);
      cachedPlan = plan;
      cachedAt = Date.now();
      cachedLearnerToken = learnerToken;
      return plan;
    })
    .catch((): SubscriptionPlan => {
      // Fail-safe: if package lookup fails, keep non-premium behavior.
      cachedPlan = "free";
      cachedAt = Date.now();
      cachedLearnerToken = learnerToken;
      return "free";
    })
    .finally(() => {
      pendingPlanRequest = null;
    });

  const activeRequest = pendingPlanRequest;
  return activeRequest;
}

export function getAllowedTiers(plan: SubscriptionPlan): AssetTier[] {
  if (plan === "creator") {
    return ["basic", "advanced"];
  }

  if (plan === "pro") {
    return ["basic"];
  }

  return [];
}

export function isTierLocked(plan: SubscriptionPlan, tier: AssetTier): boolean {
  return !getAllowedTiers(plan).includes(tier);
}

export function canCreateMaps(plan: SubscriptionPlan): boolean {
  return plan !== "free";
}

export function canUseAssets(plan: SubscriptionPlan): boolean {
  return getAllowedTiers(plan).length > 0;
}
