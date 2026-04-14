// src/portals/learner/layout/LearnerLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import LearnerHeader from "../components/LearnerHeader";

export default function LearnerLayout() {
  const location = useLocation();
  // Chat pages get a special full-height layout with no extra padding
  const isChatPage = location.pathname.startsWith("/app/chat");

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--text)",
        overflow: "hidden",
      }}
    >
      <LearnerHeader />
      <main
        style={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          minHeight: 0,
          overflow: isChatPage ? "hidden" : "auto",
          padding: isChatPage ? 0 : "24px 16px 40px",
          margin: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
