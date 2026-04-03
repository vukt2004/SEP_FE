import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { isAxiosError } from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  Gamepad2,
  Heart,
  Bell,
  Share2,
  ImagePlus,
  Video,
  Save,
  X,
} from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map, MapLevelItem, MapTag } from "@/types/api/learner/maps";
import { getFirstLevelPlayHint } from "@/utils/levelLoader";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import type { ApiResult } from "@/types/api/common";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import "@/shared/styles/tokens.css";
import styles from "./MapDetailPage.module.css";
import { extractLearnedTags } from "@/lib/maps/learnedTags";
import { localizeTagName } from "@/lib/maps/tagLocalization";
import {
  buildCampaignLevelStates,
  getCampaignCurrentLevelId,
  getCampaignProgressCounts,
  hasCampaignStarted,
} from "@/lib/game/campaignProgress";

type PurchaseModalState = {
  kind: "success" | "insufficient" | "error";
  message: string;
};

/** Set from map editor when opening catalog setup full-page flow. */
export type MapDetailLocationState = {
  mapCatalogSetup?: boolean;
};

const DIFFICULTY_TAG_NAMES = new Set(
  ["beginner", "easy", "medium", "hard", "expert"].map((s) => s.toLowerCase()),
);

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

function isDifficultyTag(tagName: string): boolean {
  return DIFFICULTY_TAG_NAMES.has(tagName.trim().toLowerCase());
}

function isSkillMechanismConcept(tagName: string): boolean {
  return SKILL_MECHANISM_CONCEPTS_LOWER.has(tagName.trim().toLowerCase());
}

const GALLERY_UPLOAD_MAX = 20;

const HIDDEN_LEARNED_TAG_NAMES = new Set(["beginner", "expert", "easy", "medium", "hard"]);

function isVideoMediaKind(kind: string): boolean {
  return /video/i.test(kind);
}

