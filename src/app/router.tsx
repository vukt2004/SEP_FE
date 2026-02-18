import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/shared/pages/Home";
import GameView from "../shared/features/game-view/GameView";
import PlatformGameView from "../shared/features/game-view/PlatformGameView";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/game", element: <GameView /> },
  { path: "/platform", element: <PlatformGameView /> },
]);
