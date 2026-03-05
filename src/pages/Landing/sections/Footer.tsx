export function Footer() {
  return (
    <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div className="container" style={{ padding: "22px 0" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}
        >
          <div>
            <div style={{ fontWeight: 900 }}>QuackOrbit</div>
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6 }}>
              2D game-based platform for learning logic programming
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
              alignItems: "center",
              color: "var(--text-2)",
            }}
          >
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>
            <a href="#cta">Get Started</a>
          </div>
        </div>

        <hr className="hr" style={{ margin: "16px 0" }} />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            color: "var(--muted)",
            fontSize: 12,
          }}
        >
          <span>© {new Date().getFullYear()} QuackOrbit</span>
          <span>No gradients • Solid color system</span>
        </div>
      </div>
    </footer>
  );
}
