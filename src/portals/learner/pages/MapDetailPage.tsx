import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Gamepad2, Heart, Bell, Share2 } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerMarketplaceApi } from "@/services/api/learner/marketplace.api";
import type { Map } from "@/types/api/learner/maps";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import type { LocaleId } from "@/lib/i18n/translations";
import "@/shared/styles/tokens.css";
import styles from "./MapDetailPage.module.css";

const DIFFICULTY_TAG_NAMES = new Set(["beginner", "easy", "medium", "hard", "expert"].map((s) => s.toLowerCase()));

const SKILL_MECHANISM_CONCEPTS_LOWER = new Set([
  // Vietnamese
  "tư duy logic",
  "tránh chướng ngại vật",
  "tìm đường",
  "nhận dạng mẫu",
  "giải quyết vấn đề",
  "thu thập tài nguyên",
  "chiến lược",
  "điều hướng",
  // English
  "pathfinding",
  "obstacle avoidance",
  "pattern recognition",
  "problem solving",
  "resource collection",
  "strategy",
  "logical thinking",
]);

const CONCEPT_LABELS_VI: Record<string, string> = {
  "Algorithm Basics": "Cơ bản thuật toán",
  "Algorithm Design": "Thiết kế thuật toán",
  Arrays: "Mảng",
  "Computational Thinking": "Tư duy máy tính",
  Conditionals: "Điều kiện",
  Debugging: "Gỡ lỗi",
  Functions: "Hàm",
  "Logic Puzzle": "Câu đố logic",
  "Logical Thinking": "Tư duy logic",
  Loops: "Vòng lặp",
  Objects: "Đối tượng",
  "Obstacle Avoidance": "Tránh chướng ngại vật",
  Operators: "Toán tử",
  Optimization: "Tối ưu hóa",
  Pathfinding: "Tìm đường",
  "Pattern Recognition": "Nhận dạng mẫu",
  Pointers: "Con trỏ",
  "Problem Solving": "Giải quyết vấn đề",
  Recursion: "Đệ quy",
  "Resource Collection": "Thu thập tài nguyên",
  Strategy: "Chiến lược",
  Variables: "Biến",
  "If Else": "If / Else",
  "If/Else": "If / Else",
};

function getConceptLabel(name: string, locale: LocaleId): string {
  if (locale === "vi") {
    const exact = CONCEPT_LABELS_VI[name];
    if (exact) return exact;
    const lower = name.toLowerCase();
    const entry = Object.entries(CONCEPT_LABELS_VI).find(([k]) => k.toLowerCase() === lower);
    if (entry) return entry[1];
  }
  return name;
}

function isDifficultyTag(tagName: string): boolean {
  return DIFFICULTY_TAG_NAMES.has(tagName.trim().toLowerCase());
}

function isSkillMechanismConcept(tagName: string): boolean {
  return SKILL_MECHANISM_CONCEPTS_LOWER.has(tagName.trim().toLowerCase());
}

