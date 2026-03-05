// src/portals/student/layout/StudentLayout.tsx
import { Outlet } from "react-router-dom";
import StudentHeader from "../components/StudentHeader";

export default function StudentLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <StudentHeader />
      <main className="container" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}
