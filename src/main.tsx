import React from "react";
import ReactDOM from "react-dom/client";
import "@/shared/styles/tokens.css";
import App from "./app/App";

const savedTheme = localStorage.getItem("quackorbit_theme");
if (savedTheme === "light" || savedTheme === "dark") {
  document.documentElement.setAttribute("data-theme", savedTheme);
} else {
  document.documentElement.setAttribute("data-theme", "dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
