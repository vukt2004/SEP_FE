import { useState, useEffect, useRef } from "react";
import type { MapData } from "../../shared/types/MapSchema";
import { TilePalette } from "./TilePalette";
import {
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
} from "../../shared/assets/objects";

interface MapEditorControlsProps {
  mapData: MapData;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null;
  canUndo: boolean;
  canRedo: boolean;
  onLayerChange: (layer: "background" | "ground" | "foreground" | "collision") => void;
  onTileSelect: (tileId: number | null) => void;
  onToolSelect: (
    tool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null,
  ) => void;
  onResize: (width: number, height: number) => void;
  onReset: (type: "platform" | "topdown", width: number, height: number, tileSize: number) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
}

interface ObjectToolButtonProps {
  objectType: "player" | "goal" | "coin" | "enemy";
  label: string;
  objectDef: ObjectDefinition;
  cache: ObjectSpriteCache;
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null;
  onToolSelect: (
    tool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null,
  ) => void;
}

function ObjectToolButton({
  objectType,
  label,
  objectDef,
  cache,
  selectedTool,
  onToolSelect,
}: ObjectToolButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spriteSheet = cache.getSprite(objectDef.imagePath);
    if (!spriteSheet) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Extract the specific frame from the sprite sheet
    const frameX = objectDef.frameIndex * objectDef.frameWidth;
    const frameY = 0;

    // Draw centered and scaled to fit canvas
    const scale = Math.min(
      canvas.width / objectDef.frameWidth,
      canvas.height / objectDef.frameHeight,
    );
    const scaledWidth = objectDef.frameWidth * scale;
    const scaledHeight = objectDef.frameHeight * scale;
    const offsetX = (canvas.width - scaledWidth) / 2;
    const offsetY = (canvas.height - scaledHeight) / 2;

    ctx.drawImage(
      spriteSheet,
      frameX,
      frameY,
      objectDef.frameWidth,
      objectDef.frameHeight,
      offsetX,
      offsetY,
      scaledWidth,
      scaledHeight,
    );
  }, [objectDef, cache]);

  return (
    <button
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "12px",
        fontSize: "13px",
        fontWeight: "500",
        border: "2px solid #ddd",
        borderRadius: "6px",
        backgroundColor: "white",
        cursor: "pointer",
        transition: "all 0.2s",
        minWidth: "80px",
        ...(selectedTool === objectType
          ? {
              borderColor: "#4CAF50",
              backgroundColor: "#e8f5e9",
              boxShadow: "0 2px 6px rgba(76,175,80,0.3)",
            }
          : {}),
      }}
      onClick={() => onToolSelect(selectedTool === objectType ? null : objectType)}
      title={`${label} (click again to deselect)`}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          border: "1px solid #e0e0e0",
          borderRadius: "4px",
          overflow: "hidden",
          backgroundColor: "#f9f9f9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <canvas
          ref={canvasRef}
          width={48}
          height={48}
          style={{ display: "block", imageRendering: "pixelated" }}
        />
      </div>
      <span style={{ fontSize: "11px", fontWeight: "500", color: "#555" }}>{label}</span>
    </button>
  );
}

