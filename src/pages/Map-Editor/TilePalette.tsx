import { useEffect, useMemo, useRef, useState } from "react";
import { Lock } from "lucide-react";
import {
  TilesetLoader,
  TilesetCache,
  type TileDefinition,
  type TieredTilesetGroup,
} from "../../modules/engine/assets";
import snakeTilesetRaw from "../../shared/assets/platformer/snake/tilesets/default.json";
import type { MapData } from "../../shared/types/MapSchema";
import type { GameType } from "../../shared/types/GameType";
import type { AssetTier, SubscriptionPlan } from "@/lib/auth/subscriptionPlan";

const LOCKED_TOOLTIP = "Upgrade to Creator to use this asset";

const readCssVar = (name: string, fallback: string): string => {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

interface TilePaletteProps {
  selectedTile: number | null;
  onTileSelect: (tileId: number | null) => void;
  mapData: MapData;
  userPlan: SubscriptionPlan;
  tilesetName?: string;
  filterGroup: string;
  currentLang: "en" | "vi";
  onGroupsLoaded?: (groups: string[]) => void;
}

export type ExtendedTileDefinition = TileDefinition & {
  "group_EN"?: string;
  "group_VI"?: string;
  "name_EN"?: string;
  "name_VI"?: string;
};

type PaletteTileEntry = {
  tileId: number;
  tileDef: ExtendedTileDefinition;
  tier: AssetTier;
  locked: boolean;
  key: string;
};

type SnakeTilesetConfig = {
  tiles?: Record<string, TileDefinition>;
};

function mapTypeToGameType(mapType: "platform" | "topdown" | "snake"): GameType {
  return mapType === "topdown" ? "topdown" : "platformer";
}

export function TilePalette({
  selectedTile,
  onTileSelect,
  mapData,
  userPlan,
  tilesetName = "default",
  filterGroup = "all",
  currentLang,
  onGroupsLoaded,
}: TilePaletteProps) {
  const [tilesetGroups, setTilesetGroups] = useState<TieredTilesetGroup[]>([]);
  const [tileImages, setTileImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const gameType = mapTypeToGameType(mapData.config.type);
  const tilesetCacheRef = useRef(new TilesetCache());

  useEffect(() => {
    let cancelled = false;

    async function loadTileset() {
      try {
        let tieredTilesets: TieredTilesetGroup[];

        if (mapData.config.type === "snake") {
          const snakeTilesRaw = (snakeTilesetRaw as SnakeTilesetConfig).tiles ?? {};
          const snakeTileset: Record<number, TileDefinition> = {};
          for (const [id, tileDef] of Object.entries(snakeTilesRaw)) {
            const tileId = Number.parseInt(id, 10);
            if (!Number.isNaN(tileId)) {
              snakeTileset[tileId] = tileDef;
            }
          }
          tieredTilesets = [{ tier: "basic", locked: false, tileset: snakeTileset }];
        } else {
          const tilesetLoader = new TilesetLoader(gameType);
          tieredTilesets = await tilesetLoader.loadTieredTilesetDefinitions(tilesetName, userPlan);
        }

        if (cancelled) return;
        setTilesetGroups(tieredTilesets);

        const imagePathsSet = new Set<string>();
        for (const group of tieredTilesets) {
          for (const tileDef of Object.values(group.tileset)) {
            imagePathsSet.add(tileDef.imagePath);
          }
        }

        const images = new Map<string, HTMLImageElement>();
        await Promise.all(
          Array.from(imagePathsSet).map(async (path) => {
            const img = await tilesetCacheRef.current.loadTileset(path);
            images.set(path, img);
          }),
        );

        if (cancelled) return;
        setTileImages(images);
      } catch (error) {
        console.error("Failed to load tileset:", error);
      }
    }

    loadTileset();

    return () => {
      cancelled = true;
    };
  }, [tilesetName, gameType, mapData.config.type, userPlan]);

  useEffect(() => {
    if (selectedTile === null) {
      return;
    }

    const selectedVariants = tilesetGroups.flatMap((group) => {
      const tileDef = group.tileset[selectedTile];
      if (!tileDef) {
        return [];
      }
      return [{ locked: group.locked }];
    });

    if (selectedVariants.length === 0) {
      onTileSelect(null);
      return;
    }

    const hasUnlockedVariant = selectedVariants.some((variant) => !variant.locked);
    if (!hasUnlockedVariant) {
      onTileSelect(null);
    }
  }, [selectedTile, tilesetGroups, onTileSelect]);

  useEffect(() => {
    if (!tilesetGroups.length || !onGroupsLoaded) return;

    const groups = new Set<string>();
    const langKey = currentLang.toUpperCase();
    const groupKey = `group_${langKey}` as keyof ExtendedTileDefinition;
    const otherLabel = currentLang === "vi" ? "Khac" : "Other";

    tilesetGroups.forEach((group) => {
      Object.values(group.tileset).forEach((tileDef) => {
        const tile = tileDef as ExtendedTileDefinition;
        const groupName = tile[groupKey] || tile["group_EN"] || otherLabel;
        if (typeof groupName === "string") {
          groups.add(groupName);
        }
      });
    });

    onGroupsLoaded(Array.from(groups).sort());
  }, [tilesetGroups, currentLang, onGroupsLoaded]);

  const filteredTilesData = useMemo<PaletteTileEntry[]>(() => {
    if (!tilesetGroups.length) return [];

    const langKey = currentLang.toUpperCase();
    const groupKey = `group_${langKey}` as keyof ExtendedTileDefinition;
    const otherLabel = currentLang === "vi" ? "Khac" : "Other";

    const entries = tilesetGroups.flatMap((group) => {
      return Object.entries(group.tileset).map(([idStr, tileDef]) => {
        const tileId = parseInt(idStr, 10);
        return {
          tileId,
          tileDef: tileDef as ExtendedTileDefinition,
          tier: group.tier,
          locked: group.locked,
          key: `${group.tier}-${idStr}`,
        };
      });
    });

    if (filterGroup === "all") {
      return entries;
    }

    return entries.filter((entry) => {
      const tileGroup = entry.tileDef[groupKey] || entry.tileDef["group_EN"] || otherLabel;
      return tileGroup === filterGroup;
    });
  }, [tilesetGroups, filterGroup, currentLang]);

  if (!tilesetGroups.length) {
    return (
      <div style={styles.loading}>
        <p>Loading tileset...</p>
      </div>
    );
  }

  return (
    <div style={styles.palette}>
      {filteredTilesData.map((entry) => {
        const { tileId, tileDef, tier, locked, key } = entry;

        return (
          <TilePreview
            key={key}
            tileId={tileId}
            tileDef={tileDef}
            tier={tier}
            locked={locked}
            image={tileImages.get(tileDef.imagePath)}
            isSelected={selectedTile === tileId}
            onSelect={() => {
              if (locked) return;
              onTileSelect(selectedTile === tileId ? null : tileId);
            }}
          />
        );
      })}
    </div>
  );
}

interface TilePreviewProps {
  tileId: number;
  tileDef: TileDefinition;
  tier: AssetTier;
  locked: boolean;
  image: HTMLImageElement | undefined;
  isSelected: boolean;
  onSelect: () => void;
}

function TilePreview({ tileId, tileDef, tier, locked, image, isSelected, onSelect }: TilePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 56, 56);

    if (tileId === 0) {
      ctx.fillStyle = readCssVar("--surface-2", "#1f2937");
      ctx.fillRect(0, 0, 56, 56);
      ctx.fillStyle = readCssVar("--border", "#334155");
      ctx.fillRect(0, 0, 28, 28);
      ctx.fillRect(28, 28, 28, 28);
      return;
    }

    const sx = tileDef.tileX * tileDef.tileSize;
    const sy = tileDef.tileY * tileDef.tileSize;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sx, sy, tileDef.tileSize, tileDef.tileSize, 0, 0, 56, 56);
  }, [tileId, tileDef, image]);

  return (
    <button
      disabled={locked}
      style={{
        ...styles.tileButton,
        border: isSelected ? "3px solid var(--primary)" : "2px solid var(--border)",
        background: isSelected
          ? "linear-gradient(180deg, color-mix(in srgb, var(--primary) 20%, var(--surface)), var(--surface-2))"
          : styles.tileButton.background,
        opacity: locked ? 0.58 : 1,
        filter: locked ? "grayscale(0.85)" : "none",
        cursor: locked ? "not-allowed" : "pointer",
        boxShadow: isSelected
          ? "0 8px 16px color-mix(in srgb, var(--primary) 30%, transparent)"
          : "0 2px 8px color-mix(in srgb, var(--bg) 28%, transparent)",
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        if (locked) return;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow =
          "0 8px 16px color-mix(in srgb, var(--bg) 45%, transparent)";
      }}
      onMouseLeave={(e) => {
        if (locked) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isSelected
          ? "0 8px 16px color-mix(in srgb, var(--primary) 30%, transparent)"
          : "0 2px 8px color-mix(in srgb, var(--bg) 28%, transparent)";
      }}
      title={locked ? LOCKED_TOOLTIP : `Tile ${tileId}`}
    >
      <span style={styles.tierBadge}>{tier}</span>
      {locked && (
        <span style={styles.lockBadge} aria-hidden>
          <Lock size={12} />
        </span>
      )}
      <canvas ref={canvasRef} width={56} height={56} style={styles.tileCanvas} />
      <span style={styles.tileId}>{tileId}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  palette: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(82px, 1fr))",
    gap: "10px",
    padding: "6px",
    maxHeight: "340px",
    overflowY: "auto",
  },
  loading: {
    padding: "16px",
    textAlign: "center",
    color: "var(--text-2)",
  },
  tileButton: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "8px",
    background: "linear-gradient(180deg, var(--surface), var(--surface-2))",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px color-mix(in srgb, var(--bg) 28%, transparent)",
  },
  tileCanvas: {
    width: "56px",
    height: "56px",
    imageRendering: "pixelated",
    display: "block",
    borderRadius: "6px",
    border: "1px solid var(--border)",
  },
  tileId: {
    fontSize: "11px",
    fontWeight: "500",
    color: "var(--text-2)",
  },
  tierBadge: {
    position: "absolute",
    left: "6px",
    top: "6px",
    padding: "2px 6px",
    fontSize: "10px",
    fontWeight: 700,
    borderRadius: "999px",
    background: "color-mix(in srgb, var(--surface-2) 70%, transparent)",
    color: "var(--text-2)",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  lockBadge: {
    position: "absolute",
    right: "6px",
    top: "6px",
    width: "18px",
    height: "18px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "color-mix(in srgb, var(--bg) 70%, transparent)",
    color: "#ffffff",
  },
};
