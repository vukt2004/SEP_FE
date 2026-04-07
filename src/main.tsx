import React from "react";
import ReactDOM from "react-dom/client";
import "@/shared/styles/tokens.css";
import App from "./app/App";
import { applyTheme } from "@/stores/theme.store";

const savedTheme = localStorage.getItem("quackorbit_theme");
if (savedTheme === "light" || savedTheme === "dark") {
  applyTheme(savedTheme);
} else {
  applyTheme("dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
