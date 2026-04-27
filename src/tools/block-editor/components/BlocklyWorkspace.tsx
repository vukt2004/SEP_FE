import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
import "blockly/javascript";
import { useTranslation } from "@/lib/i18n/translations";
import { loadLocalizedBlockRegistry } from "../utils/blockLoader";
import { registerBlocks } from "../blocks/registerBlocks";
import { generateToolbox } from "../utils/generateToolbox";
import type { BlockConfig } from "../types/blockDefinition";
import type { BlockCategory } from "../types/blockDefinition";

/** Khi có allowlist: ẩn mọi block không nằm trong danh sách (dùng cho sandbox bài học concept). */
function computeHiddenBlockTypes(
  definitions: BlockConfig[],
  bannedBlockTypes: string[],
  visibleBlockTypes?: string[] | null,
): string[] {
  const hidden = new Set(bannedBlockTypes);
  if (visibleBlockTypes != null && visibleBlockTypes.length > 0) {
    const allowed = new Set(visibleBlockTypes);
    for (const def of definitions) {
      if (!allowed.has(def.type)) hidden.add(def.type);
    }
  }
  return Array.from(hidden).sort();
}

/** Làm mờ khối mẫu (movable=false từ XML / snapshot). */
function applyConceptStarterDimClass(workspace: Blockly.WorkspaceSvg | null): void {
  if (!workspace) return;
  for (const block of workspace.getAllBlocks(false)) {
    if (block.isShadow()) continue;
    const root = block.getSvgRoot();
    if (!root) continue;
    if (!block.isOwnMovable()) root.classList.add("blockly-concept-starter-block");
    else root.classList.remove("blockly-concept-starter-block");
  }
}

const cssVar = (name: string, fallback: string) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

const createEduWorkspaceTheme = () =>
  Blockly.Theme.defineTheme("eduWorkspace", {
    name: "eduWorkspace",
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: cssVar("--surface", "#0f1b2d"),
      toolboxBackgroundColour: cssVar("--surface-2", "#14233a"),
      toolboxForegroundColour: cssVar("--text", "#e5e7eb"),
      flyoutBackgroundColour: cssVar("--surface", "#0f1b2d"),
      flyoutForegroundColour: cssVar("--text", "#e5e7eb"),
      flyoutOpacity: 1,
      scrollbarColour: cssVar("--muted", "#7c879c"),
      scrollbarOpacity: 0.35,
      insertionMarkerColour: cssVar("--accent", "#f97316"),
      insertionMarkerOpacity: 0.35,
      markerColour: cssVar("--primary", "#2563eb"),
      cursorColour: cssVar("--primary", "#2563eb"),
    },
  });

