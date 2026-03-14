import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Gamepad2, Heart, Bell, Share2 } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map } from "@/types/api/learner/maps";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import "@/shared/styles/tokens.css";
import styles from "./MapDetailPage.module.css";

export default function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [map, setMap] = useState<Map | null>(null);
  const [ownership, setOwnership] = useState<MapOwnershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const loadMap = useCallback(async () => {
    if (!id) {
      setError("Map ID not found");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const mapResponse = await learnerMapsApi.getMapById(id, true);
      if (mapResponse.data.isSuccess && mapResponse.data.data) {
        setMap(mapResponse.data.data as unknown as Map);
      } else {
        setError(mapResponse.data.message || t("failedLoadMapDetails"));
        return;
      }

      const ownershipResponse = await learnerMapsApi.checkMapOwnership(id);
      if (ownershipResponse.data.isSuccess && ownershipResponse.data.data) {
        setOwnership(ownershipResponse.data.data);
      }
    } catch (err) {
      setError(t("errorLoadMapDetails"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [id]);

  const handleStartMap = () => {
    if (map) {
      const isPlatform = map.type === "Platform";
      navigate(isPlatform ? ROUTES.PLATFORM : ROUTES.GAME, {
        state: { levelId: map.id },
      });
    }
  };

  const handleBuyMap = () => {
    console.log("Buy map with OrbitCoin:", map?.id);
  };

  const formatCreatedAt = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getWinConditionLabel = (winCondition: number) => {
    switch (winCondition) {
      case 1:
        return t("reachGoal");
      case 2:
        return t("collectAllFruits");
      default:
        return t("unknown");
    }
  };

  const getCreatorLabel = () => {
    if (map?.createdByUserName?.trim()) return map.createdByUserName.trim();
    if (map?.createdByUserId) return map.createdByUserId.slice(0, 8);
    return t("adminTeam");
  };

  const canPlay = ownership?.isOwned || (map?.isPublished && map?.price === 0);
  const previews = map?.avatarUrl && !heroImageFailed ? [map.avatarUrl] : [];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.loadingWrap}>
          <p className={styles.loadingText}>{t("loadingMapDetails")}</p>
        </div>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <button type="button" onClick={() => navigate(-1)} className={styles.backBtn}>
            <ArrowLeft size={18} /> {t("back")}
          </button>
          <div className={styles.errorCard}>{error || t("mapNotFound")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <button type="button" onClick={() => navigate(-1)} className={styles.backBtn}>
          <ArrowLeft size={18} /> {t("back")}
        </button>

        <div className={styles.steamRow}>
          {/* Left: large media + carousel */}
          <div className={styles.steamMedia}>
            <div className={styles.steamPlayer}>
              {map.avatarUrl && !heroImageFailed ? (
                <img
                  src={previews[carouselIndex] ?? map.avatarUrl}
                  alt=""
                  className={styles.steamPlayerImg}
                  onError={() => setHeroImageFailed(true)}
                />
              ) : (
                <div className={styles.steamPlayerPlaceholder}>
                  <span role="img" aria-label="Map">
                    🗺️
                  </span>
                  <span className={styles.steamPlayerPlaceholderText}>
                    {t("previewNotAvailable")}
                  </span>
                </div>
              )}
            </div>

            {previews.length > 0 && (
              <div className={styles.steamCarousel}>
                {previews.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.steamThumb} ${
                      carouselIndex === idx ? styles.steamThumbActive : ""
                    }`}
                    onClick={() => setCarouselIndex(idx)}
                  >
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
            {previews.length === 0 && map.avatarUrl && !heroImageFailed && (
              <div className={styles.steamCarousel}>
                <div className={`${styles.steamThumb} ${styles.steamThumbActive}`}>
                  <img src={map.avatarUrl} alt="" />
                </div>
              </div>
            )}
          </div>

          {/* Right: sidebar – nhóm thông tin rõ ràng */}
          <div className={styles.steamSidebar}>
            <section className={styles.steamSidebarSection}>
              <h1 className={styles.steamTitle}>{map.title}</h1>
              {map.description ? (
                <p className={styles.steamDesc}>{map.description}</p>
              ) : (
                <p className={`${styles.steamDesc} ${styles.steamDescEmpty}`}>
                  {t("noDescriptionProvided")}
                </p>
              )}
            </section>

            <section className={styles.steamSidebarSection}>
              <div className={styles.steamWinCondition}>
                <span className={styles.steamWinLabel}>{t("winCondition")}</span>
                <span className={styles.steamWinValue}>
                  {getWinConditionLabel(map.winCondition)}
                </span>
              </div>
            </section>

            <section className={styles.steamSidebarSection}>
              <h2 className={styles.steamSectionTitle}>{t("productDetails")}</h2>
              <div className={styles.steamMetaGrid}>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("releaseDate")}</span>
                  <span className={styles.steamMetaValue}>
                    {map.createdAt ? formatCreatedAt(map.createdAt) : "—"}
                  </span>
                </div>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("developer")}</span>
                  <span className={styles.steamMetaValue}>{getCreatorLabel()}</span>
                </div>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("type")}</span>
                  <span className={styles.steamMetaValue}>
                    {map.type === "Platform" ? t("platformer") : t("puzzleLogic")}
                  </span>
                </div>
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("difficulty")}</span>
                  <span className={styles.steamMetaValue}>
                    {map.difficulty === 1
                      ? t("easy")
                      : map.difficulty === 2
                        ? t("medium")
                        : t("hard")}
                  </span>
                </div>
              </div>
            </section>

            <section className={styles.steamSidebarSection}>
              <h2 className={styles.steamSectionTitle}>{t("tags")}</h2>
              {map.tagNames && map.tagNames.length > 0 ? (
                <div className={styles.steamTagsList}>
                  {map.tagNames.map((tag, idx) => (
                    <span key={idx} className={styles.steamTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.steamDescEmpty}>{t("noTags")}</p>
              )}
            </section>
          </div>
        </div>

        {/* Bottom action bar (Steam-style) */}
        <div className={styles.steamFooter}>
          {canPlay ? (
            <button type="button" onClick={handleStartMap} className={styles.steamFooterPrimary}>
              <Gamepad2 size={20} /> {t("play")}
            </button>
          ) : (
            <button type="button" onClick={handleBuyMap} className={styles.steamFooterPrimary}>
              <Lock size={18} /> {t("buyWithOrbitCoin")}
              {map.price > 0 && ` (${map.price.toLocaleString()} OC)`}
            </button>
          )}
          <button type="button" className={styles.steamFooterSecondary}>
            <Heart size={16} /> {t("addToWishlist")}
          </button>
          <button type="button" className={styles.steamFooterSecondary}>
            <Bell size={16} /> {t("follow")}
          </button>
          <button type="button" className={styles.steamFooterSecondary}>
            <Share2 size={16} /> {t("share")}
          </button>
        </div>
      </div>
    </div>
  );
}
