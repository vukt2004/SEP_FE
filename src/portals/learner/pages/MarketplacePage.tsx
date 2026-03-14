// src/portals/learner/pages/MarketplacePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { learnerMapsApi } from "@/services/api/learner/maps.api";
import type { Map as ApiMap } from "@/types/api/learner/maps";

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

  const difficultyTag: MapTag = {
    label: `Difficulty ${apiMap.difficulty}`,
    color: apiMap.difficulty <= 2 ? "green" : apiMap.difficulty <= 5 ? "yellow" : "purple",
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
  };
}

type TabId = "trending" | "random" | "favorites";

export default function MarketplacePage() {
  const navigate = useNavigate();
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
          mapStatus: 4, // chỉ lấy map Published cho catalog
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
          setError(response.data.message || "Cannot load map list");
        }
      } catch (err) {
        console.error("Failed to load marketplace maps:", err);
        setError("An error occurred while loading map list");
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
          mapStatus: 4,
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

  const tabs: { id: TabId; label: string }[] = [
    { id: "trending", label: "Trending" },
    { id: "favorites", label: "Favorites" },
    { id: "random", label: "Random" },
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
      <div style={{ padding: 24 }}>
        <div style={{ color: "var(--text-2)" }}>Loading map list...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "var(--danger)" }}>{error}</div>
      </div>
    );
  }

  if (!loading && maps.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "var(--text-2)" }}>No maps have been published.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Featured / Hero */}
      <div style={card()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 24,
            alignItems: "stretch",
            minHeight: 320,
          }}
        >
          <div
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeaturedIndex((i) => Math.max(0, i - 1));
                  }}
                  style={navBtn}
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeaturedIndex((i) => i + 1);
                  }}
                  style={navBtn}
                  aria-label="Next"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
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
      </div>

      {/* Tabs + Filter */}
      <div style={card()}>
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
                <button
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
                >
                  {tab.label}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={() => setShowSearch(!showSearch)}
            style={iconBtn}
            aria-label="Search / Filter"
          >
            <Search size={20} />
          </button>
        </div>
        {showSearch && (
          <div style={{ marginTop: 12 }}>
            <input
              type="search"
              placeholder="Search map by name or description..."
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
      </div>

      {/* Map grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
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
      </div>
    </div>
  );
}

function MapCard({
  map,
  tagStyles,
  onClick,
}: {
  map: MapItem;
  tagStyles: Record<MapTag["color"], React.CSSProperties>;
  onClick?: () => void;
}) {
  return (
    <div
      style={{ ...card(), padding: 0, overflow: "hidden", cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
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
    </div>
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