interface BlocklyWorkspaceProps {
  workspaceId?: string;
  onWorkspaceReady?: (workspace: Blockly.WorkspaceSvg) => void;
  bannedBlockTypes?: string[];
  /** Chỉ hiện các block này trong toolbox (các block khác bị ẩn). */
  visibleBlockTypes?: string[] | null;
  /** XML Blockly (thẻ gốc `<xml>...</xml>`) — ghép sẵn trên sân khi khởi tạo (ví dụ bài concept). */
  initialXml?: string | null;
  /** Khối có `movable=false` (ví dụ từ concept) được làm mờ trên canvas. */
  conceptStarterPresentation?: boolean;
  blockLimit?: number | null;
  onConstraintViolation?: (message: string) => void;
  onBlockCountChange?: (count: number) => void;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({
  workspaceId = "blockly-workspace",
  onWorkspaceReady,
  bannedBlockTypes = [],
  visibleBlockTypes = null,
  initialXml = null,
  conceptStarterPresentation = false,
  blockLimit = null,
  onConstraintViolation,
  onBlockCountChange,
}) => {
  const { t, locale } = useTranslation();
  const visibleTypesKey = useMemo(
    () => (visibleBlockTypes ?? []).slice().sort().join("|"),
    [visibleBlockTypes],
  );
  const bannedTypesKey = useMemo(() => [...bannedBlockTypes].sort().join("|"), [bannedBlockTypes]);
  const initialXmlKey = useMemo(() => (initialXml ?? "").trim(), [initialXml]);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const blocklyWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const blockDefinitionsRef = useRef<BlockConfig[] | null>(null);
  const hiddenTypesKeyRef = useRef<string>("");
  const onWorkspaceReadyRef = useRef(onWorkspaceReady);
  const onConstraintViolationRef = useRef(onConstraintViolation);
  const onBlockCountChangeRef = useRef(onBlockCountChange);
  const blockLimitRef = useRef(blockLimit);
  const conceptStarterPresentationRef = useRef(conceptStarterPresentation);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const getCategoryLabel = (category: BlockCategory, fallback: string): string => {
    const key = `blockCategory.${category}`;
    const translated = t(key);
    return translated === key ? fallback : translated;
  };

  useEffect(() => {
    onWorkspaceReadyRef.current = onWorkspaceReady;
    onConstraintViolationRef.current = onConstraintViolation;
    onBlockCountChangeRef.current = onBlockCountChange;
    blockLimitRef.current = blockLimit;
    conceptStarterPresentationRef.current = conceptStarterPresentation;
  }, [onWorkspaceReady, onConstraintViolation, onBlockCountChange, blockLimit, conceptStarterPresentation]);

  useEffect(() => {
    let mounted = true;
    let dimDebounce: ReturnType<typeof setTimeout> | undefined;

    const styleId = "blockly-edu-theme-overrides";
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent = `
        .blocklyToolboxDiv {
          border-right: 1px solid var(--border);
          box-shadow: inset -1px 0 0 rgba(15, 23, 42, 0.03);
        }
        .blocklyTreeRow {
          margin: 6px 8px;
          border-radius: 10px;
          padding: 8px 10px;
          transition: background-color 0.2s ease;
          color: var(--text);
        }
        .blocklyTreeRow:hover {
          background: color-mix(in srgb, var(--primary) 18%, var(--surface));
        }
        .blocklyFlyout {
          border-left: 1px solid var(--border);
        }
        .blocklyMainBackground {
          stroke: var(--border);
        }
      `;
      document.head.appendChild(styleEl);
    }

    const dimStyleId = "blockly-concept-starter-dim";
    if (!document.getElementById(dimStyleId)) {
      const dimEl = document.createElement("style");
      dimEl.id = dimStyleId;
      dimEl.textContent = `
        svg.blocklySvg .blockly-concept-starter-block {
          opacity: 0.82;
        }
      `;
      document.head.appendChild(dimEl);
    }

    const initializeWorkspace = () => {
      if (!workspaceRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load block definitions from JSON
        const blockDefinitions: BlockConfig[] = loadLocalizedBlockRegistry(t, locale);
        blockDefinitionsRef.current = blockDefinitions;

        // Register blocks dynamically
        registerBlocks(blockDefinitions);

        // Generate dynamic toolbox
        const hiddenTypes = computeHiddenBlockTypes(blockDefinitions, bannedBlockTypes, visibleBlockTypes);
        hiddenTypesKeyRef.current = `${hiddenTypes.join("|")}|v:${visibleTypesKey}`;
        const toolbox = generateToolbox(blockDefinitions, {
          hiddenBlockTypes: hiddenTypes,
          getCategoryLabel,
        });

        if (!mounted) return;

        // Initialize Blockly workspace with dynamic toolbox
        blocklyWorkspaceRef.current = Blockly.inject(workspaceRef.current, {
          toolbox,
          grid: {
            spacing: 20,
            length: 2,
            colour: cssVar("--border", "#22324c"),
            snap: true,
          },
          zoom: {
            controls: true,
            wheel: true,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2,
          },
          trashcan: true,
          theme: createEduWorkspaceTheme(),
          move: {
            scrollbars: {
              horizontal: true,
              vertical: true,
            },
            drag: true,
            wheel: true,
          },
          sounds: false, // Disable audio to prevent AudioContext errors
        });

        setIsLoading(false);

        const workspace = blocklyWorkspaceRef.current;
        if (initialXmlKey && workspace) {
          try {
            const dom = Blockly.utils.xml.textToDom(initialXmlKey);
            Blockly.Xml.domToWorkspace(dom, workspace);
            Blockly.svgResize(workspace);
            if (conceptStarterPresentationRef.current) {
              requestAnimationFrame(() => applyConceptStarterDimClass(workspace));
              window.setTimeout(() => applyConceptStarterDimClass(workspace), 120);
            }
          } catch (e) {
            console.warn("BlocklyWorkspace: initialXml failed to parse or apply", e);
          }
        }

        // Force resize after initialization to fix display issues
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          if (blocklyWorkspaceRef.current && mounted) {
            Blockly.svgResize(blocklyWorkspaceRef.current);
          }
        }, 100);

        // Notify parent component that workspace is ready (sau khi đã ghép ví dụ nếu có)
        if (onWorkspaceReadyRef.current && workspace) {
          onWorkspaceReadyRef.current(workspace);
        }

        let revertingCreate = false;

        const reportBlockCount = () => {
          const totalBlocks = workspace
            .getAllBlocks(false)
            .filter((block) => !block.isShadow()).length;
          onBlockCountChangeRef.current?.(totalBlocks);
        };

        reportBlockCount();

        const scheduleDimRefresh = () => {
          if (!conceptStarterPresentationRef.current) return;
          if (dimDebounce) window.clearTimeout(dimDebounce);
          dimDebounce = window.setTimeout(() => {
            dimDebounce = undefined;
            applyConceptStarterDimClass(workspace);
          }, 70);
        };

        workspace.addChangeListener((event) => {
          if (revertingCreate) return;

          reportBlockCount();

          const et = event.type;
          if (
            conceptStarterPresentationRef.current &&
            (et === Blockly.Events.BLOCK_CREATE ||
              et === Blockly.Events.BLOCK_DELETE ||
              et === Blockly.Events.BLOCK_MOVE)
          ) {
            scheduleDimRefresh();
          }

          if (event.type !== Blockly.Events.BLOCK_CREATE) return;

          const limit = blockLimitRef.current;
          if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
            return;
          }

          const totalBlocks = workspace
            .getAllBlocks(false)
            .filter((block) => !block.isShadow()).length;
          if (totalBlocks <= limit) return;

          revertingCreate = true;
          workspace.undo(false);
          revertingCreate = false;
          onConstraintViolationRef.current?.(`${t("blockLimitReached")} (${limit}).`);
        });
      } catch (err) {
        if (mounted) {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to initialize workspace";
          setError(errorMessage);
          setIsLoading(false);
          console.error("Workspace initialization error:", err);
        }
      }
    };

    initializeWorkspace();

    // Cleanup function
    return () => {
      mounted = false;
      if (dimDebounce) window.clearTimeout(dimDebounce);
      if (blocklyWorkspaceRef.current) {
        blocklyWorkspaceRef.current.dispose();
        blocklyWorkspaceRef.current = null;
      }
    };
  }, [workspaceId, locale, t, bannedTypesKey, visibleTypesKey, initialXmlKey]);

  useEffect(() => {
    const workspace = blocklyWorkspaceRef.current;
    const blockDefinitions = blockDefinitionsRef.current;
    if (!workspace || !blockDefinitions) return;

    const hiddenTypes = computeHiddenBlockTypes(blockDefinitions, bannedBlockTypes, visibleBlockTypes);
    const nextKey = `${hiddenTypes.join("|")}|v:${visibleTypesKey}`;
    if (nextKey === hiddenTypesKeyRef.current) return;

    hiddenTypesKeyRef.current = nextKey;
    workspace.updateToolbox(
      generateToolbox(blockDefinitions, {
        hiddenBlockTypes: hiddenTypes,
        getCategoryLabel,
      }),
    );
  }, [bannedTypesKey, visibleTypesKey, t]);

  useEffect(() => {
    const workspace = blocklyWorkspaceRef.current;
    if (!workspace) return;

    const xmlSnapshot = Blockly.Xml.workspaceToDom(workspace);
    const blockDefinitions = loadLocalizedBlockRegistry(t, locale);
    blockDefinitionsRef.current = blockDefinitions;
    registerBlocks(blockDefinitions);

    const hiddenTypes = computeHiddenBlockTypes(blockDefinitions, bannedBlockTypes, visibleBlockTypes);
    hiddenTypesKeyRef.current = `${hiddenTypes.join("|")}|v:${visibleTypesKey}`;
    workspace.updateToolbox(
      generateToolbox(blockDefinitions, {
        hiddenBlockTypes: hiddenTypes,
        getCategoryLabel,
      }),
    );

    workspace.clear();
    Blockly.Xml.domToWorkspace(xmlSnapshot, workspace);
    Blockly.svgResize(workspace);
    if (conceptStarterPresentationRef.current) {
      requestAnimationFrame(() => applyConceptStarterDimClass(workspace));
      window.setTimeout(() => applyConceptStarterDimClass(workspace), 120);
    }
  }, [locale, bannedTypesKey, visibleTypesKey, t]);

  // Handle container resize
  useEffect(() => {
    const container = workspaceRef.current;
    if (!container || !blocklyWorkspaceRef.current) return;

    // Create ResizeObserver to watch container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (blocklyWorkspaceRef.current) {
        Blockly.svgResize(blocklyWorkspaceRef.current);
      }
    });

    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [isLoading]); // Re-setup after loading completes

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(245, 245, 245, 0.95)",
            zIndex: 1000,
          }}
        >
          <div>{t("loadingBlockEditor")}</div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffebee",
            color: "#c62828",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div>
            <strong>{t("errorLabel")}:</strong> {error}
          </div>
        </div>
      )}

      {/* Blockly workspace div (always rendered) */}
      <div
        id={workspaceId}
        ref={workspaceRef}
        style={{
          height: "100%",
          width: "100%",
        }}
      />
    </div>
  );
};

// Memoize to prevent unnecessary re-renders from parent component
export default React.memo(BlocklyWorkspace);
