// src/portals/learner/pages/MarketplacePage.tsx
import { useState, useMemo } from "react";
import { ThumbsUp, Play, Star, Search, ChevronLeft, ChevronRight } from "lucide-react";

type MapTag = { label: string; color: "orange" | "yellow" | "blue" | "purple" | "green" };

type MapItem = {
  id: string;
  title: string;
  thumbnail: string; // url or placeholder
  categoryTags: MapTag[];
  modeTags: MapTag[];
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

// Mock: famous, trending, random (we shuffle for "random")
const MOCK_MAPS: MapItem[] = [
  {
    id: "feat-1",
    title: "ODD ONE OUT!",
    thumbnail: "linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #1a2f4a 100%)",
    categoryTags: [{ label: "Hành Động Phiêu Lưu", color: "orange" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 125000,
    likesPercentage: 87.5,
    isFavorited: false,
    previews: ["#2d5a87", "#3d6a97", "#1a2f4a"],
  },
  {
    id: "1",
    title: "Combat Challenge",
    thumbnail: "linear-gradient(135deg, #374151 0%, #4b5563 100%)",
    categoryTags: [{ label: "Thi Đấu Sinh Tồn", color: "blue" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 37900,
    likesPercentage: 63.3,
    isFavorited: false,
  },
  {
    id: "2",
    title: "Misty Mountains",
    thumbnail: "linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%)",
    categoryTags: [{ label: "Hành Động Phiêu Lưu", color: "orange" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 30200,
    likesPercentage: 93.7,
    isFavorited: true,
  },
  {
    id: "3",
    title: "Mô Phỏng Lốc Xoáy",
    thumbnail: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
    categoryTags: [{ label: "Vui Chơi Hội Nhóm", color: "purple" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 73100,
    likesPercentage: 90.3,
    isFavorited: false,
  },
  {
    id: "4",
    title: "Blade Soccer",
    thumbnail: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    categoryTags: [{ label: "Thi Đấu Nhiều Người", color: "blue" }],
    modeTags: [],
    views: 27900,
    likesPercentage: 71.9,
    isFavorited: false,
  },
  {
    id: "5",
    title: "Escape The Killer HOSPITAL UPDATE",
    thumbnail: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)",
    categoryTags: [{ label: "Thi Đấu Không Đối Xứng", color: "purple" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 20700,
    likesPercentage: 81.2,
    isFavorited: false,
  },
  {
    id: "6",
    title: "FALLING FLOORS",
    thumbnail: "linear-gradient(135deg, #0c4a6e 0%, #0369a1 100%)",
    categoryTags: [{ label: "Vui Chơi Hội Nhóm", color: "purple" }],
    modeTags: [],
    views: 22200,
    likesPercentage: 89.1,
    isFavorited: false,
  },
  {
    id: "7",
    title: "Mô Phỏng Kinh Doanh",
    thumbnail: "linear-gradient(135deg, #422006 0%, #713f12 100%)",
    categoryTags: [{ label: "Mô Phỏng Kinh Doanh", color: "green" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 7606,
    likesPercentage: 85.1,
    isFavorited: false,
  },
  {
    id: "8",
    title: "Rebuild Fairytown",
    thumbnail: "linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)",
    categoryTags: [{ label: "Mô Phỏng Kinh Doanh", color: "green" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 18500,
    likesPercentage: 96.6,
    isFavorited: true,
  },
  {
    id: "9",
    title: "Abyss Corridor",
    thumbnail: "linear-gradient(135deg, #312e81 0%, #4338ca 100%)",
    categoryTags: [{ label: "Roguelike", color: "purple" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 42100,
    likesPercentage: 88.2,
    isFavorited: false,
  },
  {
    id: "10",
    title: "Merge Tower Defense",
    thumbnail: "linear-gradient(135deg, #14532d 0%, #166534 100%)",
    categoryTags: [{ label: "Kinh Điển", color: "blue" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 33800,
    likesPercentage: 91.4,
    isFavorited: false,
  },
  {
    id: "11",
    title: "Wave Warriors",
    thumbnail: "linear-gradient(135deg, #581c87 0%, #7e22ce 100%)",
    categoryTags: [{ label: "Thi Đấu Sinh Tồn", color: "blue" }],
    modeTags: [],
    views: 25600,
    likesPercentage: 78.5,
    isFavorited: false,
  },
  {
    id: "12",
    title: "Ghost Castle",
    thumbnail: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
    categoryTags: [{ label: "Hành Động Phiêu Lưu", color: "orange" }],
    modeTags: [{ label: "Hỗ Trợ Chơi Đơn", color: "yellow" }],
    views: 19200,
    likesPercentage: 82.0,
    isFavorited: false,
  },
  {
    id: "13",
    title: "Fire Beat Sword",
    thumbnail: "linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)",
    categoryTags: [{ label: "Thi Đấu Nhiều Người", color: "blue" }],
    modeTags: [{ label: "Hợp Tác", color: "green" }],
    views: 44500,
    likesPercentage: 86.3,
    isFavorited: true,
  },
];

// Thứ tự xáo trộn cố định cho tab "Ngẫu Nhiên" (mock)
const MOCK_MAPS_RANDOM: MapItem[] = [
  MOCK_MAPS[5],
  MOCK_MAPS[2],
  MOCK_MAPS[8],
  MOCK_MAPS[0],
  MOCK_MAPS[11],
  MOCK_MAPS[3],
  MOCK_MAPS[12],
  MOCK_MAPS[6],
  MOCK_MAPS[4],
  MOCK_MAPS[9],
  MOCK_MAPS[1],
  MOCK_MAPS[7],
];

type TabId = "famous" | "trending" | "random";

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<TabId>("trending");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(
    () => new Set(MOCK_MAPS.filter((m) => m.isFavorited).map((m) => m.id)),
  );
  const [showSearch, setShowSearch] = useState(false);

  const tabs: { id: TabId; label: string }[] = [
    { id: "famous", label: "Kiệt Tác Nổi Bật" },
    { id: "trending", label: "Thịnh Hành Trong Tháng" },
    { id: "random", label: "Ngẫu Nhiên" },
  ];

  const listMaps = useMemo(() => {
    if (activeTab === "famous") {
      return [...MOCK_MAPS].sort((a, b) => b.likesPercentage - a.likesPercentage).slice(0, 12);
    }
    if (activeTab === "trending") {
      return [...MOCK_MAPS].sort((a, b) => b.views - a.views).slice(0, 12);
    }
    return [...MOCK_MAPS_RANDOM].slice(0, 12);
  }, [activeTab]);

  const featuredMap = MOCK_MAPS[featuredIndex % MOCK_MAPS.length];
  const isFeaturedFav = favorites.has(featuredMap.id);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatViews = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1).replace(".", ",")}k`;
    return v.toLocaleString();
  };

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
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                minHeight: 280,
                background: featuredMap.thumbnail.startsWith("linear")
                  ? featuredMap.thumbnail
                  : `url(${featuredMap.thumbnail}) center/cover`,
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
                  onClick={() => setFeaturedIndex((i) => Math.max(0, i - 1))}
                  style={navBtn}
                  aria-label="Previous"
                >
                  <ChevronLeft size={20} />
                </button>
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>A</span>
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
                <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>D</span>
                <button
                  type="button"
                  onClick={() => setFeaturedIndex((i) => i + 1)}
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
                {featuredMap.title}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {featuredMap.categoryTags.map((t) => (
                  <span key={t.label} style={{ ...pillTag(), ...TAG_STYLES[t.color] }}>
                    {t.label}
                  </span>
                ))}
                {featuredMap.modeTags.map((t) => (
                  <span key={t.label} style={{ ...pillTag(), ...TAG_STYLES[t.color] }}>
                    {t.label}
                  </span>
                ))}
              </div>
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
                  <span style={{ fontWeight: 800 }}>{featuredMap.likesPercentage}%</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Play size={16} />
                  <span style={{ fontWeight: 800 }}>{formatViews(featuredMap.views)}</span>
                </span>
              </div>
              {featuredMap.previews && (
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => toggleFavorite(featuredMap.id)}
                style={{ ...iconBtn, color: isFeaturedFav ? "#facc15" : "var(--muted)" }}
                aria-label={isFeaturedFav ? "Bỏ thích" : "Thích"}
              >
                <Star size={22} fill={isFeaturedFav ? "currentColor" : "none"} />
              </button>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--on-primary, #0b1020)",
                }}
              >
                <ChevronRight size={24} />
              </div>
            </div>
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
            {tabs.map((tab) => (
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
            aria-label="Tìm kiếm / Lọc"
          >
            <Search size={20} />
          </button>
        </div>
        {showSearch && (
          <div style={{ marginTop: 12 }}>
            <input
              type="search"
              placeholder="Tìm map..."
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
            isFavorited={favorites.has(map.id)}
            onToggleFavorite={() => toggleFavorite(map.id)}
            formatViews={formatViews}
            tagStyles={TAG_STYLES}
          />
        ))}
      </div>
    </div>
  );
}

function MapCard({
  map,
  isFavorited,
  onToggleFavorite,
  formatViews,
  tagStyles,
}: {
  map: MapItem;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  formatViews: (v: number) => string;
  tagStyles: Record<MapTag["color"], React.CSSProperties>;
}) {
  return (
    <div style={{ ...card(), padding: 0, overflow: "hidden" }}>
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
          aria-label={isFavorited ? "Bỏ thích" : "Thích"}
        >
          <Star size={18} fill={isFavorited ? "currentColor" : "none"} />
        </button>
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
