import { useEffect, useRef, useState } from "react";
import { TilesetLoader, TilesetCache, type TileDefinition } from "../../shared/assets/tilesets";

interface TilePaletteProps {
  selectedTile: number | null;
  onTileSelect: (tileId: number | null) => void;
  tilesetName?: string;
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
  tilesetName = "default",
}: TilePaletteProps) {
  const [tileset, setTileset] = useState<Record<number, TileDefinition> | null>(null);
  const [tileImages, setTileImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const tilesetLoaderRef = useRef(new TilesetLoader());
  const tilesetCacheRef = useRef(new TilesetCache());

  /**
   * Load tileset on mount
   */
  useEffect(() => {
    async function loadTileset() {
      try {
        const tilesetDef = await tilesetLoaderRef.current.loadTilesetDefinition(tilesetName);
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

        setTileImages(images);
      } catch (error) {
        console.error("Failed to load tileset:", error);
      }
    }

    loadTileset();
  }, [tilesetName]);

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
    ctx.clearRect(0, 0, 48, 48);

    // Draw background for tile 0 (empty)
    if (tileId === 0) {
      // Checkered pattern for empty tile
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(0, 0, 24, 24);
      ctx.fillRect(24, 24, 24, 24);
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
      48,
      48, // Destination (48x48 preview)
    );
  }, [tileId, tileDef, image]);

  return (
    <button
      style={{
        ...styles.tileButton,
        border: isSelected ? "3px solid #0066ff" : "2px solid #ccc",
      }}
      onClick={onSelect}
      title={`Tile ${tileId}`}
    >
      <canvas ref={canvasRef} width={48} height={48} style={styles.tileCanvas} />
      <span style={styles.tileId}>{tileId}</span>
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  palette: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
    gap: "8px",
    padding: "8px",
    maxHeight: "300px",
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
    padding: "6px",
    background: "#fff",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  tileCanvas: {
    width: "48px",
    height: "48px",
    imageRendering: "pixelated",
    display: "block",
  },
  tileId: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#333",
  },
};
