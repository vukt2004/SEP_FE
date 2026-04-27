// src/portals/learner/pages/PackagesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { learnerPackagesApi } from "@/services/api/learner/packages.api";
import type { Package, UserPackage } from "@/types/api/learner/packages";
import type { ApiResult } from "@/types/api/common";
import { useTranslation } from "@/lib/i18n/translations";
import { clearCurrentUserPlanCache } from "@/lib/auth/subscriptionPlan";
import { ROUTES } from "@/lib/constants/routes";
import "@/shared/styles/tokens.css";
import styles from "./PackagesPage.module.css";

const CURRENCY = "OC"; // Orbit Coin – không dùng VND

type PurchaseModalState = {
  kind: "success" | "insufficient" | "error";
  message: string;
};

type NormalizedPlan = "free" | "pro" | "creator";

const PLAN_RANK: Record<NormalizedPlan, number> = {
  free: 0,
  pro: 1,
  creator: 2,
};

function normalizePlanName(name: string): NormalizedPlan | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes("creator") || normalized.includes("enterprise")) {
    return "creator";
  }
  if (normalized.includes("pro") || normalized.includes("premium")) {
    return "pro";
  }
  if (normalized.includes("free") || normalized.includes("basic") || normalized.includes("starter")) {
    return "free";
  }

  return null;
}

type ParsedFeaturesSpec = {
  plan?: string;
  features?: {
    can_create_game?: boolean;
    advanced_assets?: boolean;
    can_private_room?: boolean;
    xp_boost_multiplier?: number;
    monthly_hint_quota?: number;
  };
};