/** Avatar first, then gallery by sortOrder; dedupe URLs. */
function buildCarouselItems(map: Map | null): { url: string; kind: string; key: string }[] {
  if (!map) return [];
  const seen = new Set<string>();
  const items: { url: string; kind: string; key: string }[] = [];
  if (map.avatarUrl?.trim()) {
    seen.add(map.avatarUrl);
    items.push({ url: map.avatarUrl, kind: "Image", key: "avatar" });
  }
  const gallery = [...(map.gallery ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const g of gallery) {
    const u = g.url?.trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    items.push({ url: u, kind: g.kind || "Image", key: g.id });
  }
  return items;
}

export default function MapDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, locale } = useTranslation();
  const [map, setMap] = useState<Map | null>(null);
  const [ownership, setOwnership] = useState<MapOwnershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentMediaLoadError, setCurrentMediaLoadError] = useState(false);
  const [availableMapTags, setAvailableMapTags] = useState<MapTag[]>([]);
  const [loadingMapTags, setLoadingMapTags] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedLearnedTagIds, setSelectedLearnedTagIds] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [pendingGalleryFiles, setPendingGalleryFiles] = useState<File[]>([]);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const loadMap = useCallback(async () => {
    const tr = tRef.current;
    if (!id) {
      setError(tr("gameIdNotFound"));
      return;
    }
    const t = tr;

    try {
      setLoading(true);
      setError(null);

      const mapResponse = await learnerMapsApi.getMapById(id, true);
      if (mapResponse.data.isSuccess && mapResponse.data.data) {
        setMap(mapResponse.data.data as Map);
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
    setCarouselIndex(0);
    setCurrentMediaLoadError(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const loadTags = async () => {
      try {
        setLoadingMapTags(true);
        const res = await learnerMapsApi.getMapTags();
        if (!cancelled && res.data.isSuccess && Array.isArray(res.data.data)) {
          setAvailableMapTags(res.data.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoadingMapTags(false);
      }
    };
    void loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    setEditTitle(map.title);
    setEditDescription(map.description ?? "");
    setEditDifficulty(Math.min(5, Math.max(1, map.difficulty)));
    setEditPrice(map.price ?? 0);
  }, [map]);

  useEffect(() => {
    if (!map || availableMapTags.length === 0) return;
    const raw = map.tagNames ?? [];
    const nameSet = new Set(raw.map((n) => n.trim().toLowerCase()));
    const ids = availableMapTags
      .filter((tag) => nameSet.has(tag.name.trim().toLowerCase()))
      .map((tag) => tag.id);
    setSelectedTagIds(ids);
    const learnedNames = extractLearnedTags(map);
    const learnedSet = new Set(learnedNames.map((x) => x.trim().toLowerCase()));
    const learnedPool = availableMapTags.filter(
      (tag) => !HIDDEN_LEARNED_TAG_NAMES.has(tag.name.trim().toLowerCase()),
    );
    const lIds = learnedPool
      .filter((tag) => learnedSet.has(tag.name.trim().toLowerCase()))
      .map((tag) => tag.id);
    setSelectedLearnedTagIds(lIds);
  }, [map, availableMapTags]);

  useEffect(() => {
    setCurrentMediaLoadError(false);
  }, [carouselIndex]);

  const handleStartMap = () => {
    if (!map || !playHint) return;

    if (campaignLevels.length <= 1) {
      const selectedLevel: MapLevelItem | undefined = campaignLevels[0];
      const selectedMapDetailId = selectedLevel?.id ?? playHint.mapDetailId;
      const isPlatform =
        typeof selectedLevel?.type === "string"
          ? selectedLevel.type.trim().toLowerCase() === "platform"
          : playHint.isPlatform;

      navigate(isPlatform ? ROUTES.PLATFORM : ROUTES.GAME, {
        state: {
          levelId: map.id,
          ...(selectedMapDetailId ? { mapDetailId: selectedMapDetailId } : {}),
        },
      });
      return;
    }

    if (!startedCampaign) {
      navigate(ROUTES.LEARNER_MAP_LEVEL_SELECT(map.id));
      return;
    }

    const currentLevel =
      campaignLevels.find((level) => level.id === currentCampaignLevelId) ?? campaignLevels[0];
    const currentState = campaignLevelStates.find((row) => row.levelId === currentLevel?.id);

    // If there is no active in-progress level, let learner choose explicitly.
    if (!currentLevel || !currentState || currentState.isCompleted || currentState.isLocked) {
      navigate(ROUTES.LEARNER_MAP_LEVEL_SELECT(map.id));
      return;
    }

    const isPlatform = (currentLevel.type ?? "").trim().toLowerCase() === "platform";
    navigate(isPlatform ? ROUTES.PLATFORM : ROUTES.GAME, {
      state: {
        levelId: map.id,
        mapDetailId: currentLevel.id,
      },
    });
  };

  const handleBuyMap = async () => {
    if (!map?.id) return;

    try {
      setIsPurchasing(true);
      const response = await learnerMapsApi.purchaseMap(map.id);
      if (response.data.isSuccess) {
        setPurchaseModal({
          kind: "success",
          message: response.data.message || t("gamePurchasedWithOrbitCoin"),
        });
        const ownershipResponse = await learnerMapsApi.checkMapOwnership(map.id);
        if (ownershipResponse.data.isSuccess && ownershipResponse.data.data) {
          setOwnership(ownershipResponse.data.data);
        }
        return;
      }

      setPurchaseModal({
        kind: "error",
        message: response.data.message || t("gamePurchaseFailed"),
      });
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiResult<null> | undefined;
        const isInsufficientBalance =
          body?.errorCode === "InvalidOperation" ||
          (body?.message ?? "").toLowerCase().includes("insufficient");

        setPurchaseModal({
          kind: isInsufficientBalance ? "insufficient" : "error",
          message: body?.message || t("gamePurchaseFailed"),
        });
        return;
      }

      setPurchaseModal({ kind: "error", message: t("gamePurchaseFailed") });
      console.error(err);
    } finally {
      setIsPurchasing(false);
    }
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId],
    );
  };

  const toggleLearnedTagSelection = (tagId: string) => {
    setSelectedLearnedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId],
    );
  };

  const learnedKnowledgeTags = useMemo(
    () =>
      availableMapTags.filter(
        (tag) => !HIDDEN_LEARNED_TAG_NAMES.has(tag.name.trim().toLowerCase()),
      ),
    [availableMapTags],
  );

  const handleSaveAuthorMetadata = async () => {
    const setup = (location.state as MapDetailLocationState | null)?.mapCatalogSetup === true;
    if (!map?.id || ownership?.isAuthor !== true || !setup) return;
    const titleTrim = editTitle.trim();
    if (!titleTrim) {
      alert(t("mapDetailEditTitleRequired"));
      return;
    }
    try {
      setSavingMetadata(true);
      const res = await learnerMapsApi.updateMapMetadata(map.id, {
        title: titleTrim,
        description: editDescription,
        difficulty: editDifficulty,
        price: editPrice,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        learnedTags: selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds : undefined,
      });
      if (!res.data.isSuccess) {
        alert(t("mapDetailMetadataSaveFailed").replace("{message}", res.data.message || ""));
        return;
      }
      if (avatarFile) {
        const ar = await learnerMapsApi.uploadMapAvatar(map.id, avatarFile);
        if (!ar.data.isSuccess) {
          alert(t("mapDetailAvatarUploadFailed").replace("{message}", ar.data.message || ""));
          return;
        }
      }
      if (pendingGalleryFiles.length > 0) {
        const gr = await learnerMapsApi.uploadMapGallery(map.id, pendingGalleryFiles);
        if (!gr.data.isSuccess) {
          alert(t("mapDetailGalleryUploadFailed").replace("{message}", gr.data.message || ""));
          return;
        }
      }
      setAvatarFile(null);
      setPendingGalleryFiles([]);
      await loadMap();
      alert(t("mapDetailMetadataSaved"));
      navigate(".", { replace: true, state: {} });
    } catch (e) {
      console.error(e);
      alert(t("mapDetailMetadataSaveError"));
    } finally {
      setSavingMetadata(false);
    }
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
  const playHint = useMemo(() => (map ? getFirstLevelPlayHint(map) : null), [map]);
  const campaignLevels = useMemo(() => {
    const levels = map?.levels ?? [];
    return [...levels].sort((a, b) => a.levelOrder - b.levelOrder);
  }, [map?.levels]);
  const currentCampaignLevelId = useMemo(() => {
    if (!map?.id) return null;
    return getCampaignCurrentLevelId(map.id, campaignLevels);
  }, [map?.id, campaignLevels]);
  const campaignLevelStates = useMemo(() => {
    if (!map?.id) return [];
    return buildCampaignLevelStates(map.id, campaignLevels, currentCampaignLevelId);
  }, [map?.id, campaignLevels, currentCampaignLevelId]);
  const campaignProgress = useMemo(() => {
    if (!map?.id) return { completed: 0, total: campaignLevels.length };
    return getCampaignProgressCounts(map.id, campaignLevels);
  }, [map?.id, campaignLevels]);
  const startedCampaign = useMemo(() => {
    if (!map?.id) return false;
    return hasCampaignStarted(map.id, campaignLevels);
  }, [map?.id, campaignLevels]);
  const currentCampaignIndex = useMemo(() => {
    if (!currentCampaignLevelId) return -1;
    return campaignLevels.findIndex((level) => level.id === currentCampaignLevelId);
  }, [campaignLevels, currentCampaignLevelId]);
  const currentCampaignLabel =
    currentCampaignIndex >= 0
      ? t("gameLevelOption").replace("{n}", String(currentCampaignIndex + 1))
      : null;
  const carouselItems = useMemo(() => buildCarouselItems(map), [map]);
  const isAuthor = ownership?.isAuthor === true;
  const mapCatalogSetup =
    (location.state as MapDetailLocationState | null)?.mapCatalogSetup === true;
  const showCatalogSetupForm = mapCatalogSetup && isAuthor;
  const currentMedia = carouselItems[carouselIndex] ?? null;

  useEffect(() => {
    if (carouselItems.length > 0 && carouselIndex >= carouselItems.length) {
      setCarouselIndex(0);
    }
  }, [carouselItems.length, carouselIndex]);

  const rawTags = map?.tagNames ?? [];
  const learnedTags = map ? extractLearnedTags(map) : [];
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
    rawTags.filter(isDifficultyTag).map((tag) => normalizeDifficultyTag(tag.trim().toLowerCase())),
  );
  const skillTagNames = dedupeByLower(rawTags.filter(isSkillMechanismConcept));
  const knowledgeTagNames = dedupeByLower(
    rawTags.filter((tag) => !isDifficultyTag(tag) && !isSkillMechanismConcept(tag)),
  );

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
              {carouselItems.length > 0 && currentMedia && !currentMediaLoadError ? (
                isVideoMediaKind(currentMedia.kind) ? (
                  <video
                    key={currentMedia.key}
                    src={currentMedia.url}
                    className={styles.steamPlayerVideo}
                    controls
                    playsInline
                  />
                ) : (
                  <img
                    key={currentMedia.key}
                    src={currentMedia.url}
                    alt=""
                    className={styles.steamPlayerImg}
                    onError={() => setCurrentMediaLoadError(true)}
                  />
                )
              ) : (
                <div className={styles.steamPlayerPlaceholder}>
                  <span role="img" aria-label="Game">
                    🗺️
                  </span>
                  <span className={styles.steamPlayerPlaceholderText}>
                    {t("previewNotAvailable")}
                  </span>
                </div>
              )}
            </div>

            {carouselItems.length > 0 && (
              <div className={styles.steamCarousel}>
                {carouselItems.map((item, idx) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${styles.steamThumb} ${
                      carouselIndex === idx ? styles.steamThumbActive : ""
                    }`}
                    onClick={() => setCarouselIndex(idx)}
                  >
                    {isVideoMediaKind(item.kind) ? (
                      <div className={styles.steamThumbVideoWrap}>
                        <video
                          src={item.url}
                          className={styles.steamThumbVideo}
                          muted
                          playsInline
                          preload="metadata"
                        />
                        <span className={styles.steamThumbVideoBadge} aria-hidden>
                          <Video size={18} />
                        </span>
                      </div>
                    ) : (
                      <img src={item.url} alt="" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: sidebar – nhóm thông tin rõ ràng */}
          <div className={styles.steamSidebar}>
            {showCatalogSetupForm && (
              <section className={`${styles.steamSidebarSection} ${styles.authorEditSection}`}>
                <h2 className={styles.steamSectionTitle}>{t("mapDetailEditSectionTitle")}</h2>
                <label className={styles.authorLabel}>{t("mapDetailFieldTitle")}</label>
                <input
                  type="text"
                  className={styles.authorInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <label className={styles.authorLabel}>{t("mapDetailFieldDescription")}</label>
                <textarea
                  className={styles.authorTextarea}
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
                <label className={styles.authorLabel}>{t("mapDetailFieldDifficulty")}</label>
                <select
                  className={styles.authorSelect}
                  value={editDifficulty}
                  onChange={(e) => setEditDifficulty(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}/5
                    </option>
                  ))}
                </select>
                <label className={styles.authorLabel}>{t("mapDetailFieldPrice")}</label>
                <input
                  type="number"
                  min={0}
                  className={styles.authorInput}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Math.max(0, Number(e.target.value) || 0))}
                />
                <label className={styles.authorLabel}>{t("mapDetailFieldTags")}</label>
                <div className={styles.authorTagChips}>
                  {loadingMapTags ? (
                    <span className={styles.steamDescEmpty}>{t("mapDetailLoadingTags")}</span>
                  ) : (
                    availableMapTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`${styles.authorTagChip} ${
                          selectedTagIds.includes(tag.id) ? styles.authorTagChipActive : ""
                        }`}
                        onClick={() => toggleTagSelection(tag.id)}
                      >
                        {localizeTagName(tag.name, locale)}
                      </button>
                    ))
                  )}
                </div>
                <label className={styles.authorLabel}>{t("mapDetailFieldLearnedTags")}</label>
                <div className={styles.authorTagChips}>
                  {learnedKnowledgeTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`${styles.authorTagChip} ${
                        selectedLearnedTagIds.includes(tag.id) ? styles.authorTagChipActive : ""
                      }`}
                      onClick={() => toggleLearnedTagSelection(tag.id)}
                    >
                      {localizeTagName(tag.name, locale)}
                    </button>
                  ))}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className={styles.authorFileHidden}
                  onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className={styles.authorFileHidden}
                  onChange={(e) => {
                    const list = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (!list.length) return;
                    setPendingGalleryFiles((prev) =>
                      [...prev, ...list].slice(0, GALLERY_UPLOAD_MAX),
                    );
                  }}
                />
                <div className={styles.authorMediaActions}>
                  <button
                    type="button"
                    className={styles.authorMediaBtn}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <ImagePlus size={14} /> {t("mapDetailChangeAvatar")}
                  </button>
                  <button
                    type="button"
                    className={styles.authorMediaBtn}
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <ImagePlus size={14} /> {t("mapDetailAddGallery")}
                  </button>
                </div>
                {avatarFile && (
                  <p className={styles.authorFileHint}>
                    {t("mapDetailAvatarSelected")}: {avatarFile.name}
                  </p>
                )}
                {pendingGalleryFiles.length > 0 && (
                  <ul className={styles.authorGalleryList}>
                    {pendingGalleryFiles.map((f, i) => (
                      <li key={`${f.name}-${f.size}-${i}`} className={styles.authorGalleryRow}>
                        <span className={styles.authorGalleryName}>{f.name}</span>
                        <button
                          type="button"
                          className={styles.authorGalleryRemove}
                          onClick={() =>
                            setPendingGalleryFiles((prev) => prev.filter((_, j) => j !== i))
                          }
                          aria-label={t("mapDetailRemoveGalleryFile")}
                        >
                          <X size={16} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className={styles.authorSaveBtn}
                  disabled={savingMetadata}
                  onClick={() => void handleSaveAuthorMetadata()}
                >
                  <Save size={16} />{" "}
                  {savingMetadata ? t("mapDetailSavingMetadata") : t("mapDetailSaveMetadata")}
                </button>
              </section>
            )}

            {!showCatalogSetupForm && (
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
            )}

            <section className={styles.steamSidebarSection}>
              <div className={styles.steamWinCondition}>
                <span className={styles.steamWinLabel}>{t("winCondition")}</span>
                <span className={styles.steamWinValue}>
                  {getWinConditionLabel(playHint?.winCondition ?? map?.winCondition ?? 1)}
                </span>
              </div>
            </section>

            {campaignLevels.length > 0 && (
              <section className={styles.steamSidebarSection}>
                <h2 className={styles.steamSectionTitle}>{t("myProgress")}</h2>
                <p className={styles.campaignProgressText}>
                  {t("levelProgressLabel")
                    .replace("{completed}", String(campaignProgress.completed))
                    .replace("{total}", String(campaignProgress.total))}
                </p>
                {currentCampaignLabel ? (
                  <p className={styles.campaignCurrentText}>
                    {t("levelCurrent")}: {currentCampaignLabel}
                  </p>
                ) : null}
                <div className={styles.campaignProgressBar}>
                  <span
                    className={styles.campaignProgressFill}
                    style={{
                      width:
                        campaignProgress.total > 0
                          ? `${(campaignProgress.completed / campaignProgress.total) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </section>
            )}

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
                {isAuthor && map.contentVersion != null && Number.isFinite(map.contentVersion) ? (
                  <div className={styles.steamMetaRow}>
                    <span className={styles.steamMetaLabel}>
                      {t("mapDetailContentVersionLabel")}
                    </span>
                    <span className={styles.steamMetaValue}>{map.contentVersion}</span>
                  </div>
                ) : null}
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("type")}</span>
                  <span className={styles.steamMetaValue}>
                    {playHint?.isPlatform ? t("platformer") : t("puzzleLogic")}
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
              {learnedTags.length > 0 && (
                <div className={styles.steamTagGroup} style={{ marginBottom: 14 }}>
                  <h3 className={styles.steamSubTitle}>{t("youWillLearn")}</h3>
                  <div className={styles.steamTagsList}>
                    {learnedTags.map((tag) => (
                      <span key={tag} className={styles.steamTag}>
                        {localizeTagName(tag, locale)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <h2 className={styles.steamSectionTitle}>{t("tags")}</h2>
              {rawTags.length > 0 ? (
                <div className={styles.steamTagGroups}>
                  {difficultyTagNames.length > 0 && (
                    <div className={styles.steamTagGroup}>
                      <h3 className={styles.steamSubTitle}>{t("difficulty")}</h3>
                      <div className={styles.steamTagsList}>
                        {difficultyTagNames.map((tag) => (
                          <span key={tag} className={styles.steamTag}>
                            {localizeTagName(tag, locale)}
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
                            {localizeTagName(tag, locale)}
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
                            {localizeTagName(tag, locale)}
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
          {canPlay ? (
            <>
              <motion.button
                type="button"
                onClick={handleStartMap}
                className={styles.steamFooterPrimary}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Gamepad2 size={20} /> {startedCampaign ? t("continuePlaying") : t("play")}
              </motion.button>
            </>
          ) : (
            <motion.button
              type="button"
              onClick={handleBuyMap}
              className={styles.steamFooterPrimary}
              disabled={isPurchasing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Lock size={18} /> {isPurchasing ? "Purchasing..." : t("buyWithOrbitCoin")}
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

        {purchaseModal && (
          <div className={styles.modalOverlay} onClick={() => setPurchaseModal(null)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3
                className={`${styles.modalTitle} ${
                  purchaseModal.kind === "success"
                    ? styles.modalTitleSuccess
                    : styles.modalTitleError
                }`}
              >
                {purchaseModal.kind === "success"
                  ? "Purchase successful"
                  : purchaseModal.kind === "insufficient"
                    ? "Insufficient balance"
                    : "Purchase failed"}
              </h3>
              <p className={styles.modalMessage}>{purchaseModal.message}</p>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtn}
                  onClick={() => setPurchaseModal(null)}
                >
                  {t("back")}
                </button>
                {purchaseModal.kind === "success" && (
                  <button
                    type="button"
                    className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                    onClick={() => {
                      setPurchaseModal(null);
                      handleStartMap();
                    }}
                  >
                    {t("play")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
