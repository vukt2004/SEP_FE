import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Scan, ArrowLeft } from "lucide-react";
import { EditorStore } from "../../tools/map-editor/store/editorStore";
import { EditorCanvas } from "../../tools/map-editor/components/EditorCanvas";
import { LayerPanel } from "../../tools/map-editor/components/LayerPanel";
import { createEmptyMap } from "../../tools/map-editor/utils/createEmptyMap";
import { MapEditorControls } from "./MapEditorControls";
import type { MapData } from "../../shared/types/MapSchema";
import { learnerMapsApi } from "../../services/api/learner/maps.api";
import { cmsMapsApi } from "../../services/api/cms/maps.api";
import { tokenStorage } from "../../lib/storage/tokenStorage";
import type { RequiredBlockRule } from "../../shared/types/MapSchema";

type MapEditorRouteState = {
  mapId?: string;
  mode?: "edit" | "view";
};

type MapDetailLike = {
  title: string;
  description: string;
  type: "Topdown" | "Platform";
  difficulty: number;
  timeLimitMs: number;
  winCondition: number;
  price: number;
  hints?: Array<{ orderNo: number; content: string }>;
  tagNames?: string[];
  avatarUrl?: string | null;
  mapDetailJson?: unknown;
  activeSpec?: {
    gridSpec?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const toNumber = (value: unknown, fallback: number): number => {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const clampDifficulty = (value: number): 1 | 2 | 3 => {
  if (value <= 1) return 1;
  if (value >= 3) return 3;
  return value as 1 | 2 | 3;
};

const clampWinCondition = (value: number): 1 | 2 => {
  return value === 2 ? 2 : 1;
};

const normalizeNumberLayer = (
  layer: unknown,
  width: number,
  height: number,
  fallbackValue: number = 0,
): number[][] => {
  if (!Array.isArray(layer)) {
    return Array.from({ length: height }, () => Array(width).fill(fallbackValue));
  }

  return Array.from({ length: height }, (_, rowIndex) => {
    const row = Array.isArray(layer[rowIndex]) ? (layer[rowIndex] as unknown[]) : [];
    return Array.from({ length: width }, (_, colIndex) => {
      const cell = row[colIndex];
      if (typeof cell === "boolean") return cell ? 1 : 0;
      return toNumber(cell, fallbackValue);
    });
  });
};

const normalizeBlockLimit = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(1, Math.floor(value));
};

const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter((item): item is string => typeof item === "string" && item.trim().length > 0),
    ),
  );
};

const normalizeRequiredBlocks = (value: unknown): RequiredBlockRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { type: string; minCount: number } =>
        isRecord(item) && typeof item.type === "string" && typeof item.minCount === "number",
    )
    .map((item) => ({
      type: item.type,
      minCount: Math.max(1, Math.floor(item.minCount)),
    }));
};

const normalizeBlockConstraints = (
  source: Record<string, unknown> | null,
): {
  blockLimit: number | null;
  bannedBlocks: string[];
  requiredBlocks: RequiredBlockRule[];
} => {
  if (!source) {
    return {
      blockLimit: null,
      bannedBlocks: [],
      requiredBlocks: [],
    };
  }

  return {
    blockLimit: normalizeBlockLimit(source.blockLimit),
    bannedBlocks: normalizeStringList(source.bannedBlocks),
    requiredBlocks: normalizeRequiredBlocks(source.requiredBlocks),
  };
};

