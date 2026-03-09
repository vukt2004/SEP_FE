// src/portals/learner/layout/LearnerLayout.tsx
import { Outlet } from "react-router-dom";
import LearnerHeader from "../components/LearnerHeader";

export default function LearnerLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <LearnerHeader />
      <main className="container" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
