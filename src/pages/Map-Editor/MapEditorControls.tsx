import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brush,
  Eraser,
  PaintBucket,
  History,
  Layers,
  Settings2,
  Save,
  Maximize2,
  FolderTree,
  Shapes,
} from "lucide-react";
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
import { ROUTES } from "../../lib/constants/routes";

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
  onResize: (width: number, height: number, tileSize: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTypeChange?: (type: "platform" | "topdown") => void;
  onNameChange?: (name: string) => void;
  onDescriptionChange?: (description: string) => void;
  onDifficultyChange?: (difficulty: 1 | 2 | 3) => void;
  onTimeLimitChange?: (seconds: number) => void;
  onWinConditionChange?: (winCondition: 1 | 2) => void;
  onPriceChange?: (price: number) => void;
  sectionMode?: "left" | "right";
  editingMapId?: string;
  editorMode?: "edit" | "view";
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
  onUndo,
  onRedo,
  onTypeChange,
  onNameChange,
  onDescriptionChange,
  onDifficultyChange,
  onTimeLimitChange,
  onWinConditionChange,
  onPriceChange,
  sectionMode = "right",
  editingMapId,
  editorMode,
}: MapEditorControlsProps) {
  const navigate = useNavigate();
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [showMapInfoModal, setShowMapInfoModal] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(mapData.config.width);
  const [resizeHeight, setResizeHeight] = useState(mapData.config.height);
  const [resizeTileSize, setResizeTileSize] = useState(mapData.config.tileSize);
  const [hints, setHints] = useState<string[]>([""]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tileCategory, setTileCategory] = useState<"all" | "terrain" | "decor">("all");

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
  const showLeftPanel = sectionMode === "left";
  const showRightPanel = sectionMode === "right";

  // Load object sprites on mount or when game type changes
  useEffect(() => {
    if (!showLeftPanel) {
      setObjectSpritesLoaded(false);
      setObjectDefinitions(null);
      return;
    }

    let cancelled = false;

    // Reset immediately so UI shows loading state during transition
    setObjectSpritesLoaded(false);
    setObjectDefinitions(null);

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
  }, [gameType, objectCache, showLeftPanel]);

  const handleResizeConfirm = () => {
    // Validate map size (10-30)
    const validWidth = Math.max(10, Math.min(30, resizeWidth));
    const validHeight = Math.max(10, Math.min(30, resizeHeight));

    if (validWidth !== resizeWidth || validHeight !== resizeHeight) {
      alert(`Map size must be between 10x10 and 30x30. Adjusting to ${validWidth}x${validHeight}.`);
    }

    onResize(validWidth, validHeight, resizeTileSize);
    setShowResizeDialog(false);
  };

  const handleSaveMapFromModal = async () => {
    const mapName = mapData.config.name?.trim();
    if (!mapName) {
      alert("Please set a map name before saving");
      return;
    }

    if (userType === "unknown") {
      alert("You must be logged in as a learner or CMS user to save maps");
      return;
    }

    if (!confirm("Do you want to save the map?")) return;

    try {
      setUploading(true);

      const gameLevelFormat = exportMapToGameFormat(mapData);
      const json = JSON.stringify(gameLevelFormat, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const file = new File([blob], `${gameLevelFormat.id}.json`, { type: "application/json" });

      const mapType: "Topdown" | "Platform" =
        mapData.config.type === "platform" ? "Platform" : "Topdown";

      const mapsApi = isLearner ? learnerMapsApi : cmsMapsApi;
      const isEditingExistingMap = Boolean(editingMapId && editorMode === "edit");

      const payload = {
        Title: mapData.config.name,
        Description: mapData.config.description || "Map created with Map Editor",
        Type: mapType,
        Difficulty: mapData.config.difficulty,
        TimeLimitMs: mapData.config.timeLimitSeconds * 1000,
        WinCondition: mapData.config.winCondition,
        Price: mapData.config.price,
        MapDetailFile: file,
        AvatarFile: avatarFile ?? undefined,
      };

      const updatePayload = {
        Title: payload.Title,
        Description: payload.Description,
        Type: payload.Type,
        Difficulty: payload.Difficulty,
        TimeLimitMs: payload.TimeLimitMs,
        WinCondition: payload.WinCondition,
        Price: payload.Price,
        MapDetailFile: payload.MapDetailFile,
      };

      const response = isEditingExistingMap
        ? await mapsApi.updateMapFromJson(editingMapId!, updatePayload)
        : await mapsApi.uploadMapFromJson(payload);

      if (response.data.isSuccess) {
        if (isEditingExistingMap && isLearner && editingMapId && avatarFile) {
          const avatarResponse = await learnerMapsApi.uploadMapAvatar(editingMapId, avatarFile);
          if (!avatarResponse.data.isSuccess) {
            alert(
              `Map updated but avatar upload failed: ${avatarResponse.data.message || "Unknown error"}`,
            );
            return;
          }
        }

        const mapId =
          response.data.data && typeof response.data.data === "object" && "id" in response.data.data
            ? String(response.data.data.id)
            : "";
        alert(
          isEditingExistingMap
            ? "Map updated successfully!"
            : `Map saved successfully!${mapId ? ` Map ID: ${mapId}` : ""}`,
        );
        setShowMapInfoModal(false);
        setAvatarFile(null);

        if (isLearner) {
          navigate(ROUTES.LEARNER_MAPS);
        } else {
          navigate(-1);
        }
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
      {showRightPanel && (
        <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <History size={16} /> History
            </h3>
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

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Layers size={16} /> Active Layer
            </h3>
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
                Collision layer: paint blocks movement, erase makes paths passable.
              </p>
            )}
            {activeLayer === "foreground" && (
              <p style={styles.helpText}>Foreground renders above objects and player.</p>
            )}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Settings2 size={16} /> Map Settings
            </h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Map Type</label>
              <select
                value={mapData.config.type}
                onChange={(e) => onTypeChange?.(e.target.value as "platform" | "topdown")}
                style={styles.select}
              >
                <option value="platform">Platform</option>
                <option value="topdown">Top Down</option>
              </select>
            </div>
            <div style={styles.actionButtons}>
              <button style={styles.actionButton} onClick={() => setShowResizeDialog(true)}>
                <Maximize2 size={14} /> Resize Map
              </button>
              <button
                style={{ ...styles.actionButton, ...styles.saveButton }}
                onClick={() => setShowMapInfoModal(true)}
                disabled={userType === "unknown"}
                title={userType === "unknown" ? "Please login to save maps" : "Save map to server"}
              >
                <Save size={14} /> Save Map
              </button>
            </div>
          </div>
        </>
      )}

      {showLeftPanel && (
        <>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FolderTree size={16} /> Tile Categories
            </h3>
            <div style={styles.categoryRow}>
              {[
                { key: "all", label: "All" },
                { key: "terrain", label: "Terrain" },
                { key: "decor", label: "Decor" },
              ].map((category) => (
                <button
                  key={category.key}
                  onClick={() => setTileCategory(category.key as "all" | "terrain" | "decor")}
                  style={{
                    ...styles.categoryChip,
                    ...(tileCategory === category.key ? styles.categoryChipActive : {}),
                  }}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {(activeLayer === "background" ||
            activeLayer === "ground" ||
            activeLayer === "foreground") && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Shapes size={16} /> Tile Tools
              </h3>
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "paint" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
                  title="Paint tiles"
                >
                  <Brush size={14} /> Paint
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "erase" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
                  title="Erase tiles"
                >
                  <Eraser size={14} /> Erase
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "fill" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
                  title="Fill area"
                >
                  <PaintBucket size={14} /> Fill
                </button>
              </div>
            </div>
          )}

          {activeLayer === "collision" && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>
                <Shapes size={16} /> Collision Tools
              </h3>
              <p style={styles.helpText}>Draw solid tiles or erase them to make walkable spaces.</p>
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "paint" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "paint" ? null : "paint")}
                >
                  <Brush size={14} /> Paint Solid
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "erase" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "erase" ? null : "erase")}
                >
                  <Eraser size={14} /> Erase
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(selectedTool === "fill" ? styles.buttonActive : {}),
                  }}
                  onClick={() => onToolSelect(selectedTool === "fill" ? null : "fill")}
                >
                  <PaintBucket size={14} /> Fill
                </button>
              </div>
            </div>
          )}

          {(activeLayer === "background" ||
            activeLayer === "ground" ||
            activeLayer === "foreground") && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Tile Selection</h3>
              <TilePalette
                selectedTile={selectedTile}
                onTileSelect={onTileSelect}
                mapData={mapData}
              />
            </div>
          )}

          {activeLayer === "background" && objectSpritesLoaded && objectDefinitions && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Object Palette</h3>
              <p style={styles.helpText}>Pick an object and paint it into the map.</p>
              <div style={styles.objectToolGrid}>
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
        </>
      )}

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
            <div style={styles.formGroup}>
              <label style={styles.label}>Tile Size (px):</label>
              <input
                type="number"
                min="8"
                max="64"
                value={resizeTileSize}
                onChange={(e) => setResizeTileSize(Number(e.target.value))}
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
                onClick={handleSaveMapFromModal}
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
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  section: {
    padding: "14px",
    borderRadius: "14px",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
  },
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "600",
    margin: "0 0 12px 0",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    letterSpacing: "0.2px",
  },
  helpText: {
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "10px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  button: {
    padding: "9px 12px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    flex: "1 1 120px",
    minWidth: "0",
    whiteSpace: "nowrap",
  },
  buttonActive: {
    backgroundColor: "#1d4ed8",
    color: "white",
    borderColor: "#1d4ed8",
    boxShadow: "0 6px 14px rgba(29, 78, 216, 0.25)",
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  categoryRow: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  categoryChip: {
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "999px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  categoryChipActive: {
    border: "1px solid #93c5fd",
    background: "#dbeafe",
    color: "#1e40af",
  },
  objectToolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(76px, 1fr))",
    gap: "8px",
    maxHeight: "280px",
    overflowY: "auto",
    padding: "4px",
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
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: "500",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    backgroundColor: "white",
    color: "#1e293b",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    border: "1px solid #2563eb",
    boxShadow: "0 8px 16px rgba(37, 99, 235, 0.22)",
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
    borderRadius: "14px",
    boxShadow: "0 18px 38px rgba(0,0,0,0.25)",
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
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    boxSizing: "border-box",
    color: "black",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
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