function tryParseFeaturesSpec(raw: string | null | undefined): ParsedFeaturesSpec | null {
  const s = raw?.trim();
  if (!s || !s.startsWith("{")) return null;
  try {
    const data = JSON.parse(s) as ParsedFeaturesSpec;
    if (
      data &&
      typeof data === "object" &&
      data.features != null &&
      typeof data.features === "object" &&
      !Array.isArray(data.features)
    ) {
      return data;
    }
    if (data && typeof data === "object" && typeof data.plan === "string") {
      return data;
    }
  } catch {
    return null;
  }
  return null;
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{{${k}}}`, String(v)), template);
}

/** Human-readable bullets from CMS JSON `featuresSpec` or legacy newline-separated text. */
function buildPackageFeatureLines(featuresSpec: string | null | undefined, t: (key: string) => string): string[] {
  const parsed = tryParseFeaturesSpec(featuresSpec ?? "");
  if (parsed?.features) {
    const f = parsed.features;
    const lines: string[] = [];
    if (typeof f.can_create_game === "boolean") {
      lines.push(
        f.can_create_game ? t("learnerPackages.feature.createGameYes") : t("learnerPackages.feature.createGameNo"),
      );
    }
    if (typeof f.advanced_assets === "boolean") {
      lines.push(
        f.advanced_assets
          ? t("learnerPackages.feature.advancedAssetsYes")
          : t("learnerPackages.feature.advancedAssetsNo"),
      );
    }
    if (typeof f.can_private_room === "boolean") {
      lines.push(
        f.can_private_room
          ? t("learnerPackages.feature.privateRoomYes")
          : t("learnerPackages.feature.privateRoomNo"),
      );
    }
    if (typeof f.xp_boost_multiplier === "number" && Number.isFinite(f.xp_boost_multiplier)) {
      lines.push(interpolate(t("learnerPackages.feature.xpBoost"), { n: f.xp_boost_multiplier }));
    }
    if (typeof f.monthly_hint_quota === "number" && Number.isFinite(f.monthly_hint_quota)) {
      lines.push(interpolate(t("learnerPackages.feature.monthlyHints"), { n: f.monthly_hint_quota }));
    }
    if (lines.length > 0) return lines;
  }

  const s = featuresSpec?.trim() ?? "";
  if (!s || s.startsWith("{")) return [];

  return s
    .split(/\n|,|;/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function packageTagline(
  pkg: Package,
  index: number,
  t: (key: string) => string,
  defaults: string[],
): string {
  const parsed = tryParseFeaturesSpec(pkg.featuresSpec);
  const plan = parsed?.plan?.toLowerCase();
  if (plan === "free" || plan === "pro" || plan === "creator") {
    return t(`learnerPackages.planTagline.${plan}`);
  }
  const spec = pkg.featuresSpec?.trim() ?? "";
  if (spec && !spec.startsWith("{") && spec.length < 60) {
    return spec;
  }
  return defaults[index % defaults.length];
}

function isPackageActiveNow(pkg: UserPackage): boolean {
  const hasRemaining = pkg.remaining === null || pkg.remaining > 0;
  const expiresAtMs = pkg.expiresAt ? Date.parse(pkg.expiresAt) : Number.NaN;
  const notExpired = Number.isFinite(expiresAtMs) ? expiresAtMs > Date.now() : true;
  return hasRemaining && notExpired;
}

function pickCurrentPackage(items: UserPackage[]): UserPackage | null {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const activeItems = items.filter(isPackageActiveNow);
  const candidates = activeItems.length > 0 ? activeItems : items;

  const ranked = [...candidates].sort((a, b) => {
    const rankA = normalizePlanName(a.name);
    const rankB = normalizePlanName(b.name);
    if (rankA && rankB && PLAN_RANK[rankA] !== PLAN_RANK[rankB]) {
      return PLAN_RANK[rankB] - PLAN_RANK[rankA];
    }
    if (a.price !== b.price) {
      return b.price - a.price;
    }
    const purchasedA = a.purchasedAt ? Date.parse(a.purchasedAt) : Number.NaN;
    const purchasedB = b.purchasedAt ? Date.parse(b.purchasedAt) : Number.NaN;
    if (Number.isFinite(purchasedA) && Number.isFinite(purchasedB) && purchasedA !== purchasedB) {
      return purchasedB - purchasedA;
    }
    const expiresA = a.expiresAt ? Date.parse(a.expiresAt) : Number.NaN;
    const expiresB = b.expiresAt ? Date.parse(b.expiresAt) : Number.NaN;
    if (Number.isFinite(expiresA) && Number.isFinite(expiresB) && expiresA !== expiresB) {
      return expiresB - expiresA;
    }
    return 0;
  });

  return ranked[0] ?? null;
}

/** No active paid subscription ⇒ coi như đang ở bậc Free (không cho "mua" lại gói Free). */
function isSameOrLowerPackage(target: Package, current: UserPackage | null): boolean {
  const targetRank = normalizePlanName(target.name);

  if (!current) {
    if (targetRank === "free") return true;
    if (target.price === 0) return true;
    return false;
  }

  const currentRank = normalizePlanName(current.name);
  if (currentRank && targetRank) {
    return PLAN_RANK[targetRank] <= PLAN_RANK[currentRank];
  }

  return target.price <= current.price;
}

function isCardCurrentPlan(pkg: Package, current: UserPackage | null): boolean {
  if (current?.packageId && current.packageId === pkg.id) return true;
  if (!current) {
    const tr = normalizePlanName(pkg.name);
    return tr === "free" || pkg.price === 0;
  }
  return false;
}

export default function PackagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [currentPackage, setCurrentPackage] = useState<UserPackage | null>(null);
  const [confirmingPackage, setConfirmingPackage] = useState<Package | null>(null);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState | null>(null);
  const [lastFailedPackage, setLastFailedPackage] = useState<Package | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [packageResult, myPackageResult] = await Promise.allSettled([
          learnerPackagesApi.getAll(1, 20),
          learnerPackagesApi.getMyPackages(1, 20, true),
        ]);

        if (cancelled) return;

        if (packageResult.status === "fulfilled") {
          if (packageResult.value.data.isSuccess && packageResult.value.data.data) {
            setPackages(packageResult.value.data.data.items ?? []);
          } else {
            setError(packageResult.value.data.message || t("failedLoadPackages"));
          }
        } else {
          setError(t("errorLoadingPackages"));
          console.error(packageResult.reason);
        }

        if (myPackageResult.status === "fulfilled") {
          if (myPackageResult.value.data.isSuccess && myPackageResult.value.data.data) {
            const myItems = myPackageResult.value.data.data.items ?? [];
            setCurrentPackage(pickCurrentPackage(myItems));
          } else {
            setCurrentPackage(null);
          }
        } else {
          setCurrentPackage(null);
          console.warn("Failed to load learner active package", myPackageResult.reason);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t("errorLoadingPackages"));
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const executePurchase = async (pkg: Package) => {
    try {
      setPurchasingId(pkg.id);
      const response = await learnerPackagesApi.purchase(pkg.id);
      if (response.data.isSuccess) {
        clearCurrentUserPlanCache();
        setPurchaseModal({
          kind: "success",
          message: response.data.message || t("learnerPackages.purchaseSuccessDefault"),
        });
        return;
      }
      setPurchaseModal({
        kind: "error",
        message: response.data.message || t("learnerPackages.purchaseFailedDefault"),
      });
      setLastFailedPackage(pkg);
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiResult<string> | undefined;
        const msgLower = (body?.message ?? "").toLowerCase();
        const isInsufficientBalance =
          body?.errorCode === "InvalidOperation" ||
          msgLower.includes("insufficient") ||
          msgLower.includes("không đủ");

        setPurchaseModal({
          kind: isInsufficientBalance ? "insufficient" : "error",
          message: body?.message || t("learnerPackages.purchaseFailedDefault"),
        });
        setLastFailedPackage(pkg);
        return;
      }
      setPurchaseModal({
        kind: "error",
        message: t("learnerPackages.purchaseFailedDefault"),
      });
      setLastFailedPackage(pkg);
      console.error(err);
    } finally {
      setPurchasingId(null);
    }
  };

  const handleChoose = (pkg: Package) => {
    if (!pkg.isActive || isSameOrLowerPackage(pkg, currentPackage) || purchasingId) return;
    setConfirmingPackage(pkg);
  };

  const handleConfirmPurchase = async () => {
    if (!confirmingPackage) return;
    const selectedPackage = confirmingPackage;
    setConfirmingPackage(null);
    await executePurchase(selectedPackage);
  };

  const handleReportPackagePurchaseIssue = () => {
    if (!lastFailedPackage?.id || !purchaseModal) return;
    const params = new URLSearchParams({
      prefill: `package-purchase-${purchaseModal.kind}-${lastFailedPackage.id}-${Date.now()}`,
      openCreate: "1",
      categoryKey: "AccessIssue",
      packageId: lastFailedPackage.id,
      subject: t("complaints.prefill.packagePurchaseSubject"),
      description: t("complaints.prefill.packagePurchaseDescription"),
    });
    navigate(`${ROUTES.LEARNER_COMPLAINTS}?${params.toString()}`);
  };

  const formatPrice = (price: number) => price.toLocaleString("en-US");

  const isFree = (pkg: Package) => pkg.price === 0;

  const getDisplayPrice = (pkg: Package) => {
    const base = pkg.price;
    if (isFree(pkg)) {
      return { display: t("free"), unit: ` · ${t("lifetime")}`, original: null as string | null };
    }
    if (pkg.durationDays >= 365) {
      const monthly = Math.round(base / 12);
      return {
        display: formatPrice(monthly),
        unit: t("learnerPackages.priceUnitPerMonth"),
        original: formatPrice(base),
      };
    }
    if (pkg.durationDays <= 31) {
      return {
        display: formatPrice(base),
        unit: t("learnerPackages.priceUnitPerMonth"),
        original: null as string | null,
      };
    }
    return {
      display: formatPrice(base),
      unit: interpolate(t("learnerPackages.priceUnitForDuration"), { days: pkg.durationDays }),
      original: null as string | null,
    };
  };

  const planTaglineDefaults = useMemo(
    () => [t("taglineSolo"), t("taglineRegular"), t("taglineTeams")],
    [t],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.loadingWrap}>{t("loadingPackages")}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.errorWrap}>{error}</div>
        </div>
      </div>
    );
  }

  const visiblePackages = packages.filter((p) => p.isActive);
  const currentPlanCardIndex = visiblePackages.findIndex((p) => isCardCurrentPlan(p, currentPackage));
  const defaultFeaturedIndex =
    currentPlanCardIndex >= 0
      ? currentPlanCardIndex
      : visiblePackages.length >= 2
        ? 1
        : visiblePackages.length === 1
          ? 0
          : -1;

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className={styles.title}>{t("flexiblePlansTitle")}</h1>
        </motion.header>

        {visiblePackages.length === 0 ? (
          <div className={styles.emptyWrap}>{t("noPackagesAvailable")}</div>
        ) : (
          <motion.div
            className={styles.grid}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {visiblePackages.map((pkg, index) => {
              const featured =
                hoveredIndex !== null ? hoveredIndex === index : index === defaultFeaturedIndex;
              const isCurrentPackageCard = isCardCurrentPlan(pkg, currentPackage);
              const isLockedByCurrent = isSameOrLowerPackage(pkg, currentPackage);
              const isDisabled = !pkg.isActive || purchasingId === pkg.id || isLockedByCurrent;
              const { display, unit, original } = getDisplayPrice(pkg);
              const features = buildPackageFeatureLines(pkg.featuresSpec, t);
              if (features.length === 0) {
                features.push(
                  interpolate(t("learnerPackages.fallback.accessDays"), { days: pkg.durationDays }),
                );
                if (pkg.limit != null) {
                  features.push(interpolate(t("learnerPackages.fallback.coursesIncluded"), { n: pkg.limit }));
                } else {
                  features.push(t("learnerPackages.fallback.unlimitedCourses"));
                }
              }

              return (
                <motion.div
                  key={pkg.id}
                  className={`${styles.card} ${featured ? styles.cardFeatured : ""} ${
                    isCurrentPackageCard ? styles.cardCurrent : ""
                  }`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  variants={cardVariants}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className={styles.cardHeaderRow}>
                    <h3 className={styles.cardName}>{pkg.name}</h3>
                    {isCurrentPackageCard ? (
                      <span className={styles.currentBadge}>{t("learnerPackages.currentBadge")}</span>
                    ) : null}
                  </div>
                  <div className={styles.priceRow}>
                    <span className={styles.cardPrice}>{display}</span>
                    <span className={styles.cardPriceUnit}>{unit}</span>
                    {original && (
                      <span className={styles.cardOriginal}>
                        {original} {CURRENCY}
                      </span>
                    )}
                  </div>
                  <p className={styles.cardTagline}>{packageTagline(pkg, index, t, planTaglineDefaults)}</p>
                  <div className={styles.cardDivider} />
                  <ul className={styles.featureList}>
                    {features.map((text, i) => (
                      <li key={i} className={styles.featureItem}>
                        {text}
                      </li>
                    ))}
                  </ul>
                  <motion.button
                    type="button"
                    className={styles.btnChoose}
                    onClick={() => handleChoose(pkg)}
                    disabled={isDisabled}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {purchasingId === pkg.id
                      ? t("learnerPackages.purchasing")
                      : isCurrentPackageCard
                        ? t("learnerPackages.currentPackageBtn")
                        : isLockedByCurrent
                          ? t("learnerPackages.higherRequired")
                          : `${t("choose")} ${pkg.name}`}
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {confirmingPackage && (
          <div className={styles.modalOverlay} onClick={() => setConfirmingPackage(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>{t("learnerPackages.confirmTitle")}</h3>
              <p className={styles.modalMessage}>
                {interpolate(t("learnerPackages.confirmMessage"), {
                  name: confirmingPackage.name,
                  price: formatPrice(confirmingPackage.price),
                  currency: CURRENCY,
                })}
              </p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtn}
                  onClick={() => setConfirmingPackage(null)}
                >
                  {t("learnerPackages.cancel")}
                </button>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={handleConfirmPurchase}
                >
                  {t("learnerPackages.confirmBuy")}
                </button>
              </div>
            </div>
          </div>
        )}

        {purchaseModal && (
          <div className={styles.modalOverlay} onClick={() => setPurchaseModal(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3
                className={`${styles.modalTitle} ${
                  purchaseModal.kind === "success"
                    ? styles.modalTitleSuccess
                    : purchaseModal.kind === "insufficient"
                      ? styles.modalTitleWarning
                      : styles.modalTitleError
                }`}
              >
                {purchaseModal.kind === "success"
                  ? t("learnerPackages.purchaseSuccessTitle")
                  : purchaseModal.kind === "insufficient"
                    ? t("learnerPackages.purchaseInsufficientTitle")
                    : t("learnerPackages.purchaseErrorTitle")}
              </h3>
              <p className={styles.modalMessage}>{purchaseModal.message}</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={() => setPurchaseModal(null)}
                >
                  {t("back")}
                </button>
                {purchaseModal.kind !== "success" && (
                  <>
                    {purchaseModal.kind === "insufficient" ? (
                      <button
                        type="button"
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                        onClick={() => navigate(ROUTES.LEARNER_WALLET)}
                      >
                        {t("learnerPackages.topUpOrbitCoin")}
                      </button>
                    ) : null}
                    {purchaseModal.kind === "error" ? (
                      <button
                        type="button"
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                        onClick={handleReportPackagePurchaseIssue}
                      >
                        {t("complaints.actions.reportIssue")}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
