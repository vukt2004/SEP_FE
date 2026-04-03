import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Layers } from "lucide-react";
import type { EditorStore } from "../store/editorStore";
import { useLanguageStore } from "@/stores/language.store";
import { getT } from "@/lib/i18n/translations";

interface LayerPanelProps {
  store: EditorStore;
  /** Omit the "Layer Visibility" heading (e.g. when the parent section already has a title). */
  hideTitle?: boolean;
  /** Flatten chrome: no outer card border/shadow — use inside another card/section. */
  embedded?: boolean;
}

/**
 * LayerPanel Component
 *
 * Displays visibility toggles for all map layers.
 * Allows users to show/hide individual layers for easier editing.
 */
export function LayerPanel({ store, hideTitle = false, embedded = false }: LayerPanelProps) {
  const { locale } = useLanguageStore();
  const t = useMemo(() => getT(locale), [locale]);
  const tt = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
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
  const activeLayer = store.getActiveLayer();

  // Define layers in render order
  const layers: Array<{
    key: "background" | "ground" | "foreground" | "collision";
    labelKey: string;
    labelFallback: string;
  }> = [
    { key: "background", labelKey: "mapEditorLayerBackground", labelFallback: "Background" },
    { key: "ground", labelKey: "mapEditorLayerGround", labelFallback: "Ground" },
    { key: "foreground", labelKey: "mapEditorLayerForeground", labelFallback: "Foreground" },
    { key: "collision", labelKey: "mapEditorLayerCollision", labelFallback: "Collision" },
  ];

  const handleToggle = (layer: "background" | "ground" | "foreground" | "collision") => {
    store.toggleLayerVisibility(layer);
  };

  const layerIndicatorColor = (layer: "background" | "ground" | "foreground" | "collision") => {
    if (layer === "background") return "#6366f1";
    if (layer === "ground") return "#22c55e";
    if (layer === "foreground") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div style={embedded ? styles.containerEmbedded : styles.container}>
      {!hideTitle && (
        <h3 style={styles.title}>
          <Layers size={16} /> {tt("mapEditorLayerVisibilityTitle", "Layer Visibility")}
        </h3>
      )}
      <div style={styles.layerList}>
        {layers.map(({ key, labelKey, labelFallback }) => (
          <div
            key={key}
            style={{
              ...styles.layerRow,
              ...(activeLayer === key ? styles.layerRowActive : {}),
            }}
            onClick={() => store.setActiveLayer(key)}
          >
            <span style={styles.layerNameWrap}>
              <span
                style={{
                  ...styles.layerIndicator,
                  backgroundColor: layerIndicatorColor(key),
                }}
              />
              <span style={styles.layerName}>{tt(labelKey, labelFallback)}</span>
            </span>
            <button
              style={{
                ...styles.toggleButton,
                ...(layerVisibility[key] ? styles.toggleButtonVisible : styles.toggleButtonHidden),
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle(key);
              }}
              title={
                layerVisibility[key]
                  ? tt("mapEditorLayerClickToHide", "Click to hide")
                  : tt("mapEditorLayerClickToShow", "Click to show")
              }
            >
              {layerVisibility[key] ? <Eye size={14} /> : <EyeOff size={14} />}
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
    padding: "14px",
    background: "linear-gradient(180deg, #ffffff, #f8fafc)",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
  },
  containerEmbedded: {
    width: "100%",
    padding: 0,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
  },
  title: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    letterSpacing: "0.3px",
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
    padding: "10px 12px",
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  layerRowActive: {
    border: "1px solid #93c5fd",
    boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.25)",
    background: "linear-gradient(180deg, rgba(219, 234, 254, 0.4), #ffffff)",
  },
  layerNameWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  layerIndicator: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
  },
  layerName: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#334155",
  },
  toggleButton: {
    width: "34px",
    height: "30px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  toggleButtonVisible: {
    borderColor: "#86efac",
    backgroundColor: "#dcfce7",
    color: "#15803d",
  },
  toggleButtonHidden: {
    borderColor: "#fecaca",
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
  },
};
