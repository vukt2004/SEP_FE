import { useEffect, useState } from "react";
import { EditorStore } from "../../tools/map-editor/store/editorStore";
import { EditorCanvas } from "../../tools/map-editor/components/EditorCanvas";
import { createEmptyMap } from "../../tools/map-editor/utils/createEmptyMap";
import { exportMapToGameFormat } from "../../tools/map-editor/utils/exportMapToGameFormat";
import { MapEditorControls } from "./MapEditorControls";
import type { MapData } from "../../shared/types/MapSchema";

interface EditorState {
  store: EditorStore | null;
  mapData: MapData | null;
  activeLayer: "background" | "collision";
  selectedTile: number | null;
  selectedTool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null;
  canUndo: boolean;
  canRedo: boolean;
}

export default function MapEditor() {
  // Lazy initialization of editor state with store
  const [editorState, setEditorState] = useState<EditorState>(() => {
    const initialMap = createEmptyMap("platform", 20, 15, 32);
    const store = new EditorStore(initialMap);

    return {
      store,
      mapData: store.getState(),
      activeLayer: store.getActiveLayer(),
      selectedTile: store.getSelectedTile(),
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

  const handleLayerChange = (layer: "background" | "collision") => {
    store?.setActiveLayer(layer);
  };

  const handleTileSelect = (tileId: number | null) => {
    store?.setSelectedTile(tileId);
  };

  const handleToolSelect = (
    tool: "paint" | "erase" | "fill" | "player" | "goal" | "coin" | "enemy" | null,
  ) => {
    store?.setSelectedTool(tool);
  };

  const handleResize = (width: number, height: number) => {
    store?.resize(width, height);
  };

  const handleReset = (
    type: "platform" | "topdown",
    width: number,
    height: number,
    tileSize: number,
  ) => {
    store?.resetMap(type, width, height, tileSize);
  };

  const handleUndo = () => {
    store?.undo();
  };

  const handleRedo = () => {
    store?.redo();
  };

  const handleExport = () => {
    const mapData = store?.getState();
    if (!mapData) return;

    // Convert to game level format
    const gameLevelFormat = exportMapToGameFormat(mapData);

    const json = JSON.stringify(gameLevelFormat, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${gameLevelFormat.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const mapData = JSON.parse(event.target?.result as string) as MapData;
        store?.loadMap(mapData);
      } catch (error) {
        console.error("Failed to load map:", error);
        alert("Failed to load map file. Please check the format.");
      }
    };
    reader.readAsText(file);
  };

  const { mapData, activeLayer, selectedTile, selectedTool, canUndo, canRedo } = editorState;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Map Editor</h1>
        <p style={styles.subtitle}>Create and edit tile-based maps for your game</p>
      </div>

      {mapData && store && (
        <>
          <MapEditorControls
            mapData={mapData}
            activeLayer={activeLayer}
            selectedTile={selectedTile}
            selectedTool={selectedTool}
            canUndo={canUndo}
            canRedo={canRedo}
            onLayerChange={handleLayerChange}
            onTileSelect={handleTileSelect}
            onToolSelect={handleToolSelect}
            onResize={handleResize}
            onReset={handleReset}
            onExport={handleExport}
            onImport={handleImport}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />

          <div style={styles.canvasContainer}>
            <EditorCanvas store={store} />
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  header: {
    textAlign: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    margin: "0 0 10px 0",
    color: "#333",
  },
  subtitle: {
    fontSize: "16px",
    color: "#666",
    margin: 0,
  },
  canvasContainer: {
    marginTop: "20px",
    padding: "20px",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
};
