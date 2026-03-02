// src/portals/student/layout/StudentLayout.tsx
import { Outlet } from "react-router-dom";

export default function StudentLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main className="container" style={{ paddingTop: 18, paddingBottom: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
