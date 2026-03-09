// src/portals/learner/components/layout/LearnerHeader.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { ROUTES } from "@/lib/constants/routes";

export default function LearnerHeader() {
  const navigate = useNavigate();

  const onLogout = () => {
    // TODO: thay bằng logic logout thật của bạn (auth store/service)
    localStorage.removeItem("qo_learner_token");
    navigate(ROUTES.LANDING ?? "/", { replace: true });
  };

  return (
    <header
      style={{
        position: "sticky",
        height: 95,
        top: 0,
        zIndex: 30,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        overflow: "visible",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          paddingTop: 12,
          paddingBottom: 12,
        }}
      >
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <NavLink
            to={ROUTES.LEARNER_HOME ?? "/app"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              textDecoration: "none",
              color: "var(--text)",
              fontWeight: 800,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            <a style={{ display: "block", height: "100%", paddingRight: 40, paddingTop: 10 }}>
              <img
                src="/brand/logo.png"
                alt="QuackOrbit"
                style={{
                  height: 80, // kích thước layout (nhỏ, không đẩy header)
                  width: "auto",
                  display: "block",
                  objectFit: "contain",
                  transform: "scale(1.8)", // kích thước hiển thị (to lên)
                  transformOrigin: "left center",
                }}
              />
            </a>
          </NavLink>

          <nav aria-label="Learner primary" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <TopNavLink to={ROUTES.LEARNER_HOME ?? "/app"} label="Home" />
            <TopNavLink to={ROUTES.LEARNER_LEARN ?? "/app/browse"} label="Game Mode Browse" />
            <TopNavLink to={ROUTES.LEARNER_PROFILE ?? "/app/profile"} label="Profile" />
            <TopNavLink to={ROUTES.LEARNER_PACKAGES ?? "/app/packages"} label="Packages" />
            <TopNavLink to={ROUTES.MAP_EDITOR ?? "/map-editor"} label="Map Editor" />
          </nav>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SearchBox />
          <button
            type="button"
            onClick={onLogout}
            style={{
              cursor: "pointer",
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              fontWeight: 800,
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

function TopNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        textDecoration: "none",
        color: isActive ? "var(--text)" : "var(--muted)",
        fontWeight: 700,
        padding: "8px 10px",
        borderRadius: 10,
        background: isActive ? "var(--surface)" : "transparent",
        border: isActive ? "1px solid var(--border)" : "1px solid transparent",
      })}
    >
      {label}
    </NavLink>
  );
}

function SearchBox() {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        minWidth: 260,
      }}
    >
      <span aria-hidden style={{ color: "var(--muted)" }}>
        🔎
      </span>
      <input
        placeholder="Search challenges..."
        aria-label="Search"
        style={{
          width: "100%",
          outline: "none",
          border: "none",
          background: "transparent",
          color: "var(--text)",
          fontSize: 14,
        }}
      />
    </label>
  );
}
