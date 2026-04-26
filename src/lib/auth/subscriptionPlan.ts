import { learnerPackagesApi } from "@/services/api/learner/packages.api";
import { tokenStorage } from "@/lib/storage/tokenStorage";
import type { UserPackage } from "@/types/api/learner/packages";

export type SubscriptionPlan = "free" | "pro" | "creator";
export type AssetTier = "basic" | "advanced";
export type PlanRoleContext = "learner" | "cms";
export interface SubscriptionCapabilities {
  plan: SubscriptionPlan;
  canCreateGame: boolean;
  advancedAssets: boolean;
  canPrivateRoom: boolean;
  xpBoostMultiplier: number;
  monthlyHintQuota: number;
}

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
let cachedCapabilities: SubscriptionCapabilities | null = null;
let pendingCapabilitiesRequest: Promise<SubscriptionCapabilities> | null = null;

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

function resolvePlanFromFeaturesSpec(featuresSpec: unknown): SubscriptionPlan | null {
  if (typeof featuresSpec !== "string" || featuresSpec.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(featuresSpec) as Record<string, unknown>;
    const featuresNode =
      parsed.features && typeof parsed.features === "object"
        ? (parsed.features as Record<string, unknown>)
        : null;
    const canCreateGame = featuresNode?.can_create_game === true;
    const hasAdvancedAssets = featuresNode?.advanced_assets === true;

    if (hasAdvancedAssets) {
      return "creator";
    }
    if (canCreateGame) {
      return "pro";
    }

    return (
      normalizePlanValue(parsed.plan) ??
      normalizePlanValue(parsed.tier) ??
      normalizePlanValue(parsed.subscription) ??
      null
    );
  } catch {
    return null;
  }
}

function parseFeaturesNode(featuresSpec: unknown): Record<string, unknown> | null {
  if (typeof featuresSpec !== "string" || featuresSpec.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(featuresSpec) as Record<string, unknown>;
    if (parsed.features && typeof parsed.features === "object") {
      return parsed.features as Record<string, unknown>;
    }
    return parsed;
  } catch {
    return null;
  }
}

function toBoolean(value: unknown): boolean {
  return value === true;
}

function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function resolveCapabilitiesFromPackages(items: UserPackage[]): SubscriptionCapabilities {
  const plan = resolvePlanFromPackages(items);
  const defaultsByPlan: Record<SubscriptionPlan, Omit<SubscriptionCapabilities, "plan">> = {
    free: {
      canCreateGame: false,
      advancedAssets: false,
      canPrivateRoom: false,
      xpBoostMultiplier: 1,
      monthlyHintQuota: 20,
    },
    pro: {
      canCreateGame: true,
      advancedAssets: false,
      canPrivateRoom: true,
      xpBoostMultiplier: 1.15,
      monthlyHintQuota: 120,
    },
    creator: {
      canCreateGame: true,
      advancedAssets: true,
      canPrivateRoom: true,
      xpBoostMultiplier: 1.3,
      monthlyHintQuota: 500,
    },
  };

  const now = new Date();
  const activeItems = items.filter((pkg) => isPackageActiveNow(pkg, now));
  const candidates = activeItems.length > 0 ? activeItems : items;
  const base = defaultsByPlan[plan];
  let capabilities: SubscriptionCapabilities = {
    plan,
    canCreateGame: base.canCreateGame,
    advancedAssets: base.advancedAssets,
    canPrivateRoom: base.canPrivateRoom,
    xpBoostMultiplier: base.xpBoostMultiplier,
    monthlyHintQuota: base.monthlyHintQuota,
  };

  for (const pkg of candidates) {
    const node = parseFeaturesNode(pkg.featuresSpec);
    if (!node) continue;

    capabilities = {
      ...capabilities,
      canCreateGame: capabilities.canCreateGame || toBoolean(node.can_create_game),
      advancedAssets: capabilities.advancedAssets || toBoolean(node.advanced_assets),
      canPrivateRoom: capabilities.canPrivateRoom || toBoolean(node.can_private_room),
      xpBoostMultiplier: Math.max(
        capabilities.xpBoostMultiplier,
        toPositiveNumber(node.xp_boost_multiplier, capabilities.xpBoostMultiplier),
      ),
      monthlyHintQuota: Math.max(
        capabilities.monthlyHintQuota,
        Math.floor(toPositiveNumber(node.monthly_hint_quota, capabilities.monthlyHintQuota)),
      ),
    };
  }

  return capabilities;
}

