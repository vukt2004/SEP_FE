import { useEffect, useRef } from "react";
import { createBorderedMap } from "../../modules/map-system/mapFactory";
import { GameEngine } from "../../modules/engine/core/GameEngine";
import { EngineCommand } from "../../modules/executor/commands";
import type { BlockProgram } from "../../modules/executor/types";
import { StepExecutor } from "../../modules/executor/StepExecutor";
import type { EngineEvent } from "../../modules/engine/core/engineEvents";
// import { setupCollisionExample } from "../../modules/engine/COLLISION_USAGE_EXAMPLE";

export default function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const executorRef = useRef<StepExecutor | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const map = createBorderedMap(15, 12, 16);
    canvas.width = map.width * map.tileSize;
    canvas.height = map.height * map.tileSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new GameEngine(map, ctx);
    engineRef.current = engine;

    // Integrate collision example
    // setupCollisionExample(engine, map);

    // Async initialization
    const initAndStart = async () => {
      await engine.initialize();
      engine.start();
    };

    initAndStart();

    // Create sample program with repeat and ifObstacleAhead
    const program: BlockProgram = [
      {
        id: "1",
        type: "repeat",
        times: 100,
        children: [
          {
            id: "2",
            type: "ifObstacleAhead",
            children: [{ id: "2-1", type: "turnLeft" }],
          },
          { id: "3", type: "move" },
        ],
      },
    ];

    const executor = new StepExecutor(program, () => engine.isObstacleAhead());
    executorRef.current = executor;

    // Event listeners
    const handleWin = () => {
      executor.stop();
      alert("You win!");
    };

    const handleObjectStateChanged = (event: EngineEvent) => {
      if (event.type === "objectStateChanged") {
        console.log("Object changed:", event);
      }
    };

    engine.on("win", handleWin);
    engine.on("objectStateChanged", handleObjectStateChanged);

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          engine.executeCommand(EngineCommand.MOVE_FORWARD);
          break;
        case "ArrowLeft":
          engine.executeCommand(EngineCommand.TURN_LEFT);
          break;
        case "ArrowRight":
          engine.executeCommand(EngineCommand.TURN_RIGHT);
          break;
        case " ": // Space key for step-by-step execution
          if (executor.hasNext()) {
            const cmd = executor.next();
            if (cmd) {
              engine.executeCommand(cmd);
            }
          }
          break;
        case "r":
        case "R": // R key to start auto-run
          executor.run((cmd) => {
            engine.executeCommand(cmd);
          }, 500);
          break;
        case "s":
        case "S": // S key to stop auto-run
          executor.stop();
          break;
        case "e":
        case "E": // E key to interact
          engine.executeCommand(EngineCommand.INTERACT);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.off("win", handleWin);
      engine.off("objectStateChanged", handleObjectStateChanged);
      executor.stop();
      engine.stop();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}
