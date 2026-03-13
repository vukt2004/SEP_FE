import React, { useEffect, useRef, useState } from "react";
import * as Blockly from "blockly";
import "blockly/blocks";
import "blockly/javascript";
import { loadBlockRegistry } from "../utils/blockLoader";
import { registerBlocks } from "../blocks/registerBlocks";
import { generateToolbox } from "../utils/generateToolbox";
import type { BlockConfig } from "../types/blockDefinition";

interface BlocklyWorkspaceProps {
  workspaceId?: string;
  onWorkspaceReady?: (workspace: Blockly.WorkspaceSvg) => void;
}

const BlocklyWorkspace: React.FC<BlocklyWorkspaceProps> = ({
  workspaceId = "blockly-workspace",
  onWorkspaceReady,
}) => {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const blocklyWorkspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeWorkspace = () => {
      if (!workspaceRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load block definitions from JSON
        const blockDefinitions: BlockConfig[] = loadBlockRegistry();

        // Register blocks dynamically
        registerBlocks(blockDefinitions);

        // Generate dynamic toolbox
        const toolbox = generateToolbox(blockDefinitions);

        if (!mounted) return;

        // Initialize Blockly workspace with dynamic toolbox
        blocklyWorkspaceRef.current = Blockly.inject(workspaceRef.current, {
          toolbox,
          grid: {
            spacing: 20,
            length: 3,
            colour: "#ccc",
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
          theme: Blockly.Themes.Classic,
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
  }, [onWorkspaceReady]);

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
