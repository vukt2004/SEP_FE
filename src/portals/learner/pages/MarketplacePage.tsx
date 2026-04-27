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
import { getConceptLabel } from "@/lib/maps/conceptLabels";
import type { LocaleId } from "@/lib/i18n/translations";
import { ROUTES } from "@/lib/constants/routes";
import styles from "./MarketplacePage.module.css";

type MapTag = { label: string; color: "orange" | "yellow" | "blue" | "purple" | "green" | "red" };

type MapItem = {
  id: string;
  title: string;
  thumbnail: string; // url or placeholder
  difficulty: number;
  categoryTags: MapTag[];
  modeTags: MapTag[];
  description?: string;
  views: number; // e.g. 37900
  likesPercentage: number; // e.g. 63.3
  isFavorited: boolean;
  previews?: string[]; // for featured carousel
  learnedTags?: string[];
  price: number; // in OC (game currency)
  prerequisiteTags?: string[]; // required knowledge / prerequisites
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
  red: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    borderColor: "rgba(239, 68, 68, 0.45)",
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
    color: tier === "easy" ? "green" : tier === "medium" ? "yellow" : "red",
  };

  const categoryTags: MapTag[] = [typeTag, difficultyTag];

  // Extract prerequisite tags (concepts) - exclude difficulty-related tags
  const DIFFICULTY_TAG_NAMES = new Set(
    ["beginner", "easy", "medium", "hard", "expert"].map((s) => s.toLowerCase()),
  );
  const prerequisiteTags = apiMap.tagNames
    .filter((tag) => !DIFFICULTY_TAG_NAMES.has(tag.trim().toLowerCase()))
    .slice(0, 3);

  const modeTags: MapTag[] = apiMap.tagNames.slice(0, 2).map((tag) => ({
    label: tag,
    color: "yellow",
  }));

  const baseViews = 1200 + index * 530;
  const likes = 70 + ((index * 7) % 25);

  const avatarUrl =
    (apiMap as ApiMap & { AvatarUrl?: string | null }).avatarUrl ??
    (apiMap as ApiMap & { AvatarUrl?: string | null }).AvatarUrl;
  const galleryPreviewUrl =
    apiMap.gallery?.find((item) => item.kind !== "Video")?.url?.trim() ??
    apiMap.gallery?.[0]?.url?.trim() ??
    null;
  const thumbnail =
    avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim() !== ""
      ? avatarUrl.trim()
      : galleryPreviewUrl && galleryPreviewUrl.trim() !== ""
        ? galleryPreviewUrl.trim()
        : thumbnailPalettes[paletteIndex];

  return {
    id: apiMap.id,
    title: apiMap.title,
    thumbnail,
    difficulty: apiMap.difficulty,
    description: apiMap.description,
    categoryTags,
    modeTags,
    views: baseViews,
    likesPercentage: Math.min(likes, 99),
    isFavorited: false,
    learnedTags: extractLearnedTags(apiMap),
    price: apiMap.price,
    prerequisiteTags: prerequisiteTags.length > 0 ? prerequisiteTags : undefined,
  };
}

