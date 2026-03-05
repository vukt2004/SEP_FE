export function SocialProof() {
  return (
    <section className="section alt">
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 28, letterSpacing: -0.2 }}>
              Focus on real learning outcomes
            </h2>
            <p style={{ margin: "10px 0 0", color: "var(--text-2)", lineHeight: 1.6 }}>
              Short tasks, clear feedback, and a points/leaderboard system help maintain learning
              motivation.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Stat label="Levels" value="120+" tone="info" />
            <Stat label="Challenges" value="30+" tone="primary" />
            <Stat label="Players" value="Realtime" tone="accent" />
          </div>
        </div>

        <style>{`
          @media (max-width: 980px){
            .section.alt .container > div{ grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "info" | "primary" | "accent";
}) {
  const color =
    tone === "primary" ? "var(--primary)" : tone === "accent" ? "var(--accent)" : "var(--info)";
  return (
    <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.2 }}>{value}</div>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>{label}</div>
    </div>
  );
}