/**
 * Clear in-memory plan cache, useful after login/logout/package purchase.
 */
export function clearCurrentUserPlanCache(): void {
  cachedPlan = null;
  cachedAt = 0;
  cachedLearnerToken = null;
  pendingPlanRequest = null;
  cachedCapabilities = null;
  pendingCapabilitiesRequest = null;
}

function isPackageActiveNow(pkg: UserPackage, now: Date): boolean {
  const remainingValid = pkg.remaining === null || pkg.remaining > 0;
  const expiresAtMs = pkg.expiresAt ? Date.parse(pkg.expiresAt) : Number.NaN;
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
    const plan = resolvePlanFromFeaturesSpec(pkg.featuresSpec) ?? resolvePlanFromPackageName(pkg.name);
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

export async function getCurrentUserCapabilities(
  forceRefresh: boolean = false,
  roleContext?: PlanRoleContext,
): Promise<SubscriptionCapabilities> {
  const learnerToken = tokenStorage.getLearnerToken();
  const cmsToken = tokenStorage.getCmsToken();

  const shouldCheckLearnerPackage =
    roleContext === "learner" || (roleContext === undefined && Boolean(learnerToken) && !cmsToken);

  if (!shouldCheckLearnerPackage) {
    return {
      plan: cmsToken ? "creator" : "free",
      canCreateGame: Boolean(cmsToken),
      advancedAssets: Boolean(cmsToken),
      canPrivateRoom: Boolean(cmsToken),
      xpBoostMultiplier: cmsToken ? 1.3 : 1,
      monthlyHintQuota: cmsToken ? 500 : 20,
    };
  }

  if (!learnerToken) {
    return {
      plan: "free",
      canCreateGame: false,
      advancedAssets: false,
      canPrivateRoom: false,
      xpBoostMultiplier: 1,
      monthlyHintQuota: 20,
    };
  }

  const now = Date.now();
  if (
    !forceRefresh &&
    cachedCapabilities &&
    cachedLearnerToken === learnerToken &&
    now - cachedAt < PLAN_CACHE_TTL_MS
  ) {
    return cachedCapabilities;
  }

  if (!forceRefresh && pendingCapabilitiesRequest) {
    return pendingCapabilitiesRequest;
  }

  pendingCapabilitiesRequest = learnerPackagesApi
    .getMyPackages(1, 20)
    .then((response): SubscriptionCapabilities => {
      const items = response.data?.data?.items ?? [];
      const capabilities = resolveCapabilitiesFromPackages(items);
      cachedPlan = capabilities.plan;
      cachedCapabilities = capabilities;
      cachedAt = Date.now();
      cachedLearnerToken = learnerToken;
      return capabilities;
    })
    .catch((): SubscriptionCapabilities => {
      const fallback: SubscriptionCapabilities = {
        plan: "free",
        canCreateGame: false,
        advancedAssets: false,
        canPrivateRoom: false,
        xpBoostMultiplier: 1,
        monthlyHintQuota: 20,
      };
      cachedPlan = fallback.plan;
      cachedCapabilities = fallback;
      cachedAt = Date.now();
      cachedLearnerToken = learnerToken;
      return fallback;
    })
    .finally(() => {
      pendingCapabilitiesRequest = null;
    });

  return pendingCapabilitiesRequest;
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

export function canPublishMaps(plan: SubscriptionPlan): boolean {
  return plan === "creator";
}

export function canUsePrivateRoom(plan: SubscriptionPlan): boolean {
  return plan === "pro" || plan === "creator";
}

export function canUsePrivateRoomFromCapabilities(capabilities: SubscriptionCapabilities): boolean {
  return capabilities.canPrivateRoom;
}

export function canUseCreatorAnalytics(plan: SubscriptionPlan): boolean {
  return plan === "creator";
}