const mapDetailToEditorMapData = (detail: MapDetailLike): MapData => {
  let sourceJson: unknown = detail.mapDetailJson;

  if (!sourceJson && detail.activeSpec?.gridSpec) {
    try {
      sourceJson = JSON.parse(detail.activeSpec.gridSpec);
    } catch {
      sourceJson = null;
    }
  }

  const fallbackType = detail.type === "Platform" ? "platform" : "topdown";

  if (
    isRecord(sourceJson) &&
    isRecord(sourceJson.config) &&
    isRecord(sourceJson.layers) &&
    isRecord(sourceJson.objects)
  ) {
    const configRaw = sourceJson.config;
    const layersRaw = sourceJson.layers;
    const objectsRaw = sourceJson.objects;

    const width = Math.max(1, toNumber(configRaw.width, 20));
    const height = Math.max(1, toNumber(configRaw.height, 15));
    const tileSize = Math.max(8, toNumber(configRaw.tileSize, 32));

    const itemsRaw = Array.isArray(objectsRaw.items) ? objectsRaw.items : [];

    return {
      config: {
        type: configRaw.type === "topdown" ? "topdown" : "platform",
        width,
        height,
        tileSize,
        name:
          detail.title || (typeof configRaw.name === "string" ? configRaw.name : "Untitled Map"),
        description:
          detail.description ||
          (typeof configRaw.description === "string" ? configRaw.description : ""),
        difficulty: clampDifficulty(toNumber(detail.difficulty, toNumber(configRaw.difficulty, 1))),
        timeLimitSeconds: Math.max(
          1,
          Math.floor(
            toNumber(detail.timeLimitMs, toNumber(configRaw.timeLimitSeconds, 60) * 1000) / 1000,
          ),
        ),
        winCondition: clampWinCondition(
          toNumber(detail.winCondition, toNumber(configRaw.winCondition, 1)),
        ),
        requiredFruits: Math.max(
          0,
          toNumber(
            isRecord(sourceJson.metadata) ? sourceJson.metadata.requiredFruits : undefined,
            toNumber(configRaw.requiredFruits, 0),
          ),
        ),
        price: Math.max(0, toNumber(detail.price, toNumber(configRaw.price, 0))),
      },
      layers: {
        background: normalizeNumberLayer(layersRaw.background, width, height),
        ground: normalizeNumberLayer(layersRaw.ground, width, height),
        foreground: normalizeNumberLayer(layersRaw.foreground, width, height),
        collision: normalizeNumberLayer(layersRaw.collision, width, height),
      },
      objects: {
        items: itemsRaw
          .filter(
            (
              item,
            ): item is {
              id: number;
              type: string;
              x: number;
              y: number;
              metadata?: Record<string, unknown>;
            } =>
              isRecord(item) &&
              typeof item.id === "number" &&
              typeof item.type === "string" &&
              typeof item.x === "number" &&
              typeof item.y === "number",
          )
          .map((item) => ({
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            ...(isRecord(item.metadata) ? { metadata: item.metadata } : {}),
          })),
      },
      blockConstraints: normalizeBlockConstraints(
        isRecord(sourceJson.blockConstraints) ? sourceJson.blockConstraints : null,
      ),
    };
  }

  if (isRecord(sourceJson) && isRecord(sourceJson.layers)) {
    const width = Math.max(1, toNumber(sourceJson.width, 20));
    const height = Math.max(1, toNumber(sourceJson.height, 15));
    const layersRaw = sourceJson.layers;

    const objectsRaw = Array.isArray(sourceJson.objects) ? sourceJson.objects : [];
    const blockConstraintsRaw = isRecord(sourceJson.blockConstraints)
      ? sourceJson.blockConstraints
      : null;

    const items: Array<{
      id: number;
      type: string;
      x: number;
      y: number;
      metadata?: Record<string, unknown>;
    }> = [];

    if (
      isRecord(sourceJson.startPosition) &&
      typeof sourceJson.startPosition.col === "number" &&
      typeof sourceJson.startPosition.row === "number"
    ) {
      items.push({
        id: 1,
        type: "player",
        x: sourceJson.startPosition.col,
        y: sourceJson.startPosition.row,
      });
    }

    if (
      isRecord(sourceJson.goalPosition) &&
      typeof sourceJson.goalPosition.col === "number" &&
      typeof sourceJson.goalPosition.row === "number"
    ) {
      items.push({
        id: 2,
        type: "goal",
        x: sourceJson.goalPosition.col,
        y: sourceJson.goalPosition.row,
      });
    }

    objectsRaw.forEach((obj) => {
      if (
        isRecord(obj) &&
        typeof obj.type === "string" &&
        isRecord(obj.position) &&
        typeof obj.position.col === "number" &&
        typeof obj.position.row === "number"
      ) {
        if (obj.type === "fruit") {
          items.push({ id: 3, type: "fruit", x: obj.position.col, y: obj.position.row });
        } else if (obj.type === "enemy" || obj.type === "slime") {
          items.push({ id: 4, type: obj.type, x: obj.position.col, y: obj.position.row });
        } else {
          // Additional decorative objects based on their id or type
          const metaId =
            isRecord(obj.metadata) && typeof obj.metadata.objectId === "number"
              ? obj.metadata.objectId
              : 5;
          items.push({
            id: metaId,
            type: obj.type,
            x: obj.position.col,
            y: obj.position.row,
            ...(isRecord(obj.metadata) ? { metadata: obj.metadata } : {}),
          });
        }
      }
    });

    return {
      config: {
        type: fallbackType,
        width,
        height,
        tileSize: 32,
        name:
          detail.title || (typeof sourceJson.name === "string" ? sourceJson.name : "Untitled Map"),
        description: detail.description || "",
        difficulty: clampDifficulty(detail.difficulty),
        timeLimitSeconds: Math.max(1, Math.floor(detail.timeLimitMs / 1000)),
        winCondition: clampWinCondition(detail.winCondition),
        requiredFruits: Math.max(
          0,
          toNumber(
            isRecord(sourceJson.metadata) ? sourceJson.metadata.requiredFruits : undefined,
            0,
          ),
        ),
        price: Math.max(0, detail.price),
      },
      layers: {
        background: normalizeNumberLayer(layersRaw.background, width, height),
        ground: normalizeNumberLayer(layersRaw.ground, width, height),
        foreground: normalizeNumberLayer(layersRaw.foreground, width, height),
        collision: normalizeNumberLayer(layersRaw.collision, width, height),
      },
      objects: {
        items,
      },
      blockConstraints: normalizeBlockConstraints(blockConstraintsRaw),
    };
  }

  return createEmptyMap(fallbackType, 20, 15, 32);
};