export function MapEditorControls({
  mapData,
  activeLayer,
  selectedTile,
  selectedTool,
  canUndo,
  canRedo,
  onLayerChange,
  onTileSelect,
  onToolSelect,
  onResize,
  onReset,
  onExport,
  onImport,
  onUndo,
  onRedo,
}: MapEditorControlsProps) {
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(mapData.config.width);
  const [resizeHeight, setResizeHeight] = useState(mapData.config.height);
  const [resetType, setResetType] = useState<"platform" | "topdown">(mapData.config.type);
  const [resetWidth, setResetWidth] = useState(20);
  const [resetHeight, setResetHeight] = useState(15);
  const [resetTileSize, setResetTileSize] = useState(32);

  const [objectLoader] = useState(() => new ObjectSpriteLoader());
  const [objectCache] = useState(() => new ObjectSpriteCache());
  const [objectDefinitions, setObjectDefinitions] = useState<Record<
    string,
    ObjectDefinition
  > | null>(null);
  const [objectSpritesLoaded, setObjectSpritesLoaded] = useState(false);

  // Load object sprites on mount
  useEffect(() => {
    async function loadObjects() {
      try {
        const defs = await objectLoader.loadObjectDefinitions("objects");
        setObjectDefinitions(defs);

        // Preload all sprite images
        const imagePathsSet = new Set<string>();
        for (const objDef of Object.values(defs)) {
          imagePathsSet.add(objDef.imagePath);
        }

        await Promise.all(Array.from(imagePathsSet).map((path) => objectCache.loadSprite(path)));

        setObjectSpritesLoaded(true);
      } catch (error) {
        console.error("Failed to load object sprites:", error);
      }
    }

    loadObjects();
  }, [objectLoader, objectCache]);

  const handleResizeConfirm = () => {
    onResize(resizeWidth, resizeHeight);
    setShowResizeDialog(false);
  };

  const handleResetConfirm = () => {
    if (confirm("This will clear all map data. Are you sure?")) {
      onReset(resetType, resetWidth, resetHeight, resetTileSize);
      setShowResetDialog(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Undo/Redo */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>History</h3>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...(canUndo ? {} : styles.buttonDisabled),
            }}
            onClick={onUndo}
            disabled={!canUndo}
          >
            ↶ Undo
          </button>
          <button
            style={{
              ...styles.button,
              ...(canRedo ? {} : styles.buttonDisabled),
            }}
            onClick={onRedo}
            disabled={!canRedo}
          >
            ↷ Redo
          </button>
        </div>
      </div>

      {/* Layer Selection */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Active Layer</h3>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...(activeLayer === "background" ? styles.buttonActive : {}),
            }}
            onClick={() => onLayerChange("background")}
          >
            Background
          </button>
          <button
            style={{
              ...styles.button,
              ...(activeLayer === "ground" ? styles.buttonActive : {}),
            }}
            onClick={() => onLayerChange("ground")}
          >
            Ground
          </button>
          <button
            style={{
              ...styles.button,
              ...(activeLayer === "foreground" ? styles.buttonActive : {}),
            }}
            onClick={() => onLayerChange("foreground")}
          >
            Foreground
          </button>
          <button
            style={{
              ...styles.button,
              ...(activeLayer === "collision" ? styles.buttonActive : {}),
            }}
            onClick={() => onLayerChange("collision")}
          >
            Collision
          </button>
        </div>
        {activeLayer === "collision" && (
          <p style={styles.helpText}>
            ⚠️ Collision layer: Paint = solid (blocks movement), Erase = empty (passable)
          </p>
        )}
        {activeLayer === "foreground" && (
          <p style={styles.helpText}>
            ℹ️ Foreground layer: Rendered above objects (for trees, bridges, etc.)
          </p>
        )}
      </div>

      {/* Tool Selection - Show on visual layers only */}
      {(activeLayer === "background" ||
        activeLayer === "ground" ||
        activeLayer === "foreground") && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Tile Tools</h3>
          <p style={styles.helpText}>Select a tile below, then choose a tool</p>
          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "paint" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
              title="Paint tiles (click again to deselect)"
            >
              🖌️ Paint
            </button>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "erase" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
              title="Erase tiles (click again to deselect)"
            >
              🧹 Erase
            </button>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "fill" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
              title="Fill area (click again to deselect)"
            >
              🪣 Fill
            </button>
          </div>
        </div>
      )}

      {/* Collision Layer Tools */}
      {activeLayer === "collision" && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Collision Tools</h3>
          <p style={styles.helpText}>Draw solid areas or erase to make passable</p>
          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "paint" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
              title="Paint collision (solid/blocking)"
            >
              🟦 Paint Solid
            </button>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "erase" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
              title="Erase collision (passable)"
            >
              ⬜ Erase
            </button>
            <button
              style={{
                ...styles.button,
                ...(selectedTool === "fill" ? styles.buttonActive : {}),
              }}
              onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
              title="Fill collision area (click again to deselect)"
            >
              🪣 Fill
            </button>
          </div>
        </div>
      )}

      {/* Object Tools - Only show on background layer */}
      {activeLayer === "background" && objectSpritesLoaded && objectDefinitions && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Object Tools</h3>
          <p style={styles.helpText}>Place game objects (click again to deselect)</p>
          <div style={styles.objectToolGrid}>
            <ObjectToolButton
              objectType="player"
              label="Player"
              objectDef={objectDefinitions.player}
              cache={objectCache}
              selectedTool={selectedTool}
              onToolSelect={onToolSelect}
            />
            <ObjectToolButton
              objectType="goal"
              label="Goal"
              objectDef={objectDefinitions.goal}
              cache={objectCache}
              selectedTool={selectedTool}
              onToolSelect={onToolSelect}
            />
            <ObjectToolButton
              objectType="coin"
              label="Coin"
              objectDef={objectDefinitions.coin}
              cache={objectCache}
              selectedTool={selectedTool}
              onToolSelect={onToolSelect}
            />
            <ObjectToolButton
              objectType="enemy"
              label="Enemy"
              objectDef={objectDefinitions.enemy}
              cache={objectCache}
              selectedTool={selectedTool}
              onToolSelect={onToolSelect}
            />
          </div>
        </div>
      )}

      {/* Tile Selection - Show on visual layers only */}
      {(activeLayer === "background" ||
        activeLayer === "ground" ||
        activeLayer === "foreground") && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Select Tile</h3>
          <TilePalette selectedTile={selectedTile} onTileSelect={onTileSelect} />
        </div>
      )}

      {/* Map Info */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Map Info</h3>
        <div style={styles.info}>
          <p style={styles.infoText}>
            Type: <strong>{mapData.config.type}</strong>
          </p>
          <p style={styles.infoText}>
            Size:{" "}
            <strong>
              {mapData.config.width} × {mapData.config.height}
            </strong>
          </p>
          <p style={styles.infoText}>
            Tile Size: <strong>{mapData.config.tileSize}px</strong>
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Actions</h3>
        <div style={styles.actionButtons}>
          <button style={styles.actionButton} onClick={() => setShowResizeDialog(true)}>
            Resize Map
          </button>
          <button style={styles.actionButton} onClick={() => setShowResetDialog(true)}>
            New Map
          </button>
          <button style={styles.actionButton} onClick={onExport}>
            Export JSON
          </button>
          <label style={styles.importLabel}>
            Import JSON
            <input type="file" accept=".json" onChange={onImport} style={styles.fileInput} />
          </label>
        </div>
      </div>

      {/* Resize Dialog */}
      {showResizeDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Resize Map</h3>
            <p style={styles.warningText}>⚠️ This will clear all map data</p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Width (tiles):</label>
              <input
                type="number"
                min="1"
                max="100"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height (tiles):</label>
              <input
                type="number"
                min="1"
                max="100"
                value={resizeHeight}
                onChange={(e) => setResizeHeight(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.confirmButton} onClick={handleResizeConfirm}>
                Confirm
              </button>
              <button style={styles.cancelButton} onClick={() => setShowResizeDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Dialog */}
      {showResetDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Create New Map</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type:</label>
              <select
                value={resetType}
                onChange={(e) => setResetType(e.target.value as "platform" | "topdown")}
                style={styles.select}
              >
                <option value="platform">Platform</option>
                <option value="topdown">Top Down</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Width (tiles):</label>
              <input
                type="number"
                min="1"
                max="100"
                value={resetWidth}
                onChange={(e) => setResetWidth(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height (tiles):</label>
              <input
                type="number"
                min="1"
                max="100"
                value={resetHeight}
                onChange={(e) => setResetHeight(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tile Size (px):</label>
              <input
                type="number"
                min="8"
                max="64"
                value={resetTileSize}
                onChange={(e) => setResetTileSize(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.modalButtons}>
              <button style={styles.confirmButton} onClick={handleResetConfirm}>
                Create
              </button>
              <button style={styles.cancelButton} onClick={() => setShowResetDialog(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    maxWidth: "1200px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  section: {
    marginBottom: "20px",
    paddingBottom: "20px",
    borderBottom: "1px solid #e0e0e0",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    margin: "0 0 12px 0",
    color: "#333",
  },
  helpText: {
    fontSize: "12px",
    color: "#888",
    marginBottom: "10px",
    fontStyle: "italic",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  button: {
    padding: "8px 12px",
    fontSize: "13px",
    fontWeight: "500",
    border: "2px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    flex: "1 1 auto",
    minWidth: "0",
    whiteSpace: "nowrap",
  },
  buttonActive: {
    backgroundColor: "#0066ff",
    color: "white",
    borderColor: "#0066ff",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  tileGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 60px)",
    gap: "10px",
  },
  tileButton: {
    width: "60px",
    height: "60px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.1s",
  },
  objectToolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(70px, 1fr))",
    gap: "8px",
  },
  objectButton: {
    padding: "8px",
    fontSize: "12px",
    fontWeight: "500",
    border: "2px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
  },
  objectPreview: {
    width: "48px",
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    overflow: "hidden",
  },
  objectImage: {
    width: "32px",
    height: "32px",
    objectFit: "contain",
    imageRendering: "pixelated",
  },
  objectText: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  objectLabel: {
    fontSize: "11px",
    color: "#555",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  infoText: {
    margin: 0,
    fontSize: "14px",
    color: "#555",
  },
  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  actionButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid #0066ff",
    borderRadius: "6px",
    backgroundColor: "white",
    color: "#0066ff",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  importLabel: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid #0066ff",
    borderRadius: "6px",
    backgroundColor: "white",
    color: "#0066ff",
    cursor: "pointer",
    display: "inline-block",
  },
  fileInput: {
    display: "none",
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    minWidth: "400px",
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 20px 0",
    color: "#333",
  },
  warningText: {
    color: "#ff6b00",
    fontSize: "14px",
    marginBottom: "20px",
  },
  formGroup: {
    marginBottom: "16px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "6px",
    color: "#555",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "2px solid #ddd",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "2px solid #ddd",
    borderRadius: "4px",
    boxSizing: "border-box",
  },
  modalButtons: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "20px",
  },
  confirmButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#0066ff",
    color: "white",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "500",
    border: "2px solid #ddd",
    borderRadius: "6px",
    backgroundColor: "white",
    color: "#555",
    cursor: "pointer",
  },
};
