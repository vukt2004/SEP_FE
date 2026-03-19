import { useEffect, useRef, useState } from "react";
import { TilesetLoader, TilesetCache, type TileDefinition } from "../../modules/engine/assets";
import type { MapData } from "../../shared/types/MapSchema";
import type { GameType } from "../../shared/types/GameType";

interface TilePaletteProps {
  selectedTile: number | null;
  onTileSelect: (tileId: number | null) => void;
  mapData: MapData;
  tilesetName?: string;
}

/**
 * Convert MapData config type to GameType
 */
function mapTypeToGameType(mapType: "platform" | "topdown"): GameType {
  return mapType === "platform" ? "platformer" : "topdown";
}

/**
 * TilePalette Component
 *
 * Displays a visual palette of available tiles from the tileset.
 * Each tile is rendered as a preview using the actual sprite.
 */
export function TilePalette({
  selectedTile,
  onTileSelect,
  mapData,
  tilesetName = "default",
}: TilePaletteProps) {
  const [tileset, setTileset] = useState<Record<number, TileDefinition> | null>(null);
  const [tileImages, setTileImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const gameType = mapTypeToGameType(mapData.config.type);
  const tilesetCacheRef = useRef(new TilesetCache());

  /**
   * Load tileset on mount or when game type/tileset name changes
   */
  useEffect(() => {
    let cancelled = false;

    async function loadTileset() {
      try {
        // Create loader with current game type
        const tilesetLoader = new TilesetLoader(gameType);
        const tilesetDef = await tilesetLoader.loadTilesetDefinition(tilesetName);

        if (cancelled) return;
        setTileset(tilesetDef);

        // Load all unique tileset images
        const imagePathsSet = new Set<string>();
        for (const tileDef of Object.values(tilesetDef)) {
          imagePathsSet.add(tileDef.imagePath);
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
  }, [tilesetName, gameType]);

  if (!tileset) {
    return (
      <div style={styles.loading}>
        <p>Loading tileset...</p>
      </div>
    );
  }

  // Get sorted tile IDs
  const tileIds = Object.keys(tileset)
    .map((id) => parseInt(id, 10))
    .sort((a, b) => a - b);

  return (
    <div style={styles.palette}>
      {tileIds.map((tileId) => (
        <TilePreview
          key={tileId}
          tileId={tileId}
          tileDef={tileset[tileId]}
          image={tileImages.get(tileset[tileId].imagePath)}
          isSelected={selectedTile === tileId}
          onSelect={() => onTileSelect(selectedTile === tileId ? null : tileId)}
        />
      ))}
    </div>
  );
}

interface TilePreviewProps {
  tileId: number;
  tileDef: TileDefinition;
  image: HTMLImageElement | undefined;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * Individual tile preview button
 */
function TilePreview({ tileId, tileDef, image, isSelected, onSelect }: TilePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, 56, 56);

    // Draw background for tile 0 (empty)
    if (tileId === 0) {
      // Checkered pattern for empty tile
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, 56, 56);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(0, 0, 28, 28);
      ctx.fillRect(28, 28, 28, 28);
      return;
    }

    // Draw the tile sprite
    const sx = tileDef.tileX * tileDef.tileSize;
    const sy = tileDef.tileY * tileDef.tileSize;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      image,
      sx,
      sy,
      tileDef.tileSize,
      tileDef.tileSize, // Source
      0,
      0,
      56,
      56, // Destination (56x56 preview)
    );
  }, [tileId, tileDef, image]);

  return (
    <button
      style={{
        ...styles.tileButton,
        border: isSelected ? "3px solid #0066ff" : "2px solid #ccc",
        background: isSelected
          ? "linear-gradient(180deg, #eff6ff, #dbeafe)"
          : styles.tileButton.background,
        boxShadow: isSelected
          ? "0 8px 16px rgba(37, 99, 235, 0.25)"
          : "0 2px 8px rgba(15, 23, 42, 0.08)",
      }}
      onClick={onSelect}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(15, 23, 42, 0.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = isSelected
          ? "0 8px 16px rgba(37, 99, 235, 0.25)"
          : "0 2px 8px rgba(15, 23, 42, 0.08)";
      }}
      title={`Tile ${tileId}`}
    >
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
    color: "#666",
  },
  tileButton: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "8px",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
  },
  tileCanvas: {
    width: "56px",
    height: "56px",
    imageRendering: "pixelated",
    display: "block",
    borderRadius: "6px",
    border: "1px solid #e2e8f0",
  },
  tileId: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#334155",
  },
};
