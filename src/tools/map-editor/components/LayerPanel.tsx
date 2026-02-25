import { useEffect, useState } from "react";
import type { EditorStore } from "../store/editorStore";

interface LayerPanelProps {
  store: EditorStore;
}

/**
 * LayerPanel Component
 *
 * Displays visibility toggles for all map layers.
 * Allows users to show/hide individual layers for easier editing.
 */
export function LayerPanel({ store }: LayerPanelProps) {
  const [, forceUpdate] = useState({});

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      forceUpdate({});
    });

    return () => {
      unsubscribe();
    };
  }, [store]);

  const layerVisibility = store.getLayerVisibility();

  // Define layers in render order
  const layers: Array<{
    key: "background" | "ground" | "foreground" | "collision";
    label: string;
  }> = [
    { key: "background", label: "Background" },
    { key: "ground", label: "Ground" },
    { key: "foreground", label: "Foreground" },
    { key: "collision", label: "Collision" },
  ];

  const handleToggle = (layer: "background" | "ground" | "foreground" | "collision") => {
    store.toggleLayerVisibility(layer);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Layer Visibility</h3>
      <div style={styles.layerList}>
        {layers.map(({ key, label }) => (
          <div key={key} style={styles.layerRow}>
            <span style={styles.layerName}>{label}</span>
            <button
              style={{
                ...styles.toggleButton,
                ...(layerVisibility[key] ? styles.toggleButtonVisible : styles.toggleButtonHidden),
              }}
              onClick={() => handleToggle(key)}
              title={layerVisibility[key] ? "Click to hide" : "Click to show"}
            >
              {layerVisibility[key] ? "👁️ Visible" : "🚫 Hidden"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    padding: "16px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "16px",
    fontWeight: "600",
    color: "#333",
  },
  layerList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  layerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: "white",
    borderRadius: "6px",
    border: "1px solid #e0e0e0",
  },
  layerName: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#555",
  },
  toggleButton: {
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: "500",
    border: "2px solid",
    borderRadius: "4px",
    cursor: "pointer",
    transition: "all 0.2s",
    minWidth: "100px",
  },
  toggleButtonVisible: {
    borderColor: "#4CAF50",
    backgroundColor: "#e8f5e9",
    color: "#2e7d32",
  },
  toggleButtonHidden: {
    borderColor: "#f44336",
    backgroundColor: "#ffebee",
    color: "#c62828",
  },
};
