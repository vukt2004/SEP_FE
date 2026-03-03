import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { hydrateAuth } from "./bootstrap/hydrateAuth";

// Hydrate auth BEFORE React renders to prevent flash of login page
hydrateAuth();

export default function App() {
  return <RouterProvider router={router} />;
}
