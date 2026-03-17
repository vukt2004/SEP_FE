// src/portals/learner/layout/LearnerLayout.tsx
import { Outlet } from "react-router-dom";
import LearnerHeader from "../components/LearnerHeader";

export default function LearnerLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <LearnerHeader />
      <main
        style={{
          flex: 1,
          padding: "24px 48px 40px",
          margin: "0 auto",
          maxWidth: 1440,
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
