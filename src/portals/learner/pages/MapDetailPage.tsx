import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { isAxiosError } from "axios";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Lock,
  PlusCircle,
  Heart,
  Bell,
  Star,
  Share2,
  MessageCircle,
  MessageSquareWarning,
  ImagePlus,
  Video,
  PlayCircle,
  Save,
  X,
} from "lucide-react";
import { learnerCommunityApi } from "@/services/api/learner/community.api";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import { learnerGameplayApi } from "@/services/api/learner/gameplay.api";
import { learnerChatApi } from "@/services/api/learner/chat.api.ts";
import type { GameRatingItem } from "@/types/api/learner/community";
import type { GetMapsParams, Map, MapLevelItem, MapTag } from "@/types/api/learner/maps";
import type { MapPlayHistoryItem, PaginationResult } from "@/types/api/learner/gameplay";
import { getFirstLevelPlayHint } from "@/utils/levelLoader";
import type { MapOwnershipData } from "@/types/api/learner/maps";
import type { ApiResult } from "@/types/api/common";
import { ROUTES } from "@/lib/constants/routes";
import { useTranslation } from "@/lib/i18n/translations";
import { emitApiToast } from "@/shared/toast/apiToastBus";
import "@/shared/styles/tokens.css";
import styles from "./MapDetailPage.module.css";
import { extractLearnedTags } from "@/lib/maps/learnedTags";
import { localizeTagName } from "@/lib/maps/tagLocalization";

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

