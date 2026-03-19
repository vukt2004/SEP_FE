import React, { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
import "blockly/javascript";
import { loadBlockRegistry } from "../utils/blockLoader";
import { registerBlocks } from "../blocks/registerBlocks";
import { generateToolbox } from "../utils/generateToolbox";
import type { BlockConfig } from "../types/blockDefinition";

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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const blocklyWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        const blockedTypes = new Set(bannedBlockTypes);
        const blockDefinitions: BlockConfig[] = loadBlockRegistry().map((block) => {
          if (!blockedTypes.has(block.type)) {
            return block;
          }

          return {
            ...block,
            tooltip: "This block is not allowed in this level",
          };
        });

        // Register blocks dynamically
        registerBlocks(blockDefinitions);

        // Generate dynamic toolbox
        const toolbox = generateToolbox(blockDefinitions, {
          disabledBlockTypes: bannedBlockTypes,
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
        if (onWorkspaceReady && blocklyWorkspaceRef.current) {
          onWorkspaceReady(blocklyWorkspaceRef.current);
        }

        const workspace = blocklyWorkspaceRef.current;
        let revertingCreate = false;

        const reportBlockCount = () => {
          const totalBlocks = workspace
            .getAllBlocks(false)
            .filter((block) => !block.isShadow()).length;
          onBlockCountChange?.(totalBlocks);
        };

        reportBlockCount();

        workspace.addChangeListener((event) => {
          if (revertingCreate) return;

          reportBlockCount();

          if (event.type !== Blockly.Events.BLOCK_CREATE) return;

          if (typeof blockLimit !== "number" || !Number.isFinite(blockLimit) || blockLimit <= 0) {
            return;
          }

          const totalBlocks = workspace
            .getAllBlocks(false)
            .filter((block) => !block.isShadow()).length;
          if (totalBlocks <= blockLimit) return;

          revertingCreate = true;
          workspace.undo(false);
          revertingCreate = false;
          onConstraintViolation?.(`Block limit reached (${blockLimit}).`);
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
  }, [bannedBlockTypes, blockLimit, onBlockCountChange, onConstraintViolation, onWorkspaceReady]);

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
          <div>Loading block editor...</div>
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
            <strong>Error:</strong> {error}
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
