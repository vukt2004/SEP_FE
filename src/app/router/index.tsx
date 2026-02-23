import { createBrowserRouter } from "react-router-dom";
import HomePage from "../../pages/Home";
import GameView from "../../pages/Game-View/GameView";
import PlatformGameView from "../../pages/Game-View/PlatformGameView";
import MapEditor from "../../pages/Map-Editor/MapEditor";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/game", element: <GameView /> },
  { path: "/platform", element: <PlatformGameView /> },
  { path: "/map-editor", element: <MapEditor /> },
]);