export default function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const [map, setMap] = useState<Map | null>(null);
  const [ownership, setOwnership] = useState<MapOwnershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [buyLoading, setBuyLoading] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const loadMap = useCallback(async () => {
    if (!id) {
      setError("Map ID not found");
      return;
    }
    const t = tRef.current;

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
  }, [id]);

  useEffect(() => {
    loadMap();
  }, [loadMap]);

  useEffect(() => {
    setHeroImageFailed(false);
    setBuyError(null);
    setBuyLoading(false);
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
    if (!map) return;
    if (buyLoading) return;

    const mapId = map.id;
    setBuyLoading(true);
    setBuyError(null);

    void (async () => {
      try {
        const res = await learnerMarketplaceApi.purchaseMap(mapId);
        if (!res.data.isSuccess) {
          setBuyError(res.data.message || "Failed to purchase map.");
          return;
        }

        // Refresh ownership so the "Play" button becomes available immediately.
        const ownershipResponse = await learnerMapsApi.checkMapOwnership(mapId);
        if (ownershipResponse.data.isSuccess && ownershipResponse.data.data) {
          setOwnership(ownershipResponse.data.data);
        }
      } catch (err) {
        console.error(err);
        setBuyError("Failed to purchase map.");
      } finally {
        setBuyLoading(false);
      }
    })();
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

  const rawTags = map?.tagNames ?? [];
  const dedupeByLower = (arr: string[]) => {
    const seen = new Set<string>();
    return arr.filter((x) => {
      const k = x.trim().toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const normalizeDifficultyTag = (tagLower: string) => {
    // Beginner & Easy considered the same level in FE UI.
    if (tagLower === "beginner" || tagLower === "easy") return "Beginner";
    // Keep user-facing labels in CamelCase: Medium, Hard, Expert, ...
    return `${tagLower.charAt(0).toUpperCase()}${tagLower.slice(1)}`;
  };

  const difficultyTagNames = dedupeByLower(
    rawTags
      .filter(isDifficultyTag)
      .map((tag) => normalizeDifficultyTag(tag.trim().toLowerCase())),
  );
  const skillTagNames = dedupeByLower(rawTags.filter(isSkillMechanismConcept));
  const knowledgeTagNames = dedupeByLower(rawTags.filter((tag) => !isDifficultyTag(tag) && !isSkillMechanismConcept(tag)));

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
      <motion.div
        className={styles.content}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          type="button"
          onClick={() => navigate(-1)}
          className={styles.backBtn}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft size={18} /> {t("back")}
        </motion.button>

        <motion.div
          className={styles.steamRow}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
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
              {rawTags.length > 0 ? (
                <div className={styles.steamTagGroups}>
                  {difficultyTagNames.length > 0 && (
                    <div className={styles.steamTagGroup}>
                      <h3 className={styles.steamSubTitle}>{t("difficulty")}</h3>
                      <div className={styles.steamTagsList}>
                        {difficultyTagNames.map((tag) => (
                          <span key={tag} className={styles.steamTag}>
                            {getConceptLabel(tag, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {knowledgeTagNames.length > 0 && (
                    <div className={styles.steamTagGroup}>
                      <h3 className={styles.steamSubTitle}>{t("programmingKnowledge")}</h3>
                      <div className={styles.steamTagsList}>
                        {knowledgeTagNames.map((tag) => (
                          <span key={tag} className={styles.steamTag}>
                            {getConceptLabel(tag, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {skillTagNames.length > 0 && (
                    <div className={styles.steamTagGroup}>
                      <h3 className={styles.steamSubTitle}>{t("skillMechanism")}</h3>
                      <div className={styles.steamTagsList}>
                        {skillTagNames.map((tag) => (
                          <span key={tag} className={styles.steamTag}>
                            {getConceptLabel(tag, locale)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className={styles.steamDescEmpty}>{t("noTags")}</p>
              )}
            </section>
          </div>
        </motion.div>

        {/* Bottom action bar (Steam-style) */}
        <motion.div
          className={styles.steamFooter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {buyError ? <div className={styles.buyErrorCard}>{buyError}</div> : null}

          {canPlay ? (
            <motion.button
              type="button"
              onClick={handleStartMap}
              className={styles.steamFooterPrimary}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Gamepad2 size={20} /> {t("play")}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={handleBuyMap}
              className={styles.steamFooterPrimary}
              disabled={buyLoading}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Lock size={18} /> {t("buyWithOrbitCoin")}
              {map.price > 0 && ` (${map.price.toLocaleString()} OC)`}
            </motion.button>
          )}
          <motion.button
            type="button"
            className={styles.steamFooterSecondary}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Heart size={16} /> {t("addToWishlist")}
          </motion.button>
          <motion.button
            type="button"
            className={styles.steamFooterSecondary}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell size={16} /> {t("follow")}
          </motion.button>
          <motion.button
            type="button"
            className={styles.steamFooterSecondary}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Share2 size={16} /> {t("share")}
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
}