function getVietnamNowDateTimeLocal() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function renderRatingStars(value: number): string {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
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
  const [playHistory, setPlayHistory] = useState<MapPlayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [purchaseConfirmOpen, setPurchaseConfirmOpen] = useState(false);
  const [hasAcceptedPurchasePolicy, setHasAcceptedPurchasePolicy] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [currentMediaLoadError, setCurrentMediaLoadError] = useState(false);
  const [availableMapTags, setAvailableMapTags] = useState<MapTag[]>([]);
  const [loadingMapTags, setLoadingMapTags] = useState(false);
  const [creatorMaps, setCreatorMaps] = useState<Map[]>([]);
  const [loadingCreatorMaps, setLoadingCreatorMaps] = useState(false);
  const [ratings, setRatings] = useState<GameRatingItem[]>([]);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [ratingsError, setRatingsError] = useState<string | null>(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateValue, setRateValue] = useState(5);
  const [rateComment, setRateComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [isOpeningCreatorChat, setIsOpeningCreatorChat] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(1);
  const [editPrice, setEditPrice] = useState(0);
  const [editFreeTrialAttemptLimit, setEditFreeTrialAttemptLimit] = useState(0);
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

      const [mapResponse, ownershipResponse, historyResponse] = await Promise.all([
        learnerMapsApi.getMapById(id, true),
        learnerMapsApi.checkMapOwnership(id),
        learnerGameplayApi.getMyPlayHistory({ mapId: id, pageSize: 100 }),
      ]);

      if (mapResponse.data.isSuccess && mapResponse.data.data) {
        setMap(mapResponse.data.data as Map);
      } else {
        setError(mapResponse.data.message || t("failedLoadMapDetails"));
        return;
      }

      if (ownershipResponse.data?.isSuccess && ownershipResponse.data.data) {
        setOwnership(ownershipResponse.data.data);
      }

      // Extract play history from API response
      const historyData = historyResponse.data as ApiResult<PaginationResult<MapPlayHistoryItem>>;
      if (historyData?.isSuccess && historyData?.data?.items) {
        setPlayHistory(historyData.data.items);
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

    if (!id) {
      setRatings([]);
      setRatingsError(null);
      return;
    }

    const loadRatings = async () => {
      try {
        setLoadingRatings(true);
        setRatingsError(null);
        const response = await learnerCommunityApi.getMapRatings(id, false);

        if (!cancelled && response.data.isSuccess && Array.isArray(response.data.data)) {
          setRatings(response.data.data);
          return;
        }

        if (!cancelled) {
          setRatings([]);
          setRatingsError(
            response.data.message ||
              (locale.startsWith("vi")
                ? "Không tải được danh sách đánh giá."
                : "Unable to load reviews."),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setRatings([]);
          setRatingsError(
            locale.startsWith("vi")
              ? "Không tải được danh sách đánh giá."
              : "Unable to load reviews.",
          );
        }
        console.error(err);
      } finally {
        if (!cancelled) setLoadingRatings(false);
      }
    };

    void loadRatings();
    return () => {
      cancelled = true;
    };
  }, [id, locale]);

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
    setEditFreeTrialAttemptLimit(Math.max(0, Number(map.freeTrialAttemptLimit ?? 0)));
  }, [map]);

  useEffect(() => {
    let cancelled = false;
    const creatorId = map?.createdByUserId?.trim();
    const currentMapId = map?.id;

    if (!creatorId || !currentMapId) {
      setCreatorMaps([]);
      return;
    }

    const loadCreatorMaps = async () => {
      try {
        setLoadingCreatorMaps(true);
        const params: GetMapsParams = {
          pageNumber: 1,
          pageSize: 5,
          PageSize: 5,
          publishedOnly: true,
          createdByUserId: creatorId,
          CreatedByUserId: creatorId,
          sortBy: "CreatedAt",
          sortAscending: false,
        };
        const response = await learnerMapsApi.getMaps(params);
        if (cancelled) return;
        if (response.data.isSuccess && Array.isArray(response.data.data?.items)) {
          setCreatorMaps(response.data.data.items.filter((item) => item.id !== currentMapId));
          return;
        }
        setCreatorMaps([]);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setCreatorMaps([]);
        }
      } finally {
        if (!cancelled) setLoadingCreatorMaps(false);
      }
    };

    void loadCreatorMaps();
    return () => {
      cancelled = true;
    };
  }, [map?.createdByUserId, map?.id]);

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

    const toPlayRoute = (mapType: "platform" | "topdown" | "snake") =>
      mapType === "platform" ? ROUTES.PLATFORM : mapType === "snake" ? ROUTES.SNAKE : ROUTES.GAME;

    if (campaignLevels.length <= 1) {
      const selectedLevel: MapLevelItem | undefined = campaignLevels[0];
      const selectedMapDetailId = selectedLevel?.id ?? playHint.mapDetailId;
      const mapType =
        typeof selectedLevel?.type === "string"
          ? ((selectedLevel.type.trim().toLowerCase() === "platform"
              ? "platform"
              : selectedLevel.type.trim().toLowerCase() === "snake"
                ? "snake"
                : "topdown") as "platform" | "topdown" | "snake")
          : playHint.mapType;

      navigate(toPlayRoute(mapType), {
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

    const mapType =
      (currentLevel.type ?? "").trim().toLowerCase() === "platform"
        ? "platform"
        : (currentLevel.type ?? "").trim().toLowerCase() === "snake"
          ? "snake"
          : "topdown";
    navigate(toPlayRoute(mapType), {
      state: {
        levelId: map.id,
        mapDetailId: currentLevel.id,
      },
    });
  };

  const handleReportMapPurchaseIssue = () => {
    if (!map?.id || !purchaseModal || purchaseModal.kind === "success") return;
    const isInsufficient = purchaseModal.kind === "insufficient";
    const params = new URLSearchParams({
      prefill: `map-purchase-${purchaseModal.kind}-${map.id}-${Date.now()}`,
      openCreate: "1",
      categoryKey: isInsufficient ? "PaymentIssue" : "AccessIssue",
      gameName: map.title,
      mapId: map.id,
      subject: isInsufficient
        ? t("complaints.prefill.paymentFailureSubject")
        : t("complaints.prefill.mapPurchaseSubject"),
      description: isInsufficient
        ? t("complaints.prefill.paymentFailureDescription")
        : t("complaints.prefill.mapPurchaseDescription"),
    });

    navigate(`${ROUTES.LEARNER_COMPLAINTS}?${params.toString()}`);
  };

  const handleReportOwnedMapIssue = () => {
    if (!map?.id || !canReportOwnedMapIssue) return;
    const params = new URLSearchParams({
      prefill: `map-owned-gameplay-${map.id}-${Date.now()}`,
      openCreate: "1",
      categoryKey: "AccessIssue",
      gameName: map.title,
      mapId: map.id,
      occurredAt: getVietnamNowDateTimeLocal(),
      subject: locale.startsWith("vi")
        ? "Map đã mua bị lỗi khi chơi"
        : "Purchased map has gameplay issue",
      description: locale.startsWith("vi")
        ? "Tôi đã mua map này và gặp lỗi trong lúc chơi. Vui lòng kiểm tra giúp."
        : "I purchased this map and encountered an issue during gameplay. Please help investigate.",
    });

    navigate(`${ROUTES.LEARNER_COMPLAINTS}?${params.toString()}`);
  };

  const handleBuyMap = async () => {
    if (!map?.id) return;

    try {
      setIsPurchasing(true);
      const response = await learnerMapsApi.purchaseMap(map.id);
      if (response.data.isSuccess) {
        setPurchaseModal({
          kind: "success",
          message: locale.startsWith("vi") ? "Thanh toán thành công" : "Payment successful",
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

  const handleAddMapToCollection = async () => {
    if (!map?.id) return;

    try {
      setIsAddingToCollection(true);
      const response = await learnerMapsApi.addMapToMyMaps(map.id);
      if (response.data.isSuccess) {
        if (!(response.data.message ?? "").trim()) {
          emitApiToast({ type: "success", message: t("gameAddedToCollection") });
        }
        const ownershipResponse = await learnerMapsApi.checkMapOwnership(map.id);
        if (ownershipResponse.data.isSuccess && ownershipResponse.data.data) {
          setOwnership(ownershipResponse.data.data);
        }
        return;
      }

      if (!(response.data.message ?? "").trim()) {
        emitApiToast({ type: "error", message: t("gameAddToCollectionFailed") });
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const body = err.response?.data as ApiResult<null> | undefined;
        if (!(body?.message ?? "").trim()) {
          emitApiToast({ type: "error", message: t("gameAddToCollectionFailed") });
        }
        return;
      }

      console.error(err);
      emitApiToast({ type: "error", message: t("gameAddToCollectionFailed") });
    } finally {
      setIsAddingToCollection(false);
    }
  };

  const handleChatWithCreator = async () => {
    if (!map?.id || !map.createdByUserId) return;

    try {
      setIsOpeningCreatorChat(true);
      const response = await learnerChatApi.getOrCreatePrivateConversation(map.createdByUserId);
      const conversationId = response.data.data?.id;
      if (!response.data.isSuccess || !conversationId) {
        if (!(response.data.message ?? "").trim()) {
          emitApiToast({
            type: "error",
            message: locale.startsWith("vi")
              ? "Không thể mở cuộc trò chuyện với tác giả."
              : "Unable to open chat with creator.",
          });
        }
        return;
      }

      const params = new URLSearchParams({
        otherUserId: map.createdByUserId,
        otherUserName: getCreatorLabel(),
      });
      navigate(`${ROUTES.LEARNER_CHAT_CONVERSATION(conversationId)}?${params.toString()}`);
    } catch (err) {
      console.error(err);
      emitApiToast({
        type: "error",
        message: locale.startsWith("vi")
          ? "Có lỗi khi mở cuộc trò chuyện với tác giả."
          : "An error occurred while opening chat with creator.",
      });
    } finally {
      setIsOpeningCreatorChat(false);
    }
  };

  const handleOpenRateModal = () => {
    if (!map?.id || ownership?.isOwned !== true) return;
    setRateValue(5);
    setRateComment("");
    setRateModalOpen(true);
  };

  const handleCloseRateModal = () => {
    if (submittingRating) return;
    setRateModalOpen(false);
  };

  const handleSubmitRating = async () => {
    if (!map?.id || ownership?.isOwned !== true) return;

    try {
      setSubmittingRating(true);
      const response = await learnerCommunityApi.rateMap(map.id, {
        rating: rateValue,
        comment: rateComment.trim() || undefined,
      });

      if (!response.data.isSuccess) {
        emitApiToast({
          type: "error",
          message: response.data.message || t("failedSubmitRating"),
        });
        return;
      }

      emitApiToast({
        type: "success",
        message: locale.startsWith("vi") ? "Đã gửi đánh giá thành công." : "Rating submitted.",
      });
      setRateModalOpen(false);

      const ratingsResponse = await learnerCommunityApi.getMapRatings(map.id, false);
      if (ratingsResponse.data.isSuccess && Array.isArray(ratingsResponse.data.data)) {
        setRatings(ratingsResponse.data.data);
        setRatingsError(null);
      }
    } catch (err) {
      const body = isAxiosError(err) ? (err.response?.data as ApiResult<unknown> | undefined) : null;
      emitApiToast({
        type: "error",
        message: body?.message || t("failedSubmitRating"),
      });
      console.error(err);
    } finally {
      setSubmittingRating(false);
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
      emitApiToast({ type: "error", message: t("mapDetailEditTitleRequired") });
      return;
    }
    try {
      setSavingMetadata(true);
      const res = await learnerMapsApi.updateMapMetadata(map.id, {
        title: titleTrim,
        description: editDescription,
        difficulty: editDifficulty,
        price: editPrice,
        freeTrialAttemptLimit: Math.max(0, Number(editFreeTrialAttemptLimit || 0)),
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        learnedTags: selectedLearnedTagIds.length > 0 ? selectedLearnedTagIds : undefined,
      });
      if (!res.data.isSuccess) {
        if (!(res.data.message ?? "").trim()) {
          emitApiToast({
            type: "error",
            message: t("mapDetailMetadataSaveFailed").replace("{message}", ""),
          });
        }
        return;
      }
      if (avatarFile) {
        const ar = await learnerMapsApi.uploadMapAvatar(map.id, avatarFile);
        if (!ar.data.isSuccess) {
          if (!(ar.data.message ?? "").trim()) {
            emitApiToast({
              type: "error",
              message: t("mapDetailAvatarUploadFailed").replace("{message}", ""),
            });
          }
          return;
        }
      }
      if (pendingGalleryFiles.length > 0) {
        const gr = await learnerMapsApi.uploadMapGallery(map.id, pendingGalleryFiles);
        if (!gr.data.isSuccess) {
          if (!(gr.data.message ?? "").trim()) {
            emitApiToast({
              type: "error",
              message: t("mapDetailGalleryUploadFailed").replace("{message}", ""),
            });
          }
          return;
        }
      }
      setAvatarFile(null);
      setPendingGalleryFiles([]);
      await loadMap();
      if (!(res.data.message ?? "").trim()) {
        emitApiToast({ type: "success", message: t("mapDetailMetadataSaved") });
      }
      navigate(".", { replace: true, state: {} });
    } catch (e) {
      console.error(e);
      emitApiToast({ type: "error", message: t("mapDetailMetadataSaveError") });
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

  const formatRatingDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(locale.startsWith("vi") ? "vi-VN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

  const trialLimit = Math.max(0, Number(map?.freeTrialAttemptLimit ?? 0));
  const trialUsedAttempts = playHistory.length;
  const trialRemainingAttempts = Math.max(0, trialLimit - trialUsedAttempts);
  const canUseTrial =
    ownership?.isOwned !== true &&
    map?.isPublished === true &&
    (map?.price ?? 0) > 0 &&
    trialRemainingAttempts > 0;
  const canAddToCollection =
    ownership?.isOwned !== true &&
    ownership?.isAuthor !== true &&
    map?.isPublished === true &&
    (map?.price ?? 0) <= 0;
  const canPlay = ownership?.isOwned || (map?.isPublished && map?.price === 0) || canUseTrial;
  const canPurchase =
    ownership?.isOwned !== true && map?.isPublished === true && (map?.price ?? 0) > 0;
  const canRateMap = ownership?.isOwned === true;
  const canReportOwnedMapIssue = useMemo(() => {
    if (!map?.id || !ownership?.isOwned || ownership.isAuthor || ownership.isPurchased !== true) {
      return false;
    }
    const purchasedAtRaw = ownership.purchasedAt;
    if (!purchasedAtRaw) return false;
    const purchasedAtMs = Date.parse(purchasedAtRaw);
    if (Number.isNaN(purchasedAtMs)) return false;
    const elapsedMs = Date.now() - purchasedAtMs;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return elapsedMs >= 0 && elapsedMs <= sevenDaysMs;
  }, [
    map?.id,
    ownership?.isOwned,
    ownership?.isAuthor,
    ownership?.isPurchased,
    ownership?.purchasedAt,
  ]);
  const playHint = useMemo(() => (map ? getFirstLevelPlayHint(map) : null), [map]);
  const campaignLevels = useMemo(() => {
    const levels = map?.levels ?? [];
    return [...levels].sort((a, b) => a.levelOrder - b.levelOrder);
  }, [map?.levels]);

  // Calculate campaign states from API play history
  const campaignLevelStates = useMemo(() => {
    if (!campaignLevels.length) return [];

    const completedBySubmission = new Map<string, boolean>();
    const attemptedLevelIds = new Set<string>();

    for (const historyItem of playHistory) {
      attemptedLevelIds.add(historyItem.id);
      if (historyItem.isCompleted) {
        completedBySubmission.set(historyItem.id, true);
      }
    }

    return campaignLevels.map((level, index) => {
      const isCompleted = completedBySubmission.has(level.id);
      const isAttempted = attemptedLevelIds.has(level.id);
      const isUnlocked =
        index === 0 || (index > 0 && completedBySubmission.has(campaignLevels[index - 1].id));
      const isLocked = !isUnlocked;
      const isCurrent = isUnlocked && (!isCompleted || (isAttempted && !isCompleted));

      return {
        levelId: level.id,
        levelOrder: index,
        isLocked,
        isUnlocked,
        isCompleted,
        isCurrent,
      };
    });
  }, [campaignLevels, playHistory]);

  const currentCampaignLevelId = useMemo(() => {
    const current = campaignLevelStates.find((state) => state.isCurrent);
    return current?.levelId ?? null;
  }, [campaignLevelStates]);

  const startedCampaign = useMemo(() => {
    return playHistory.length > 0;
  }, [playHistory]);

  const carouselItems = useMemo(() => buildCarouselItems(map), [map]);
  const isAuthor = ownership?.isAuthor === true;
  const mapCatalogSetup =
    (location.state as MapDetailLocationState | null)?.mapCatalogSetup === true;
  const showCatalogSetupForm = mapCatalogSetup && isAuthor;
  const currentMedia = carouselItems[carouselIndex] ?? null;
  const purchasePreviewUrl = useMemo(() => {
    const avatar = map?.avatarUrl?.trim();
    if (avatar) return avatar;
    const firstGalleryUrl = map?.gallery?.find((item) => item.url?.trim())?.url?.trim();
    return firstGalleryUrl ?? "";
  }, [map]);
  const purchaseDifficultyLabel =
    map?.difficulty === 1 ? t("easy") : map?.difficulty === 2 ? t("medium") : t("hard");
  const buyerPolicyRoute = locale.startsWith("vi")
    ? ROUTES.BUYER_POLICY_VI
    : ROUTES.BUYER_POLICY_EN;

  const handleOpenBuyerPolicy = () => {
    window.open(buyerPolicyRoute, "_blank", "noopener,noreferrer");
  };

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
  const ratingsCount = ratings.length;
  const averageRating = useMemo(() => {
    if (!ratingsCount) return 0;
    return ratings.reduce((sum, row) => sum + Number(row.rating || 0), 0) / ratingsCount;
  }, [ratings, ratingsCount]);

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
          <button
            type="button"
            onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
            className={styles.backBtn}
          >
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
          onClick={() => navigate(ROUTES.LEARNER_MAPS_BROWSE)}
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

              {canPlay && (
                <motion.button
                  type="button"
                  className={styles.steamPlayerPlayOverlay}
                  onClick={handleStartMap}
                  aria-label={startedCampaign ? t("continuePlaying") : t("play")}
                >
                  <span className={styles.steamPlayerPlayIcon}>
                    <PlayCircle size={26} />
                  </span>
                  <span className={styles.steamPlayerPlayText}>
                    {startedCampaign ? t("continuePlaying") : t("play")}
                  </span>
                </motion.button>
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
                <label className={styles.authorLabel}>
                  {locale.startsWith("vi") ? "Lượt chơi thử miễn phí" : "Free trial attempts"}
                </label>
                <input
                  type="number"
                  min={0}
                  className={styles.authorInput}
                  value={editFreeTrialAttemptLimit}
                  onChange={(e) =>
                    setEditFreeTrialAttemptLimit(Math.max(0, Number(e.target.value) || 0))
                  }
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
                {map.contentVersion != null && Number.isFinite(map.contentVersion) ? (
                  <div className={styles.steamMetaRow}>
                    <span className={styles.steamMetaLabel}>
                      {t("mapDetailContentVersionLabel")}
                    </span>
                    <span className={styles.steamMetaValue}>{map.contentVersion}</span>
                  </div>
                ) : null}
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
                <div className={styles.steamMetaRow}>
                  <span className={styles.steamMetaLabel}>{t("mapDetailFieldPrice")}</span>
                  <span className={styles.steamMetaValue}>
                    {map.price > 0 ? `${map.price.toLocaleString()} OC` : t("free")}
                  </span>
                </div>
                {trialLimit > 0 && (
                  <div className={styles.steamMetaRow}>
                    <span className={styles.steamMetaLabel}>
                      {locale.startsWith("vi") ? "Lượt chơi thử" : "Free trial"}
                    </span>
                    <span className={styles.steamMetaValue}>
                      {trialRemainingAttempts}/{trialLimit}
                    </span>
                  </div>
                )}
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
          {canPurchase ? (
            <motion.button
              type="button"
              onClick={() => {
                setHasAcceptedPurchasePolicy(false);
                setPurchaseConfirmOpen(true);
              }}
              className={styles.steamFooterPrimary}
              disabled={isPurchasing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Lock size={18} /> {isPurchasing ? "Purchasing..." : t("buyWithOrbitCoin")}
              {map.price > 0 && ` (${map.price.toLocaleString()} OC)`}
            </motion.button>
          ) : null}
          {canAddToCollection ? (
            <motion.button
              type="button"
              onClick={() => void handleAddMapToCollection()}
              className={styles.steamFooterPrimary}
              disabled={isAddingToCollection}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <PlusCircle size={18} />
              {isAddingToCollection ? t("addingToCollection") : t("addToCollection")}
            </motion.button>
          ) : null}
          {canRateMap ? (
            <motion.button
              type="button"
              className={styles.steamFooterSecondary}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleOpenRateModal}
            >
              <Star size={16} /> {t("rate")}
            </motion.button>
          ) : null}
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
          {canReportOwnedMapIssue ? (
            <motion.button
              type="button"
              className={styles.steamFooterSecondary}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReportOwnedMapIssue}
            >
              <MessageSquareWarning size={16} /> {t("complaints.actions.reportThisGame")}
            </motion.button>
          ) : null}
          {!isAuthor && (
            <motion.button
              type="button"
              className={styles.steamFooterSecondary}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleChatWithCreator}
              disabled={isOpeningCreatorChat}
            >
              <MessageCircle size={16} />
              {isOpeningCreatorChat
                ? locale.startsWith("vi")
                  ? "Đang mở chat..."
                  : "Opening chat..."
                : locale.startsWith("vi")
                  ? "Liên hệ người bán"
                  : "Contact seller"}
            </motion.button>
          )}
        </motion.div>

        {!showCatalogSetupForm && (
          <section className={styles.ratingsSection}>
            <div className={styles.ratingsHeader}>
              <h2 className={styles.ratingsTitle}>
                {locale.startsWith("vi") ? "Đánh giá từ người chơi" : "Player reviews"}
              </h2>
              <div className={styles.ratingsSummary}>
                {ratingsCount > 0 ? (
                  <>
                    <span className={styles.ratingsAverage}>{averageRating.toFixed(1)}/5</span>
                    <span className={styles.ratingsAverageStars}>
                      {renderRatingStars(averageRating)}
                    </span>
                    <span className={styles.ratingsCount}>
                      ({ratingsCount} {locale.startsWith("vi") ? "đánh giá" : "reviews"})
                    </span>
                  </>
                ) : (
                  <span className={styles.ratingsCount}>
                    0 {locale.startsWith("vi") ? "đánh giá" : "reviews"}
                  </span>
                )}
              </div>
            </div>

            {loadingRatings ? (
              <p className={styles.ratingsState}>
                {locale.startsWith("vi") ? "Đang tải đánh giá..." : "Loading reviews..."}
              </p>
            ) : ratingsError ? (
              <p className={styles.ratingsStateError}>{ratingsError}</p>
            ) : ratings.length === 0 ? (
              <p className={styles.ratingsState}>
                {locale.startsWith("vi")
                  ? "Chưa có đánh giá nào cho trò chơi này."
                  : "No reviews for this game yet."}
              </p>
            ) : (
              <div className={styles.ratingsList}>
                {ratings.map((item) => {
                  const reviewer =
                    item.isAuthor && map.createdByUserName?.trim()
                      ? map.createdByUserName.trim()
                      : `${locale.startsWith("vi") ? "Người chơi" : "Player"} ${item.userId.slice(0, 8)}`;

                  return (
                    <article key={item.id} className={styles.ratingItem}>
                      <div className={styles.ratingItemTop}>
                        <span className={styles.ratingStars}>{renderRatingStars(item.rating)}</span>
                        <span className={styles.ratingScore}>{item.rating}/5</span>
                      </div>
                      <div className={styles.ratingMeta}>
                        <span className={styles.ratingAuthor}>{reviewer}</span>
                        {item.isAuthor && (
                          <span className={styles.ratingAuthorBadge}>
                            {locale.startsWith("vi") ? "Tác giả" : "Author"}
                          </span>
                        )}
                        <span className={styles.ratingDot}>•</span>
                        <span>{formatRatingDate(item.createdAt)}</span>
                      </div>
                      <p className={styles.ratingComment}>
                        {item.comment?.trim() ||
                          (locale.startsWith("vi") ? "Không có bình luận." : "No comment.")}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!showCatalogSetupForm && map.createdByUserId && (
          <section className={styles.moreByCreatorSection}>
            <div className={styles.moreByCreatorHeader}>
              <h2 className={styles.moreByCreatorTitle}>
                {locale.startsWith("vi")
                  ? "Bản đồ khác của tác giả"
                  : "More maps from this creator"}
              </h2>
              <div className={styles.moreByCreatorHeaderActions}>
                <span className={styles.moreByCreatorName}>{getCreatorLabel()}</span>
                <button
                  type="button"
                  className={styles.moreByCreatorViewMore}
                  onClick={() => {
                    const query = new URLSearchParams({ name: getCreatorLabel() });
                    navigate(
                      `${ROUTES.LEARNER_USER_MAPS(map.createdByUserId)}?${query.toString()}`,
                    );
                  }}
                >
                  {locale.startsWith("vi") ? "Xem thêm" : "View more"}
                </button>
              </div>
            </div>

            {loadingCreatorMaps ? (
              <p className={styles.moreByCreatorState}>{t("loadingMapDetails")}</p>
            ) : creatorMaps.length > 0 ? (
              <div className={styles.moreByCreatorGrid}>
                {creatorMaps.map((otherMap) => {
                  const thumbnail =
                    otherMap.avatarUrl?.trim() || otherMap.gallery?.[0]?.url?.trim() || "";
                  const difficultyLabel =
                    otherMap.difficulty <= 2
                      ? t("easy")
                      : otherMap.difficulty === 3
                        ? t("medium")
                        : t("hard");

                  return (
                    <button
                      key={otherMap.id}
                      type="button"
                      className={styles.creatorMapCard}
                      onClick={() =>
                        navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", otherMap.id))
                      }
                    >
                      <div className={styles.creatorMapThumbWrap}>
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={otherMap.title}
                            className={styles.creatorMapThumb}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.creatorMapThumbPlaceholder}>No Preview</div>
                        )}
                      </div>
                      <div className={styles.creatorMapBody}>
                        <h3 className={styles.creatorMapTitle}>{otherMap.title}</h3>
                        <p className={styles.creatorMapDesc}>
                          {otherMap.description?.trim() ||
                            (locale.startsWith("vi")
                              ? "Chưa có mô tả cho bản đồ này."
                              : "No description for this map.")}
                        </p>
                        <div className={styles.creatorMapMetaRow}>
                          <span>{difficultyLabel}</span>
                          <span className={styles.creatorMapPrice}>
                            {otherMap.price > 0
                              ? `${otherMap.price.toLocaleString()} OC`
                              : t("free")}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className={styles.moreByCreatorState}>
                {locale.startsWith("vi")
                  ? "Tác giả chưa có bản đồ công khai khác."
                  : "No other published maps from this creator yet."}
              </p>
            )}
          </section>
        )}

        {purchaseConfirmOpen && canPurchase ? (
          <div
            className={styles.modalOverlay}
            onClick={() => {
              if (!isPurchasing) {
                setPurchaseConfirmOpen(false);
                setHasAcceptedPurchasePolicy(false);
              }
            }}
          >
            <div
              className={`${styles.modal} ${styles.purchaseConfirmModal}`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className={styles.modalTitle}>
                {locale.startsWith("vi") ? "Xác nhận mua bản đồ" : "Confirm map purchase"}
              </h3>
              <div className={styles.purchaseConfirmCard}>
                <div className={styles.purchaseConfirmThumbWrap}>
                  {purchasePreviewUrl ? (
                    <img
                      src={purchasePreviewUrl}
                      alt={map.title}
                      className={styles.purchaseConfirmThumb}
                    />
                  ) : (
                    <div className={styles.purchaseConfirmThumbPlaceholder}>No Preview</div>
                  )}
                </div>
                <div className={styles.purchaseConfirmBody}>
                  <p className={styles.purchaseConfirmTitle}>{map.title}</p>
                  <p className={styles.purchaseConfirmMeta}>
                    {t("developer")}: {getCreatorLabel()}
                  </p>
                  <p className={styles.purchaseConfirmMeta}>
                    {t("difficulty")}: {purchaseDifficultyLabel}
                  </p>
                  <p className={styles.purchaseConfirmPrice}>{map.price.toLocaleString()} OC</p>
                </div>
              </div>
              <p className={styles.modalMessage}>
                {locale.startsWith("vi")
                  ? "Bạn có chắc muốn mua bản đồ này không?"
                  : "Are you sure you want to purchase this map?"}
              </p>
              <p className={styles.purchasePolicyNote}>
                {locale.startsWith("vi")
                  ? "Vui lòng xem chính sách người mua trước khi xác nhận giao dịch."
                  : "Please review the buyer policy before confirming this purchase."}{" "}
                <button
                  type="button"
                  className={styles.purchasePolicyLink}
                  onClick={handleOpenBuyerPolicy}
                >
                  {locale.startsWith("vi") ? "Mở chính sách mua game" : "Open buy game policy"}
                </button>
              </p>
              <label className={styles.purchasePolicyAgreeRow}>
                <input
                  type="checkbox"
                  className={styles.purchasePolicyCheckbox}
                  checked={hasAcceptedPurchasePolicy}
                  disabled={isPurchasing}
                  onChange={(event) => setHasAcceptedPurchasePolicy(event.target.checked)}
                />
                <span className={styles.purchasePolicyAgreeText}>
                  {locale.startsWith("vi")
                    ? "Tôi đã đọc và đồng ý với chính sách người mua."
                    : "I have read and agree to the buyer policy."}
                </span>
              </label>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtn}
                  disabled={isPurchasing}
                  onClick={() => {
                    setPurchaseConfirmOpen(false);
                    setHasAcceptedPurchasePolicy(false);
                  }}
                >
                  {t("back")}
                </button>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  disabled={isPurchasing || !hasAcceptedPurchasePolicy}
                  onClick={async () => {
                    setPurchaseConfirmOpen(false);
                    setHasAcceptedPurchasePolicy(false);
                    await handleBuyMap();
                  }}
                >
                  {isPurchasing
                    ? locale.startsWith("vi")
                      ? "Đang mua..."
                      : "Purchasing..."
                    : t("buyWithOrbitCoin")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

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
                  ? locale.startsWith("vi")
                    ? "Thanh toán thành công"
                    : "Payment successful"
                  : purchaseModal.kind === "insufficient"
                    ? "Insufficient balance"
                    : "Purchase failed"}
              </h3>
              {purchaseModal.kind !== "success" ? (
                <p className={styles.modalMessage}>{purchaseModal.message}</p>
              ) : null}
              {purchaseModal.kind === "success" ? (
                <p className={styles.modalMessage}>
                  <button
                    type="button"
                    className={styles.purchasePolicyLink}
                    onClick={() => {
                      setPurchaseModal(null);
                      navigate(ROUTES.LEARNER_WALLET);
                    }}
                  >
                    {locale.startsWith("vi") ? "Xem lịch sử giao dịch" : "View transaction history"}
                  </button>
                </p>
              ) : null}
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtn}
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
                        {locale.startsWith("vi") ? "Nạp thêm OC" : "Top up OrbitCoin"}
                      </button>
                    ) : null}
                    {purchaseModal.kind === "error" ? (
                      <button
                        type="button"
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                        onClick={handleReportMapPurchaseIssue}
                      >
                        {t("complaints.actions.reportThisGame")}
                      </button>
                    ) : null}
                    {!isAuthor && map?.createdByUserId ? (
                      <button
                        type="button"
                        className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                        onClick={handleChatWithCreator}
                        disabled={isOpeningCreatorChat}
                      >
                        {isOpeningCreatorChat
                          ? locale.startsWith("vi")
                            ? "Đang mở chat..."
                            : "Opening chat..."
                          : locale.startsWith("vi")
                            ? "Liên hệ người bán"
                            : "Contact seller"}
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {rateModalOpen && (
          <div className={styles.modalOverlay} onClick={handleCloseRateModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 className={styles.modalTitle}>
                {locale.startsWith("vi") ? "Đánh giá trò chơi" : "Rate this game"}
              </h3>
              <p className={styles.modalMessage}>
                {locale.startsWith("vi")
                  ? "Hãy chọn số sao và chia sẻ cảm nhận của bạn."
                  : "Choose a star rating and share your feedback."}
              </p>

              <div className={styles.rateModalStarsRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`${styles.rateModalStarBtn} ${
                      rateValue >= value ? styles.rateModalStarBtnActive : ""
                    }`}
                    onClick={() => setRateValue(value)}
                    aria-label={`${value} star`}
                  >
                    ★
                  </button>
                ))}
                <span className={styles.rateModalScore}>{rateValue}/5</span>
              </div>

              <textarea
                value={rateComment}
                onChange={(e) => setRateComment(e.target.value)}
                placeholder={t("rateGamePlaceholder")}
                className={styles.rateModalTextarea}
                rows={4}
              />

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.modalBtn}
                  onClick={handleCloseRateModal}
                  disabled={submittingRating}
                >
                  {t("cancel")}
                </button>
                <button
                  type="button"
                  className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                  onClick={() => void handleSubmitRating()}
                  disabled={submittingRating}
                >
                  {submittingRating ? t("submitting") : t("submitRating")}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
