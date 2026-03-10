// src/portals/learner/layout/LearnerLayout.tsx
import { Outlet } from "react-router-dom";
import LearnerHeader from "../components/LearnerHeader";
import LearnerSidebar from "../components/LearnerSidebar";

export default function LearnerLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <LearnerHeader />
      <div style={{ display: "flex" }}>
        <LearnerSidebar />
        <main style={{ flex: 1, padding: "16px 24px 24px", minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
