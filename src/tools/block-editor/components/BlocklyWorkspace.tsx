import React, { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
import "blockly/javascript";
import { useTranslation } from "@/lib/i18n/translations";
import { loadLocalizedBlockRegistry } from "../utils/blockLoader";
import { registerBlocks } from "../blocks/registerBlocks";
import { generateToolbox } from "../utils/generateToolbox";
import type { BlockConfig } from "../types/blockDefinition";
import type { BlockCategory } from "../types/blockDefinition";

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
  blockLimit?: number | null;
  onConstraintViolation?: (message: string) => void;
  onBlockCountChange?: (count: number) => void;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({
  workspaceId = "blockly-workspace",
  onWorkspaceReady,
  bannedBlockTypes = [],
  blockLimit = null,
  onConstraintViolation,
  onBlockCountChange,
}) => {
  const { t, locale } = useTranslation();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const blocklyWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const blockDefinitionsRef = useRef<BlockConfig[] | null>(null);
  const hiddenTypesKeyRef = useRef<string>("");
  const onWorkspaceReadyRef = useRef(onWorkspaceReady);
  const onConstraintViolationRef = useRef(onConstraintViolation);
  const onBlockCountChangeRef = useRef(onBlockCountChange);
  const blockLimitRef = useRef(blockLimit);
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
  }, [onWorkspaceReady, onConstraintViolation, onBlockCountChange, blockLimit]);

  useEffect(() => {
    let mounted = true;

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
        const hiddenTypes = Array.from(new Set(bannedBlockTypes)).sort();
        hiddenTypesKeyRef.current = hiddenTypes.join("|");
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

        // Force resize after initialization to fix display issues
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
          if (blocklyWorkspaceRef.current && mounted) {
            Blockly.svgResize(blocklyWorkspaceRef.current);
          }
        }, 100);

        // Notify parent component that workspace is ready
        if (onWorkspaceReadyRef.current && blocklyWorkspaceRef.current) {
          onWorkspaceReadyRef.current(blocklyWorkspaceRef.current);
        }

        const workspace = blocklyWorkspaceRef.current;
        let revertingCreate = false;

        const reportBlockCount = () => {
          const totalBlocks = workspace
            .getAllBlocks(false)
            .filter((block) => !block.isShadow()).length;
          onBlockCountChangeRef.current?.(totalBlocks);
        };

        reportBlockCount();

        workspace.addChangeListener((event) => {
          if (revertingCreate) return;

          reportBlockCount();

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
      if (blocklyWorkspaceRef.current) {
        blocklyWorkspaceRef.current.dispose();
        blocklyWorkspaceRef.current = null;
      }
    };
  }, [workspaceId]);

  useEffect(() => {
    const workspace = blocklyWorkspaceRef.current;
    const blockDefinitions = blockDefinitionsRef.current;
    if (!workspace || !blockDefinitions) return;

    const hiddenTypes = Array.from(new Set(bannedBlockTypes)).sort();
    const nextKey = hiddenTypes.join("|");
    if (nextKey === hiddenTypesKeyRef.current) return;

    hiddenTypesKeyRef.current = nextKey;
    workspace.updateToolbox(
      generateToolbox(blockDefinitions, {
        hiddenBlockTypes: hiddenTypes,
        getCategoryLabel,
      }),
    );
  }, [bannedBlockTypes, t]);

  useEffect(() => {
    const workspace = blocklyWorkspaceRef.current;
    if (!workspace) return;

    const xmlSnapshot = Blockly.Xml.workspaceToDom(workspace);
    const blockDefinitions = loadLocalizedBlockRegistry(t, locale);
    blockDefinitionsRef.current = blockDefinitions;
    registerBlocks(blockDefinitions);

    const hiddenTypes = Array.from(new Set(bannedBlockTypes)).sort();
    hiddenTypesKeyRef.current = hiddenTypes.join("|");
    workspace.updateToolbox(
      generateToolbox(blockDefinitions, {
        hiddenBlockTypes: hiddenTypes,
        getCategoryLabel,
      }),
    );

    workspace.clear();
    Blockly.Xml.domToWorkspace(xmlSnapshot, workspace);
    Blockly.svgResize(workspace);
  }, [locale]);

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