interface EditorState {
  store: EditorStore | null;
  mapData: MapData | null;
  activeLayer: "background" | "ground" | "foreground" | "collision";
  selectedTile: number | null;
  selectedObjectId: number | null; // Changed to numeric ID
  selectedTool: "paint" | "erase" | "fill" | null;
  canUndo: boolean;
  canRedo: boolean;
}

export default function MapEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as MapEditorRouteState | null;
  const mapId = routeState?.mapId;
  const [zoom, setZoom] = useState(1);
  const [loadingMap, setLoadingMap] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingMapTagNames, setEditingMapTagNames] = useState<string[]>([]);
  const [editingMapAvatarUrl, setEditingMapAvatarUrl] = useState<string | null>(null);
  const [editingMapHints, setEditingMapHints] = useState<string[]>([]);
  // Lazy initialization of editor state with store
  const [editorState, setEditorState] = useState<EditorState>(() => {
    const initialMap = createEmptyMap("platform", 20, 15, 32);
    const store = new EditorStore(initialMap);

    return {
      store,
      mapData: store.getState(),
      activeLayer: store.getActiveLayer(),
      selectedTile: store.getSelectedTile(),
      selectedObjectId: store.getSelectedObjectId(),
      selectedTool: store.getSelectedTool(),
      canUndo: store.canUndo(),
      canRedo: store.canRedo(),
    };
  });

  const { store } = editorState;

  useEffect(() => {
    if (!mapId) {
      setEditingMapTagNames([]);
      setEditingMapAvatarUrl(null);
      setEditingMapHints([]);
      return;
    }

    let cancelled = false;

    const loadMapForEdit = async () => {
      try {
        setLoadingMap(true);
        setLoadError(null);

        const learnerToken = tokenStorage.getLearnerToken();
        const cmsToken = tokenStorage.getCmsToken();

        const mapsApi = learnerToken ? learnerMapsApi : cmsToken ? cmsMapsApi : null;
        if (!mapsApi) {
          throw new Error("You must be logged in to edit a map");
        }

        const response = await mapsApi.getMapById(mapId, false);
        if (!response.data.isSuccess || !response.data.data) {
          throw new Error(response.data.message || "Failed to load map");
        }

        if (cancelled) return;

        setEditingMapTagNames(
          Array.isArray((response.data.data as MapDetailLike).tagNames)
            ? ((response.data.data as MapDetailLike).tagNames ?? [])
            : [],
        );
        setEditingMapAvatarUrl((response.data.data as MapDetailLike).avatarUrl ?? null);
        setEditingMapHints(
          Array.isArray((response.data.data as MapDetailLike).hints)
            ? ((response.data.data as MapDetailLike).hints ?? [])
                .map((hint) => hint.content)
                .filter((content) => typeof content === "string" && content.trim().length > 0)
            : [],
        );

        const loadedMapData = mapDetailToEditorMapData(response.data.data as MapDetailLike);

        const loadedStore = new EditorStore(loadedMapData);
        setEditorState({
          store: loadedStore,
          mapData: loadedStore.getState(),
          activeLayer: loadedStore.getActiveLayer(),
          selectedTile: loadedStore.getSelectedTile(),
          selectedObjectId: loadedStore.getSelectedObjectId(),
          selectedTool: loadedStore.getSelectedTool(),
          canUndo: loadedStore.canUndo(),
          canRedo: loadedStore.canRedo(),
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load map";
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setLoadingMap(false);
        }
      }
    };

    loadMapForEdit();

    return () => {
      cancelled = true;
    };
  }, [mapId]);

  // Subscribe to store changes
  useEffect(() => {
    if (!store) return;

    const unsubscribe = store.subscribe(() => {
      setEditorState({
        store,
        mapData: store.getState(),
        activeLayer: store.getActiveLayer(),
        selectedTile: store.getSelectedTile(),
        selectedObjectId: store.getSelectedObjectId(),
        selectedTool: store.getSelectedTool(),
        canUndo: store.canUndo(),
        canRedo: store.canRedo(),
      });
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [store]);

  const handleLayerChange = (layer: "background" | "ground" | "foreground" | "collision") => {
    store?.setActiveLayer(layer);
  };

  const handleTileSelect = (tileId: number | null) => {
    store?.setSelectedTile(tileId);
  };

  const handleObjectSelect = (objectId: number | null) => {
    store?.setSelectedObjectId(objectId);
  };

  const handleToolSelect = (tool: "paint" | "erase" | "fill" | null) => {
    store?.setSelectedTool(tool);
  };

  const handleResize = (width: number, height: number, tileSize: number) => {
    store?.resize(width, height, tileSize);
  };

  const handleTypeChange = (type: "platform" | "topdown") => {
    store?.setMapType(type);
  };

  const handleNameChange = (name: string) => {
    store?.setMapName(name);
  };

  const handleDescriptionChange = (description: string) => {
    store?.setMapDescription(description);
  };

  const handleDifficultyChange = (difficulty: 1 | 2 | 3) => {
    store?.setMapDifficulty(difficulty);
  };

  const handleTimeLimitChange = (seconds: number) => {
    store?.setMapTimeLimitSeconds(seconds);
  };

  const handleWinConditionChange = (winCondition: 1 | 2) => {
    store?.setMapWinCondition(winCondition);
  };

  const handleRequiredFruitsChange = (requiredFruits: number) => {
    store?.setMapRequiredFruits(requiredFruits);
  };

  const handlePriceChange = (price: number) => {
    store?.setMapPrice(price);
  };

  const handleBlockLimitChange = (blockLimit: number | null) => {
    store?.setBlockLimit(blockLimit);
  };

  const handleBannedBlocksChange = (bannedBlocks: string[]) => {
    store?.setBannedBlocks(bannedBlocks);
  };

  const handleRequiredBlocksChange = (requiredBlocks: RequiredBlockRule[]) => {
    store?.setRequiredBlocks(requiredBlocks);
  };

  const handleObjectDefinitionsLoaded = useCallback(
    (defs: Record<string, import("../../modules/engine/assets").ObjectDefinition>) => {
      store?.setObjectDefinitions(defs);
    },
    [store],
  );

  const handleUndo = () => {
    store?.undo();
  };

  const handleRedo = () => {
    store?.redo();
  };

  const { mapData, activeLayer, selectedTile, selectedObjectId, selectedTool, canUndo, canRedo } =
    editorState;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate(-1)}>
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h1 style={styles.title}>Map Editor</h1>
          {mapId && (
            <p style={styles.subtitle}>{loadingMap ? "Loading map..." : `Editing map: ${mapId}`}</p>
          )}
          {loadError && <p style={styles.errorText}>{loadError}</p>}
        </div>
      </div>

      {mapData && store && (
        <div style={styles.mainContent}>
          <aside style={styles.leftSidebar}>
            <MapEditorControls
              sectionMode="left"
              editingMapId={mapId}
              editorMode={routeState?.mode}
              initialSelectedTagNames={editingMapTagNames}
              initialAvatarUrl={editingMapAvatarUrl}
              initialHints={editingMapHints}
              mapData={mapData}
              activeLayer={activeLayer}
              selectedTile={selectedTile}
              selectedObjectId={selectedObjectId}
              selectedTool={selectedTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onLayerChange={handleLayerChange}
              onTileSelect={handleTileSelect}
              onObjectSelect={handleObjectSelect}
              onToolSelect={handleToolSelect}
              onResize={handleResize}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onTypeChange={handleTypeChange}
              onNameChange={handleNameChange}
              onDescriptionChange={handleDescriptionChange}
              onDifficultyChange={handleDifficultyChange}
              onTimeLimitChange={handleTimeLimitChange}
              onWinConditionChange={handleWinConditionChange}
              onPriceChange={handlePriceChange}
              onBlockLimitChange={handleBlockLimitChange}
              onBannedBlocksChange={handleBannedBlocksChange}
              onRequiredBlocksChange={handleRequiredBlocksChange}
              onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
            />
          </aside>

          <section style={styles.canvasPanel}>
            <div style={styles.canvasToolbar}>
              <div style={styles.zoomGroup}>
                <button
                  style={styles.zoomButton}
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                >
                  <ZoomOut size={14} />
                </button>
                <span style={styles.zoomText}>{Math.round(zoom * 100)}%</span>
                <button
                  style={styles.zoomButton}
                  onClick={() => setZoom((z) => Math.min(2.5, z + 0.1))}
                >
                  <ZoomIn size={14} />
                </button>
                <button style={styles.zoomButton} onClick={() => setZoom(1)} title="Reset Zoom">
                  <Scan size={14} />
                </button>
              </div>
            </div>

            <div style={styles.canvasContainer}>
              <div style={styles.canvasGridBackdrop}>
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.2s ease",
                    display: "inline-block",
                  }}
                >
                  <EditorCanvas store={store} />
                </div>
              </div>
            </div>
          </section>

          <aside style={styles.rightSidebar}>
            <LayerPanel store={store} />
            <MapEditorControls
              sectionMode="right"
              editingMapId={mapId}
              editorMode={routeState?.mode}
              initialSelectedTagNames={editingMapTagNames}
              initialAvatarUrl={editingMapAvatarUrl}
              initialHints={editingMapHints}
              mapData={mapData}
              activeLayer={activeLayer}
              selectedTile={selectedTile}
              selectedObjectId={selectedObjectId}
              selectedTool={selectedTool}
              canUndo={canUndo}
              canRedo={canRedo}
              onLayerChange={handleLayerChange}
              onTileSelect={handleTileSelect}
              onObjectSelect={handleObjectSelect}
              onToolSelect={handleToolSelect}
              onResize={handleResize}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onTypeChange={handleTypeChange}
              onNameChange={handleNameChange}
              onDescriptionChange={handleDescriptionChange}
              onDifficultyChange={handleDifficultyChange}
              onTimeLimitChange={handleTimeLimitChange}
              onWinConditionChange={handleWinConditionChange}
              onRequiredFruitsChange={handleRequiredFruitsChange}
              onPriceChange={handlePriceChange}
              onBlockLimitChange={handleBlockLimitChange}
              onBannedBlocksChange={handleBannedBlocksChange}
              onRequiredBlocksChange={handleRequiredBlocksChange}
              onObjectDefinitionsLoaded={handleObjectDefinitionsLoaded}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "18px",
    gap: "14px",
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 20% 0%, rgba(59, 130, 246, 0.12), transparent 30%), #eef2f7",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: "1800px",
    position: "relative",
    padding: "14px 16px",
    borderRadius: "16px",
    border: "1px solid #dbe3ef",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  title: {
    fontSize: "30px",
    fontWeight: "800",
    margin: 0,
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
  backButton: {
    position: "absolute",
    left: "16px",
    padding: "8px 14px",
    fontSize: "13px",
    fontWeight: "600",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    backgroundColor: "white",
    color: "#0f172a",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr) 320px",
    gap: "14px",
    width: "100%",
    maxWidth: "1800px",
  },
  leftSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
    overflowX: "hidden",
  },
  rightSidebar: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    maxHeight: "calc(100vh - 140px)",
    overflowY: "auto",
    overflowX: "hidden",
  },
  canvasPanel: {
    minHeight: "calc(100vh - 140px)",
    display: "flex",
    flexDirection: "column",
    borderRadius: "18px",
    border: "1px solid #dbe3ef",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.1)",
    overflow: "hidden",
  },
  canvasToolbar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  zoomGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    background: "white",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    padding: "4px",
  },
  zoomButton: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#334155",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomText: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#334155",
    minWidth: "46px",
    textAlign: "center",
  },
  canvasContainer: {
    flex: 1,
    padding: "14px",
    overflow: "auto",
  },
  canvasGridBackdrop: {
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #dbe3ef",
    background:
      "linear-gradient(45deg, rgba(148, 163, 184, 0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(148, 163, 184, 0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.08) 75%)",
    backgroundSize: "24px 24px",
    backgroundPosition: "0 0, 0 12px, 12px -12px, -12px 0px",
  },
};
