import { createBrowserRouter } from "react-router-dom";
import HomePage from "../../pages/Home";
import GameView from "../../pages/Game-View/GameView";
import PlatformGameView from "../../pages/Game-View/PlatformGameView";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/game", element: <GameView /> },
  { path: "/platform", element: <PlatformGameView /> },
]);