type SortOption = "CreatedAt" | "Title" | "Difficulty" | "TimeLimitMs";

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const [maps, setMaps] = useState<MapItem[]>([]);
  const [heroMaps, setHeroMaps] = useState<MapItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("CreatedAt");
  const [sortAscending, setSortAscending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 12;

  // Debounce search term: only update after user stops typing for 400ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const loadMaps = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await learnerMapsApi.getMaps({
          pageNumber: currentPage,
          pageSize: PAGE_SIZE,
          mapStatus: "Published",
          difficulty: difficultyFilter !== "all" ? Number(difficultyFilter) : undefined,
          type: typeFilter !== "all" ? Number(typeFilter) : undefined,
          search: debouncedSearchTerm || undefined,
          sortBy: sortBy,
          sortAscending: sortAscending,
        });

        if (response.data.isSuccess && response.data.data) {
          const { items, totalPages: apiTotalPages } = response.data.data;

          const visibleItems = (items as (ApiMap & { isAuthor?: boolean })[]).filter(
            (m) => !m.isAuthor,
          );

          const mapped = visibleItems.map((apiMap, idx) =>
            mapApiMapToUiMap(apiMap as ApiMap, (currentPage - 1) * PAGE_SIZE + idx),
          );
          setMaps(mapped);
          setTotalPages(apiTotalPages);
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
  }, [currentPage, difficultyFilter, typeFilter, debouncedSearchTerm, sortBy, sortAscending, t]);

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

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Build visible page numbers with ellipsis
  const getPageNumbers = (): (number | "...")[] => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const listMaps = useMemo(() => {
    return maps;
  }, [maps]);

  // Hero hiển thị tối đa 10 map, lấy từ nguồn hero riêng; nếu lỗi thì fallback slice từ maps
  const heroSource = heroMaps.length > 0 ? heroMaps : maps.slice(0, 10);
  const featuredMap =
    heroSource.length > 0 ? heroSource[0] : undefined;

  const goToMapDetail = (mapId: string) => {
    navigate(ROUTES.LEARNER_MAP_DETAIL.replace(":id", mapId));
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

  if (!loading && maps.length === 0 && !debouncedSearchTerm) {
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
                    justifyContent: "center",
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--muted)",
                          opacity: 0.4,
                        }}
                      />
                    ))}
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
                  
                  {/* Price */}
                  <p
                    style={{
                      margin: "12px 0 8px 0",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    {featuredMap?.price && featuredMap.price > 0 
                      ? `${featuredMap.price.toLocaleString()} OC` 
                      : t("free") || "Miễn phí"}
                  </p>

                  {/* Prerequisite knowledge */}
                  {featuredMap?.prerequisiteTags && featuredMap.prerequisiteTags.length > 0 && (
                    <p
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-2)",
                      }}
                    >
                      <strong>{t("prerequisiteKnowledge")}:</strong>{" "}
                      {featuredMap.prerequisiteTags
                        .slice(0, 3)
                        .map((tag) => getConceptLabel(tag, locale))
                        .join(", ")}
                    </p>
                  )}

                  {/* Learned tags */}
                  {featuredMap?.learnedTags && featuredMap.learnedTags.length > 0 && (
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-2)",
                      }}
                    >
                      <strong>{t("youWillLearn")}:</strong>{" "}
                      {featuredMap.learnedTags
                        .slice(0, 3)
                        .map((tag) => getConceptLabel(tag, locale))
                        .join(", ")}
                    </p>
                  )}

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

          {/* Tìm kiếm + bộ lọc (một khối, không để nút icon một mình một hàng) */}
          <motion.div
            className={styles.filterCard}
            style={card()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className={styles.filterCardTitleRow}>
              <Search size={18} className={styles.filterCardTitleIcon} aria-hidden />
              <span>{t("searchFilter")}</span>
            </div>
            <div className={styles.filterGrid}>
              <div className={styles.filterSearchField}>
                <label className={styles.filterFieldLabel} htmlFor="marketplace-search">
                  {t("mapsSearchLabel")}
                </label>
                <div className={styles.searchInputWrap}>
                  <Search size={16} className={styles.searchInputIcon} aria-hidden />
                  <input
                    id="marketplace-search"
                    type="search"
                    className={styles.searchInput}
                    placeholder={t("searchMapPlaceholder")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className={styles.filterFieldCol}>
                <label className={styles.filterFieldLabel} htmlFor="mp-difficulty">
                  {t("difficulty") || "Độ khó"}
                </label>
                <select
                  id="mp-difficulty"
                  className={styles.filterSelect}
                  value={difficultyFilter}
                  onChange={(e) => {
                    setDifficultyFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">{t("all") || "Tất cả"}</option>
                  <option value="1">1/5 - {t("easy") || "Dễ"}</option>
                  <option value="2">2/5 - {t("easy") || "Dễ"}</option>
                  <option value="3">3/5 - {t("medium") || "Trung bình"}</option>
                  <option value="4">4/5 - {t("hard") || "Khó"}</option>
                  <option value="5">5/5 - {t("hard") || "Khó"}</option>
                </select>
              </div>

              <div className={styles.filterFieldCol}>
                <label className={styles.filterFieldLabel} htmlFor="mp-type">
                  {t("type") || "Loại game"}
                </label>
                <select
                  id="mp-type"
                  className={styles.filterSelect}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="all">{t("all") || "Tất cả"}</option>
                  <option value="0">Topdown</option>
                  <option value="1">Platform</option>
                  <option value="2">Snake</option>
                </select>
              </div>

              <div className={styles.filterFieldCol}>
                <label className={styles.filterFieldLabel} htmlFor="mp-sort">
                  {t("sortBy") || "Sắp xếp"}
                </label>
                <select
                  id="mp-sort"
                  className={styles.filterSelect}
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortOption);
                    setCurrentPage(1);
                  }}
                >
                  <option value="CreatedAt">{t("newest") || "Mới nhất"}</option>
                  <option value="Title">{t("title") || "Tiêu đề"}</option>
                  <option value="Difficulty">{t("difficulty") || "Độ khó"}</option>
                  <option value="TimeLimitMs">{t("timeLimit") || "Thời gian"}</option>
                </select>
              </div>

              <div className={styles.filterFieldCol}>
                <span className={styles.filterFieldLabel}>{t("sortOrder") || "Thứ tự"}</span>
                <button
                  type="button"
                  className={styles.sortDirBtn}
                  onClick={() => setSortAscending(!sortAscending)}
                >
                  {sortAscending ? "↑ Asc" : "↓ Desc"}
                </button>
              </div>

              {(difficultyFilter !== "all" || typeFilter !== "all" || searchTerm) && (
                <div className={styles.filterFieldCol}>
                  <span className={styles.filterFieldLabel} aria-hidden>
                    &nbsp;
                  </span>
                  <button
                    type="button"
                    className={styles.clearFiltersBtn}
                    onClick={() => {
                      setSearchTerm("");
                      setDifficultyFilter("all");
                      setTypeFilter("all");
                      setSortBy("CreatedAt");
                      setSortAscending(false);
                      setCurrentPage(1);
                    }}
                  >
                    {t("clearFilters") || "Xóa bộ lọc"}
                  </button>
                </div>
              )}
            </div>
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
            {listMaps.length > 0 ? (
              listMaps.map((map) => (
                <MapCard
                  key={map.id}
                  map={map}
                  locale={locale}
                  onClick={() => goToMapDetail(map.id)}
                />
              ))
            ) : debouncedSearchTerm ? (
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  padding: "60px 20px",
                  color: "var(--muted)",
                }}
              >
                <Search size={40} style={{ opacity: 0.4 }} />
                <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                  {t("noSearchResults") ?? "No results found"}
                </p>
                <p style={{ fontSize: 13, margin: 0, opacity: 0.7 }}>
                  "{debouncedSearchTerm}"
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setDebouncedSearchTerm("");
                  }}
                  style={{
                    marginTop: 8,
                    padding: "8px 20px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--primary)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {t("clearSearch") ?? "Clear search"}
                </button>
              </div>
            ) : null}
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && listMaps.length > 0 && (
            <motion.div
              style={{
                ...card(),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  ...paginationBtn,
                  opacity: currentPage === 1 ? 0.35 : 1,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                }}
                aria-label="Previous page"
              >
                <ChevronLeft size={18} />
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    style={{
                      padding: "6px 4px",
                      color: "var(--muted)",
                      fontSize: 14,
                      fontWeight: 700,
                      userSelect: "none",
                    }}
                  >
                    ···
                  </span>
                ) : (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    style={{
                      ...paginationBtn,
                      background:
                        page === currentPage ? "var(--primary)" : "transparent",
                      color:
                        page === currentPage
                          ? "var(--on-primary, #fff)"
                          : "var(--text)",
                      borderColor:
                        page === currentPage
                          ? "var(--primary)"
                          : "var(--border)",
                      fontWeight: page === currentPage ? 800 : 600,
                    }}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  ...paginationBtn,
                  opacity: currentPage === totalPages ? 0.35 : 1,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                }}
                aria-label="Next page"
              >
                <ChevronRight size={18} />
              </button>
            </motion.div>
          )}
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
  locale,
  onClick,
}: {
  map: MapItem;
  locale: LocaleId;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const tier = getDifficultyTier(map.difficulty);
  const difficultyLabel =
    tier === "easy" ? t("easy") : tier === "medium" ? t("medium") : t("hard");

  return (
    <motion.div
      variants={cardVariants}
      style={{ 
        ...card(), 
        padding: 0, 
        overflow: "hidden", 
        cursor: onClick ? "pointer" : "default",
        display: "flex",
        flexDirection: "column",
      }}
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
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            margin: "0",
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
        {/* Price */}
        <p
          style={{
            margin: "0",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--primary)",
          }}
        >
          {map.price > 0 ? `${map.price.toLocaleString()} OC` : t("free") || "Miễn phí"}
        </p>
        {/* Prerequisite knowledge */}
        {map.prerequisiteTags && map.prerequisiteTags.length > 0 && (
          <p
            style={{
              margin: "0",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={map.prerequisiteTags.join(", ")}
          >
            {t("prerequisiteKnowledge")}:{" "}
            {map.prerequisiteTags
              .slice(0, 2)
              .map((tag) => getConceptLabel(tag, locale))
              .join(", ")}
          </p>
        )}
        {/* Learned tags */}
        {map.learnedTags && map.learnedTags.length > 0 && (
          <p
            style={{
              margin: "0",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={map.learnedTags.join(", ")}
          >
            {t("youWillLearn")}:{" "}
            {map.learnedTags
              .slice(0, 2)
              .map((tag) => getConceptLabel(tag, locale))
              .join(", ")}
          </p>
        )}
        {/* Difficulty tier badge - inside card at bottom */}
        <div
          style={{
            marginTop: "auto",
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${tier === "easy" ? "rgba(34, 197, 94, 0.5)" : tier === "medium" ? "rgba(234, 179, 8, 0.5)" : "rgba(239, 68, 68, 0.55)"}`,
            background:
              tier === "easy"
                ? "rgba(34, 197, 94, 0.2)"
                : tier === "medium"
                  ? "rgba(234, 179, 8, 0.2)"
                  : "rgba(239, 68, 68, 0.2)",
            color: tier === "easy" ? "#4ade80" : tier === "medium" ? "#facc15" : "#f87171",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {difficultyLabel}
        </div>
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

const paginationBtn: React.CSSProperties = {
  minWidth: 38,
  height: 38,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontSize: 14,
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  transition: "all 0.18s ease",
};
