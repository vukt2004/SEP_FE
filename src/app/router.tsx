import { createBrowserRouter } from "react-router-dom";
import HomePage from "@/pages/Home";
import GameView from "../features/game-view/GameView";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/game", element: <GameView /> },
]);
