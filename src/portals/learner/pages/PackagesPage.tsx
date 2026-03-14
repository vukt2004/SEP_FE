// src/portals/learner/pages/PackagesPage.tsx
import { useEffect, useState } from "react";
import { learnerPackagesApi } from "@/services/api/learner/packages.api";
import type { Package } from "@/types/api/learner/packages";
import "@/shared/styles/tokens.css";
import styles from "./PackagesPage.module.css";

const CURRENCY = "OC"; // Orbit Coin – không dùng VND

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await learnerPackagesApi.getAll(1, 20);
        if (cancelled) return;
        if (response.data.isSuccess && response.data.data) {
          setPackages(response.data.data.items ?? []);
        } else {
          setError(response.data.message || "Failed to load packages");
        }
      } catch (err) {
        if (!cancelled) {
          setError("An error occurred while loading packages");
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
  }, []);

  const handleChoose = (pkg: Package) => {
    if (!pkg.isActive) return;
    // TODO: Implement purchase
    const priceStr = pkg.price === 0 ? "Free" : `${formatPrice(pkg.price)} ${CURRENCY}`;
    alert(`Choose package: ${pkg.name} — ${priceStr}`);
  };

  const formatPrice = (price: number) => price.toLocaleString("en-US");

  const isFree = (pkg: Package) => pkg.price === 0;

  const getDisplayPrice = (pkg: Package) => {
    const base = pkg.price;
    if (isFree(pkg)) {
      return { display: "Free", unit: " · Lifetime", original: null as string | null };
    }
    if (pkg.durationDays >= 365) {
      const monthly = Math.round(base / 12);
      return {
        display: formatPrice(monthly),
        unit: ` ${CURRENCY}/month`,
        original: formatPrice(base),
      };
    }
    if (pkg.durationDays <= 31) {
      return {
        display: formatPrice(base),
        unit: ` ${CURRENCY}/month`,
        original: null as string | null,
      };
    }
    return {
      display: formatPrice(base),
      unit: ` ${CURRENCY} / ${pkg.durationDays} days`,
      original: null as string | null,
    };
  };

  const parseFeatures = (spec: string): string[] => {
    if (!spec || !spec.trim()) return [];
    return spec
      .split(/\n|,|;/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const getTagline = (pkg: Package, index: number) => {
    if (pkg.featuresSpec) {
      const first = pkg.featuresSpec.split(/\n|,|;/)[0]?.trim();
      if (first && first.length < 60) return first;
    }
    const defaults = [
      "For solo learners & casual play",
      "For regular practice & progress",
      "For teams & intensive learning",
    ];
    return defaults[index % defaults.length];
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.loadingWrap}>Loading packages...</div>
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
  const defaultFeaturedIndex = visiblePackages.length >= 2 ? 1 : -1; // Pro (giữa) sáng mặc định

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <header className={styles.header}>
          <h1 className={styles.title}>Flexible Plans Tailored to Fit Your Unique Needs!</h1>
        </header>

        {visiblePackages.length === 0 ? (
          <div className={styles.emptyWrap}>No packages available at the moment.</div>
        ) : (
          <div className={styles.grid}>
            {visiblePackages.map((pkg, index) => {
              const featured =
                hoveredIndex !== null ? hoveredIndex === index : index === defaultFeaturedIndex;
              const { display, unit, original } = getDisplayPrice(pkg);
              const features = parseFeatures(pkg.featuresSpec);
              if (features.length === 0) {
                features.push(isFree(pkg) ? "Lifetime access" : `${pkg.durationDays} days access`);
                features.push(`${pkg.limit} courses included`);
              }

              return (
                <div
                  key={pkg.id}
                  className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <h3 className={styles.cardName}>{pkg.name}</h3>
                  <div className={styles.priceRow}>
                    <span className={styles.cardPrice}>{display}</span>
                    <span className={styles.cardPriceUnit}>{unit}</span>
                    {original && (
                      <span className={styles.cardOriginal}>
                        {original} {CURRENCY}
                      </span>
                    )}
                  </div>
                  <p className={styles.cardTagline}>{getTagline(pkg, index)}</p>
                  <div className={styles.cardDivider} />
                  <ul className={styles.featureList}>
                    {features.map((text, i) => (
                      <li key={i} className={styles.featureItem}>
                        {text}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={styles.btnChoose}
                    onClick={() => handleChoose(pkg)}
                    disabled={!pkg.isActive}
                  >
                    Choose {pkg.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
