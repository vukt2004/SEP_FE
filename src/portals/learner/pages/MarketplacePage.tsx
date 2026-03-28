// src/portals/learner/pages/MarketplacePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map as ApiMap } from "@/types/api/learner/maps";
import { useTranslation } from "@/lib/i18n/translations";
import { getDifficultyTier } from "@/lib/maps/difficultyDisplay";
import { extractLearnedTags } from "@/lib/maps/learnedTags";
import styles from "./MarketplacePage.module.css";

type MapTag = { label: string; color: "orange" | "yellow" | "blue" | "purple" | "green" };

type MapItem = {
  id: string;
  title: string;
  thumbnail: string; // url or placeholder
  categoryTags: MapTag[];
  modeTags: MapTag[];
  description?: string;
  views: number; // e.g. 37900
  likesPercentage: number; // e.g. 63.3
  isFavorited: boolean;
  previews?: string[]; // for featured carousel
  learnedTags?: string[];
};

const TAG_STYLES: Record<MapTag["color"], React.CSSProperties> = {
  orange: {
    background: "rgba(249, 115, 22, 0.2)",
    color: "#fb923c",
    borderColor: "rgba(249, 115, 22, 0.4)",
  },
  yellow: {
    background: "rgba(234, 179, 8, 0.2)",
    color: "#facc15",
    borderColor: "rgba(234, 179, 8, 0.4)",
  },
  blue: {
    background: "rgba(59, 130, 246, 0.2)",
    color: "#60a5fa",
    borderColor: "rgba(59, 130, 246, 0.4)",
  },
  purple: {
    background: "rgba(168, 85, 247, 0.2)",
    color: "#c084fc",
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  green: {
    background: "rgba(34, 197, 94, 0.2)",
    color: "#4ade80",
    borderColor: "rgba(34, 197, 94, 0.4)",
  },
};

function mapApiMapToUiMap(apiMap: ApiMap, index: number): MapItem {
  const paletteIndex = index % 5;

  const thumbnailPalettes: string[] = [
    "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1a2f4a 100%)",
    "linear-gradient(135deg, #374151 0%, #4b5563 100%)",
    "linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)",
    "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)",
    "linear-gradient(135deg, #14532d 0%, #166534 100%)",
  ];

  const typeTag: MapTag = {
    label: apiMap.type === "Platform" ? "Platform" : "Topdown",
    color: apiMap.type === "Platform" ? "blue" : "orange",
  };

  const tier = getDifficultyTier(apiMap.difficulty);
  const difficultyTag: MapTag = {
    label: `Difficulty ${apiMap.difficulty}`,
    color: tier === "easy" ? "green" : tier === "medium" ? "yellow" : "purple",
  };

  const categoryTags: MapTag[] = [typeTag, difficultyTag];

  const modeTags: MapTag[] = apiMap.tagNames.slice(0, 2).map((tag) => ({
    label: tag,
    color: "yellow",
  }));

  const baseViews = 1200 + index * 530;
  const likes = 70 + ((index * 7) % 25);

  const avatarUrl =
    (apiMap as ApiMap & { AvatarUrl?: string | null }).avatarUrl ??
    (apiMap as ApiMap & { AvatarUrl?: string | null }).AvatarUrl;
  const thumbnail =
    avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim() !== ""
      ? avatarUrl.trim()
      : thumbnailPalettes[paletteIndex];

  return {
    id: apiMap.id,
    title: apiMap.title,
    thumbnail,
    description: apiMap.description,
    categoryTags,
    modeTags,
    views: baseViews,
    likesPercentage: Math.min(likes, 99),
    isFavorited: false,
    learnedTags: extractLearnedTags(apiMap),
  };
}

type TabId = "trending" | "random" | "favorites";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [heroMaps, setHeroMaps] = useState<MapItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("trending");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [favorites] = useState<Set<string>>(() => new Set());
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [difficultyFilter] = useState<number | undefined>(undefined);
  const [typeFilter] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMaps = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await learnerMapsApi.getMaps({
          pageNumber: currentPage,
          pageSize: 20,
          mapStatus: "Published", // chỉ lấy map Published cho catalog
          difficulty: difficultyFilter,
          type: typeFilter,
          search: searchTerm || undefined,
          sortBy: "CreatedAt",
          sortAscending: false,
        });

        if (response.data.isSuccess && response.data.data) {
          const { items, totalPages: apiTotalPages, hasNext: apiHasNext } = response.data.data;

          // Bỏ qua các map do chính user tạo (isAuthor = true) nếu backend có field này
          const visibleItems = (items as (ApiMap & { isAuthor?: boolean })[]).filter(
            (m) => !m.isAuthor,
          );

          setMaps((prev) => {
            const baseIndex = currentPage === 1 ? 0 : prev.length;
            const mapped = visibleItems.map((apiMap, idx) =>
              mapApiMapToUiMap(apiMap as ApiMap, baseIndex + idx),
            );
            if (currentPage === 1) {
              return mapped.slice(0, 100);
            }
            const combined = [...prev, ...mapped];
            return combined.slice(0, 100);
          });

          setTotalPages(apiTotalPages);
          setHasNext(apiHasNext && (currentPage + 1) * 20 < 100);
        } else {
          setError(response.data.message || t("failedLoadMapList"));
        }
      } catch (err) {
        console.error("Failed to load marketplace maps:", err);
        setError(t("errorLoadMapList"));
      } finally {
        setLoading(false);
      }
    };

    loadMaps();
  }, [currentPage, difficultyFilter, typeFilter, searchTerm]);

  useEffect(() => {
    const loadHeroMaps = async () => {
      try {
        const response = await learnerMapsApi.getMaps({
          pageNumber: 1,
          pageSize: 10,
          mapStatus: "Published",
          sortBy: "CreatedAt",
          sortAscending: false,
        });

        if (response.data.isSuccess && response.data.data) {
          const items = response.data.data.items as ApiMap[];
          const mapped = items.map((apiMap, idx) => mapApiMapToUiMap(apiMap, idx));
          setHeroMaps(mapped);
        }
      } catch (err) {
        console.error("Failed to load hero maps:", err);
      }
    };

    loadHeroMaps();
  }, []);

  // Infinite scroll: khi kéo xuống cuối trang sẽ tự load thêm map (tối đa 100 bản ghi)
  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasNext) return;
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.body.offsetHeight - 200;
      if (scrollPosition >= threshold) {
        setCurrentPage((prev) => prev + 1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, hasNext]);

  const tabs: { id: TabId; labelKey: string }[] = [
    { id: "trending", labelKey: "trending" },
    { id: "favorites", labelKey: "favorites" },
    { id: "random", labelKey: "random" },
  ];

  const listMaps = useMemo(() => {
    if (activeTab === "trending") {
      return [...maps].sort((a, b) => b.views - a.views).slice(0, 12);
    }
    if (activeTab === "favorites") {
      return maps.filter((m) => favorites.has(m.id)).slice(0, 12);
    }
    return [...maps].sort(() => Math.random() - 0.5).slice(0, 12);
  }, [activeTab, favorites, maps]);

  // Hero hiển thị tối đa 10 map, lấy từ nguồn hero riêng; nếu lỗi thì fallback slice từ maps
  const heroSource = heroMaps.length > 0 ? heroMaps : maps.slice(0, 10);
  const featuredMap =
    heroSource.length > 0 ? heroSource[featuredIndex % heroSource.length] : undefined;

  const goToMapDetail = (mapId: string) => {
    navigate(`/app/map/${mapId}`);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.loadingWrap}>{t("loadingMapList")}</div>
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

  if (!loading && maps.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.bg} aria-hidden />
        <div className={styles.content}>
          <div className={styles.emptyWrap}>{t("noMapsPublished")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden />
      <div className={styles.content}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Featured / Hero */}
          <motion.div
            style={card()}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
                alignItems: "stretch",
                minHeight: 320,
              }}
            >
              <motion.div
                style={{
                  position: "relative",
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "var(--surface-2)",
                  cursor: featuredMap ? "pointer" : "default",
                }}
                onClick={() => {
                  if (featuredMap) goToMapDetail(featuredMap.id);
                }}
                whileHover={featuredMap ? { scale: 1.01 } : undefined}
                whileTap={featuredMap ? { scale: 0.99 } : undefined}
                transition={{ duration: 0.2 }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 280,
                    background: featuredMap?.thumbnail?.startsWith("linear")
                      ? featuredMap.thumbnail
                      : featuredMap?.thumbnail
                        ? `url(${featuredMap.thumbnail}) center/cover`
                        : "linear-gradient(135deg, #1e293b 0%, #111827 100%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 12,
                    left: 12,
                    right: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex((i) => Math.max(0, i - 1));
                      }}
                      style={navBtn}
                      aria-label={t("previousAria")}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronLeft size={20} />
                    </motion.button>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: featuredIndex % 3 === i ? "var(--primary)" : "var(--muted)",
                            opacity: featuredIndex % 3 === i ? 1 : 0.4,
                          }}
                        />
                      ))}
                    </div>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFeaturedIndex((i) => i + 1);
                      }}
                      style={navBtn}
                      aria-label={t("nextAria")}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ChevronRight size={20} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: 28,
                      fontWeight: 900,
                      margin: "0 0 12px 0",
                      color: "var(--text)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {featuredMap?.title ?? ""}
                  </h2>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {featuredMap?.categoryTags.map((t) => (
                      <span key={t.label} style={{ ...pillTag(), ...TAG_STYLES[t.color] }}>
                        {t.label}
                      </span>
                    ))}
                    {featuredMap?.modeTags.map((t) => (
                      <span key={t.label} style={{ ...pillTag(), ...TAG_STYLES[t.color] }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                  {/* Hidden: likes & views for featured map */}
                  {/*
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  color: "var(--muted)",
                  fontSize: 14,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <ThumbsUp size={16} />
                  <span style={{ fontWeight: 800 }}>
                    {featuredMap?.likesPercentage ?? 0}%
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Play size={16} />
                  <span style={{ fontWeight: 800 }}>
                    {formatViews(featuredMap?.views ?? 0)}
                  </span>
                </span>
              </div>
              */}
                  {featuredMap?.previews && (
                    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                      {featuredMap.previews.map((bg, i) => (
                        <div
                          key={i}
                          style={{
                            width: 80,
                            height: 56,
                            borderRadius: 10,
                            background: bg,
                            border: "1px solid var(--border)",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
                {/* Bottom-right hero action area currently unused (nút > đã xoá theo yêu cầu) */}
              </div>
            </div>
          </motion.div>

          {/* Tabs + Filter */}
          <motion.div
            style={card()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                {tabs
                  .filter((tab) => tab.id !== "favorites") // Temporarily hide Favorites tab
                  .map((tab) => (
                    <motion.button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: activeTab === tab.id ? "var(--primary)" : "transparent",
                        color: activeTab === tab.id ? "var(--on-primary, #0b1020)" : "var(--text)",
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {t(tab.labelKey)}
                    </motion.button>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setShowSearch(!showSearch)}
                style={iconBtn}
                aria-label={t("searchFilter")}
              >
                <Search size={20} />
              </button>
            </div>
            {showSearch && (
              <div style={{ marginTop: 12 }}>
                <input
                  type="search"
                  placeholder={t("searchMapPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: 14,
                  }}
                />
              </div>
            )}
          </motion.div>

          {/* Map grid */}
          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 16,
            }}
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.04 } },
              hidden: {},
            }}
          >
            {listMaps.map((map) => (
              <MapCard
                key={map.id}
                map={map}
                tagStyles={TAG_STYLES}
                onClick={() => goToMapDetail(map.id)}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function MapCard({
  map,
  tagStyles,
  onClick,
}: {
  map: MapItem;
  tagStyles: Record<MapTag["color"], React.CSSProperties>;
  onClick?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      variants={cardVariants}
      style={{ ...card(), padding: 0, overflow: "hidden", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={{ position: "relative" }}>
        <div
          style={{
            height: 160,
            background: map.thumbnail.startsWith("linear")
              ? map.thumbnail
              : `url(${map.thumbnail}) center/cover`,
            borderRadius: "16px 16px 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            right: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {map.categoryTags.map((t) => (
            <span
              key={t.label}
              style={{ ...pillTag(), ...tagStyles[t.color], fontSize: 11, padding: "4px 8px" }}
            >
              {t.label}
            </span>
          ))}
          {map.modeTags.map((t) => (
            <span
              key={t.label}
              style={{ ...pillTag(), ...tagStyles[t.color], fontSize: 11, padding: "4px 8px" }}
            >
              {t.label}
            </span>
          ))}
        </div>
        {/* Hidden: card favorite button */}
        {/*
        <button
          type="button"
          onClick={onToggleFavorite}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            ...iconBtn,
            color: isFavorited ? "#facc15" : "var(--muted)",
          }}
          aria-label={isFavorited ? "Remove favorite" : "Add favorite"}
        >
          <Star size={18} fill={isFavorited ? "currentColor" : "none"} />
        </button>
        */}
      </div>
      <div style={{ padding: 12 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            margin: "0 0 8px 0",
            color: "var(--text)",
            lineHeight: 1.3,
            display: "-webkit-box",
            WebkitLineClamp: 2 as unknown as number,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {map.title}
        </h3>
        {map.learnedTags && map.learnedTags.length > 0 && (
          <p
            style={{
              margin: "0 0 8px 0",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={map.learnedTags.join(", ")}
          >
            {t("youWillLearn")}: {map.learnedTags.slice(0, 3).join(", ")}
          </p>
        )}
        {/* Hidden: card views & likes */}
        {/*
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "var(--muted)",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Play size={12} />
            {formatViews(map.views)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ThumbsUp size={12} />
            {map.likesPercentage}%
          </span>
        </div>
        */}
      </div>
    </motion.div>
  );
}

function card(): React.CSSProperties {
  return {
    background: "var(--elevated, var(--surface))",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
  };
}

function pillTag(): React.CSSProperties {
  return {
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };
}

const navBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
