import { useState, useEffect, useRef } from "react";
import type { MapData } from "../../shared/types/MapSchema";
import type { GameType } from "../../shared/types/GameType";
import { TilePalette } from "./TilePalette";
import {
  ObjectSpriteLoader,
  ObjectSpriteCache,
  type ObjectDefinition,
} from "../../modules/engine/assets";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import { learnerMapsApi } from "../../services/api/learner/maps.api";
import { useLearnerAuthStore } from "../../stores/auth/learnerAuth.store";
import { useCmsAuthStore } from "../../stores/auth/cmsAuth.store";
import { exportMapToGameFormat } from "../../tools/map-editor/utils/exportMapToGameFormat";

/**
 * Convert MapData config type to GameType
 */
function mapTypeToGameType(mapType: "platform" | "topdown"): GameType {
  return mapType === "platform" ? "platformer" : "topdown";
}

interface MapEditorControlsProps {
  mapData: MapData;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedObjectId: number | null; // Changed from string enum to numeric ID
  selectedTool: "paint" | "erase" | "fill" | null;
  canUndo: boolean;
  canRedo: boolean;
  onLayerChange: (layer: "background" | "ground" | "foreground" | "collision") => void;
  onTileSelect: (tileId: number | null) => void;
  onObjectSelect: (objectId: number | null) => void; // Changed to numeric ID
  onToolSelect: (tool: "paint" | "erase" | "fill" | null) => void;
  onResize: (width: number, height: number) => void;
  onReset: (
    type: "platform" | "topdown",
    width: number,
    height: number,
    tileSize: number,
    name?: string,
    description?: string,
  ) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onDifficultyChange?: (difficulty: 1 | 2 | 3) => void;
  onTimeLimitChange?: (seconds: number) => void;
  onWinConditionChange?: (winCondition: 1 | 2) => void;
  onPriceChange?: (price: number) => void;
}

interface ObjectSelectionButtonProps {
  objectId: number; // Numeric object ID
  label: string;
  objectDef: ObjectDefinition;
  cache: ObjectSpriteCache;
  selectedObjectId: number | null;
  onObjectSelect: (objectId: number | null) => void;
}

