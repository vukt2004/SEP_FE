import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/pages/Home";
import GameView from "../features/game-view/GameView";
import PlatformGameView from "../features/game-view/PlatformGameView";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/game", element: <GameView /> },
  { path: "/platform", element: <PlatformGameView /> },
]);
