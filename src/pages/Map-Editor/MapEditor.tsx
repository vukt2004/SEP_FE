import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ZoomIn, ZoomOut, Scan, ArrowLeft } from "lucide-react";
import { EditorStore } from "../../tools/map-editor/store/editorStore";
import { EditorCanvas } from "../../tools/map-editor/components/EditorCanvas";
import { LayerPanel } from "../../tools/map-editor/components/LayerPanel";
import { createEmptyMap } from "../../tools/map-editor/utils/createEmptyMap";
import { MapEditorControls } from "./MapEditorControls";
import type { MapData } from "../../shared/types/MapSchema";

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
  const [zoom, setZoom] = useState(1);
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

  const handlePriceChange = (price: number) => {
    store?.setMapPrice(price);
  };

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
        </div>
      </div>

      {mapData && store && (
        <div style={styles.mainContent}>
          <aside style={styles.leftSidebar}>
            <MapEditorControls
              sectionMode="left"
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