function ObjectSelectionButton({
  objectId,
  label,
  objectDef,
  cache,
  selectedObjectId,
  onObjectSelect,
}: ObjectSelectionButtonProps) {
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
        border: selectedObjectId === objectId ? "2px solid #4CAF50" : "2px solid #ddd",
        borderRadius: "6px",
        backgroundColor: selectedObjectId === objectId ? "#e8f5e9" : "white",
        cursor: "pointer",
        transition: "all 0.2s",
        minWidth: "80px",
        boxShadow: selectedObjectId === objectId ? "0 2px 6px rgba(76,175,80,0.3)" : "none",
      }}
      onClick={() => onObjectSelect(selectedObjectId === objectId ? null : objectId)}
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
  selectedObjectId,
  selectedTool,
  canUndo,
  canRedo,
  onLayerChange,
  onTileSelect,
  onObjectSelect,
  onToolSelect,
  onResize,
  onReset,
  onExport,
  onImport,
  onUndo,
  onRedo,
  onNameChange,
  onDescriptionChange,
  onDifficultyChange,
  onTimeLimitChange,
  onWinConditionChange,
  onPriceChange,
}: MapEditorControlsProps) {
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showMapInfoModal, setShowMapInfoModal] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(mapData.config.width);
  const [resizeHeight, setResizeHeight] = useState(mapData.config.height);
  const [resetType, setResetType] = useState<"platform" | "topdown">(mapData.config.type);
  const [resetWidth, setResetWidth] = useState(20);
  const [resetHeight, setResetHeight] = useState(15);
  const [resetTileSize, setResetTileSize] = useState(32);
  const [resetName, setResetName] = useState("");
  const [resetDescription, setResetDescription] = useState("");
  const [hints, setHints] = useState<string[]>([""]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const gameType = mapTypeToGameType(mapData.config.type);
  const [objectCache] = useState(() => new ObjectSpriteCache());

  // Detect user type for API selection
  const learnerAuth = useLearnerAuthStore();
  const cmsAuth = useCmsAuthStore();
  const isLearner = learnerAuth.isAuthenticated;
  const isCms = cmsAuth.isAuthenticated;
  const userType = isLearner ? "learner" : isCms ? "cms" : "unknown";
  const [objectDefinitions, setObjectDefinitions] = useState<Record<
    string,
    ObjectDefinition
  > | null>(null);
  const [objectSpritesLoaded, setObjectSpritesLoaded] = useState(false);

  // Load object sprites on mount or when game type changes
  useEffect(() => {
    let cancelled = false;

    async function loadObjects() {
      try {
        // Create loader with current game type
        const objectLoader = new ObjectSpriteLoader(gameType);
        const defs = await objectLoader.loadObjectDefinitions("objects");

        // Preload all sprite images BEFORE setting definitions
        const imagePathsSet = new Set<string>();
        for (const objDef of Object.values(defs)) {
          imagePathsSet.add(objDef.imagePath);
        }

        await Promise.all(Array.from(imagePathsSet).map((path) => objectCache.loadSprite(path)));

        // Only set definitions after all images are loaded
        if (cancelled) return;
        setObjectDefinitions(defs);
        setObjectSpritesLoaded(true);
      } catch (error) {
        console.error("Failed to load object sprites:", error);
        if (!cancelled) {
          setObjectSpritesLoaded(false);
          setObjectDefinitions(null);
        }
      }
    }

    loadObjects();

    return () => {
      cancelled = true;
    };
  }, [gameType, objectCache]);

  const handleResizeConfirm = () => {
    // Validate map size (10-30)
    const validWidth = Math.max(10, Math.min(30, resizeWidth));
    const validHeight = Math.max(10, Math.min(30, resizeHeight));

    if (validWidth !== resizeWidth || validHeight !== resizeHeight) {
      alert(`Map size must be between 10x10 and 30x30. Adjusting to ${validWidth}x${validHeight}.`);
    }

    onResize(validWidth, validHeight);
    setShowResizeDialog(false);
  };

  const handleResetConfirm = () => {
    // Validate map size (10-30)
    const validWidth = Math.max(10, Math.min(30, resetWidth));
    const validHeight = Math.max(10, Math.min(30, resetHeight));

    if (validWidth !== resetWidth || validHeight !== resetHeight) {
      alert(`Map size must be between 10x10 and 30x30. Adjusting to ${validWidth}x${validHeight}.`);
    }

    if (confirm("This will clear all map data. Are you sure?")) {
      onReset(resetType, validWidth, validHeight, resetTileSize, resetName, resetDescription);
      setShowResetDialog(false);
    }
  };

  const handleUploadConfirm = async () => {
    const mapName = mapData.config.name?.trim();
    if (!mapName) {
      alert("Please set a map name before uploading");
      return;
    }

    if (userType === "unknown") {
      alert("You must be logged in as a learner or CMS user to upload maps");
      return;
    }

    try {
      setUploading(true);

      // Convert map to game format
      const gameLevelFormat = exportMapToGameFormat(mapData);
      const json = JSON.stringify(gameLevelFormat, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], `${gameLevelFormat.id}.json`, { type: "application/json" });

      // Convert map type from internal format to API format
      const mapType: "Topdown" | "Platform" =
        mapData.config.type === "platform" ? "Platform" : "Topdown";

      // Use the appropriate API based on user type
      const mapsApi = isLearner ? learnerMapsApi : cmsMapsApi;

      const response = await mapsApi.uploadMapFromJson({
        Title: mapData.config.name,
        Description: mapData.config.description || "Map created with Map Editor",
        Type: mapType,
        Difficulty: mapData.config.difficulty,
        TimeLimitMs: mapData.config.timeLimitSeconds * 1000, // Convert seconds to milliseconds
        WinCondition: mapData.config.winCondition,
        Price: mapData.config.price,
        MapDetailFile: file,
        // Optional fields can be added:
        // HintsJson: JSON.stringify([]),
        // TagIdsCsv: "",
      });

      if (response.data.isSuccess) {
        const mapId =
          response.data.data && typeof response.data.data === "object" && "id" in response.data.data
            ? String(response.data.data.id)
            : "";
        alert(`Map uploaded successfully!${mapId ? ` Map ID: ${mapId}` : ""}`);
        setShowUploadDialog(false);
      } else {
        alert(`Upload failed: ${response.data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Failed to upload map: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMap = async () => {
    const mapName = mapData.config.name?.trim();
    if (!mapName) {
      alert("Please set a map name before saving");
      return;
    }

    if (userType === "unknown") {
      alert("You must be logged in as a learner or CMS user to save maps");
      return;
    }

    try {
      setUploading(true);

      // Convert map to game format
      const gameLevelFormat = exportMapToGameFormat(mapData);
      const json = JSON.stringify(gameLevelFormat, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], `${gameLevelFormat.id}.json`, { type: "application/json" });

      // Convert map type from internal format to API format
      const mapType: "Topdown" | "Platform" =
        mapData.config.type === "platform" ? "Platform" : "Topdown";

      // Use the appropriate API based on user type
      const mapsApi = isLearner ? learnerMapsApi : cmsMapsApi;

      // Prepare hints JSON if any hints are provided
      const hintsWithContent = hints.filter((hint) => hint.trim());
      const hintsJson =
        hintsWithContent.length > 0
          ? JSON.stringify(
              hintsWithContent.map((content, index) => ({
                orderNo: index + 1,
                content,
              })),
            )
          : undefined;

      const response = await mapsApi.uploadMapFromJson({
        Title: mapData.config.name,
        Description: mapData.config.description || "Map created with Map Editor",
        Type: mapType,
        Difficulty: mapData.config.difficulty,
        TimeLimitMs: mapData.config.timeLimitSeconds * 1000,
        WinCondition: mapData.config.winCondition,
        Price: mapData.config.price,
        MapDetailFile: file,
        HintsJson: hintsJson,
        AvatarFile: avatarFile,
      });

      if (response.data.isSuccess) {
        const mapId =
          response.data.data && typeof response.data.data === "object" && "id" in response.data.data
            ? String(response.data.data.id)
            : "";
        alert(`Map saved successfully!${mapId ? ` Map ID: ${mapId}` : ""}`);
        setShowMapInfoModal(false);
        setAvatarFile(null);
        setHints([""]);
      } else {
        alert(`Save failed: ${response.data.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      alert(`Failed to save map: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setUploading(false);
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

      {/* Object Palette - Only show on background layer */}
      {activeLayer === "background" && objectSpritesLoaded && objectDefinitions && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Objects</h3>
          <p style={styles.helpText}>Select an object, then use paint tool to place it</p>
          <div style={styles.objectToolGrid}>
            {/* Dynamically render ALL objects from definitions */}
            {Object.entries(objectDefinitions).map(([idStr, objDef]) => {
              const objectId = parseInt(idStr, 10);
              const label = objDef.name.charAt(0).toUpperCase() + objDef.name.slice(1);
              return (
                <ObjectSelectionButton
                  key={objectId}
                  objectId={objectId}
                  label={label}
                  objectDef={objDef}
                  cache={objectCache}
                  selectedObjectId={selectedObjectId}
                  onObjectSelect={onObjectSelect}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Tile Selection - Show on visual layers only */}
      {(activeLayer === "background" ||
        activeLayer === "ground" ||
        activeLayer === "foreground") && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Select Tile</h3>
          <TilePalette selectedTile={selectedTile} onTileSelect={onTileSelect} mapData={mapData} />
        </div>
      )}

      {/* Actions */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Actions</h3>
        <div style={styles.actionButtons}>
          <button style={styles.actionButton} onClick={() => setShowMapInfoModal(true)}>
            Edit Map Info
          </button>
          <button style={styles.actionButton} onClick={() => setShowResizeDialog(true)}>
            Resize Map
          </button>
          <button style={styles.actionButton} onClick={() => setShowResetDialog(true)}>
            New Map
          </button>
          <button style={styles.actionButton} onClick={onExport}>
            Export JSON
          </button>
          <button
            style={styles.actionButton}
            onClick={() => setShowMapInfoModal(true)}
            disabled={userType === "unknown"}
            title={userType === "unknown" ? "Please login to save maps" : "Save map to server"}
          >
            Save Map
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
            <p style={styles.helpText}>Map size must be between 10x10 and 30x30</p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Width (tiles):</label>
              <input
                type="number"
                min="10"
                max="30"
                value={resizeWidth}
                onChange={(e) => setResizeWidth(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height (tiles):</label>
              <input
                type="number"
                min="10"
                max="30"
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
            <p style={styles.helpText}>Map size must be between 10x10 and 30x30</p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Map Name:</label>
              <input
                type="text"
                value={resetName}
                onChange={(e) => setResetName(e.target.value)}
                placeholder="Enter map name"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <textarea
                value={resetDescription}
                onChange={(e) => setResetDescription(e.target.value)}
                placeholder="Enter map description"
                style={{ ...styles.input, minHeight: "60px", resize: "vertical" }}
                rows={3}
              />
            </div>
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
                min="10"
                max="30"
                value={resetWidth}
                onChange={(e) => setResetWidth(Number(e.target.value))}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Height (tiles):</label>
              <input
                type="number"
                min="10"
                max="30"
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

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              Upload Map{userType !== "unknown" ? ` (${userType.toUpperCase()})` : ""}
            </h3>
            <p style={styles.helpText}>
              This will upload the map using the current map information below
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Map Name:</label>
              <div style={styles.infoBox}>{mapData.config.name || "(No name set)"}</div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description:</label>
              <div style={styles.infoBox}>
                {mapData.config.description || "(No description set)"}
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type:</label>
              <div style={styles.infoBox}>
                {mapData.config.type === "platform" ? "Platform" : "Top Down"}
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Dimensions:</label>
              <div style={styles.infoBox}>
                {mapData.config.width} × {mapData.config.height} tiles
              </div>
            </div>
            {(!mapData.config.name || !mapData.config.description) && (
              <p style={styles.warningText}>
                ⚠️ Set map name and description in the Map Info section before uploading
              </p>
            )}
            <div style={styles.modalButtons}>
              <button
                style={{
                  ...styles.confirmButton,
                  ...(uploading ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                }}
                onClick={handleUploadConfirm}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => setShowUploadDialog(false)}
                disabled={uploading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Info Modal */}
      {showMapInfoModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Edit Map Info</h3>
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name:</label>
                <input
                  type="text"
                  value={mapData.config.name}
                  onChange={(e) => onNameChange?.(e.target.value)}
                  placeholder="Enter map name"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description:</label>
                <textarea
                  value={mapData.config.description}
                  onChange={(e) => onDescriptionChange?.(e.target.value)}
                  placeholder="Enter map description"
                  style={{ ...styles.input, minHeight: "80px", resize: "vertical" }}
                  rows={4}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Difficulty:</label>
                <select
                  value={mapData.config.difficulty}
                  onChange={(e) => onDifficultyChange?.(Number(e.target.value) as 1 | 2 | 3)}
                  style={styles.select}
                >
                  <option value={1}>Easy</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Hard</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Time Limit (seconds):</label>
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={mapData.config.timeLimitSeconds}
                  onChange={(e) => onTimeLimitChange?.(Number(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Win Condition:</label>
                <select
                  value={mapData.config.winCondition}
                  onChange={(e) => onWinConditionChange?.(Number(e.target.value) as 1 | 2)}
                  style={styles.select}
                >
                  <option value={1}>Reach Goal</option>
                  <option value={2}>Collect All Fruits</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Price:</label>
                <input
                  type="number"
                  min="0"
                  value={mapData.config.price}
                  onChange={(e) => onPriceChange?.(Number(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Hints (up to 3):</label>
                <p style={styles.helpText}>Add helpful hints for players to solve the map</p>
                {hints.map((hint, index) => (
                  <div key={index} style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={hint}
                        onChange={(e) => {
                          const newHints = [...hints];
                          newHints[index] = e.target.value;
                          setHints(newHints);
                        }}
                        placeholder={`Hint ${index + 1}`}
                        style={{ ...styles.input, flex: 1 }}
                      />
                      {hint && (
                        <button
                          onClick={() => {
                            const newHints = hints.filter((_, i) => i !== index);
                            setHints(newHints);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "#ff6b6b",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {hints.length < 3 && (
                  <button
                    onClick={() => setHints([...hints, ""])}
                    style={{
                      padding: "8px 12px",
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "12px",
                      marginTop: "8px",
                    }}
                  >
                    + Add Hint
                  </button>
                )}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Map Avatar (Optional):</label>
                <p style={styles.helpText}>Upload an image to be displayed as the map thumbnail</p>
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...styles.importLabel, display: "block" }}>
                      Choose Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setAvatarFile(e.currentTarget.files?.[0] ?? null)}
                        style={styles.fileInput}
                      />
                    </label>
                    {avatarFile && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <span style={styles.helpText}>{avatarFile.name}</span>
                        <button
                          onClick={() => setAvatarFile(null)}
                          style={{
                            padding: "6px 12px",
                            background: "#ff6b6b",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                  {avatarFile && (
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "2px solid var(--border)",
                        backgroundColor: "var(--surface-2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={URL.createObjectURL(avatarFile)}
                        alt="Avatar Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Map Info (Read-only):</label>
                <p style={styles.infoText}>
                  Type: <strong>{mapData.config.type}</strong>
                </p>
                <p style={styles.infoText}>
                  Size:{" "}
                  <strong>
                    {mapData.config.width} × {mapData.config.height} tiles
                  </strong>
                </p>
                <p style={styles.infoText}>
                  Tile Size: <strong>{mapData.config.tileSize}px</strong>
                </p>
              </div>
            </div>

            <div style={styles.modalButtons}>
              <button
                style={{
                  ...styles.confirmButton,
                  ...(uploading ? { opacity: 0.6, cursor: "not-allowed" } : {}),
                }}
                onClick={handleSaveMap}
                disabled={uploading}
              >
                {uploading ? "Saving..." : "Save Map"}
              </button>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowMapInfoModal(false);
                  setAvatarFile(null);
                }}
                disabled={uploading}
              >
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
    maxHeight: "300px",
    overflowY: "auto",
    padding: "8px",
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
    color: "black",
  },
  infoBox: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "2px solid #e0e0e0",
    borderRadius: "4px",
    backgroundColor: "#f5f5f5",
    color: "#333",
    minHeight: "38px",
    display: "flex",
    alignItems: "center",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "2px solid #ddd",
    borderRadius: "4px",
    boxSizing: "border-box",
    color: "black",
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
