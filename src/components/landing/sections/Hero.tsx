function Pill({ text, tone }: { text: string; tone: "info" | "primary" | "accent" }) {
  const map = {
    info: "var(--info)",
    primary: "var(--primary)",
    accent: "var(--accent)",
  } as const;

  return (
    <span className="pill">
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: map[tone] }} />
      {text}
    </span>
  );
}

export function Hero() {
  return (
    <section className="section">
      <div className="container">
        <div
          className="card"
          style={{
            padding: 28,
            background: "var(--surface)",
            borderRadius: 18,
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 24,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
              <Pill text="2D Puzzle" tone="info" />
              <Pill text="Block-based" tone="primary" />
              <Pill text="Competitive Mode" tone="accent" />
            </div>

            <h1 style={{ margin: "0 0 10px", fontSize: 44, lineHeight: 1.08, letterSpacing: -0.4 }}>
              Học tư duy lập trình bằng game 2D — nhanh, rõ, và có tính cạnh tranh
            </h1>

            <p
              style={{ margin: "0 0 18px", color: "var(--text-2)", fontSize: 16, lineHeight: 1.6 }}
            >
              QuackOrbit biến các khái niệm như điều kiện, vòng lặp, biến và hàm thành nhiệm vụ giải
              đố trực quan. Bạn học qua thử–sai, nhận điểm, leo rank, và có thể xây level chia sẻ
              cộng đồng.
            </p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <button className="btn btnPrimary">
                Bắt đầu ngay <span aria-hidden>→</span>
              </button>

              <button className="btn btnSecondary">
                Xem demo <span className="kbd">D</span>
              </button>

              <button className="btn btnAccent">
                Vào đấu rank <span aria-hidden>⚡</span>
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "var(--muted)",
                fontSize: 13,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span>• Realtime events (SignalR)</span>
              <span>• Challenge + Competitive</span>
              <span>• Marketplace / UGC</span>
            </div>
          </div>

          {/* Right panel mock */}
          <div
            className="card"
            style={{ padding: 16, background: "var(--surface-2)", borderRadius: 16 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 700 }}>Live Room</div>
              <span style={{ color: "var(--muted)", fontSize: 12 }}>Ping: 34ms</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div
                className="card"
                style={{ padding: 12, background: "var(--surface)", borderRadius: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-2)" }}>Leaderboard</span>
                  <span style={{ color: "var(--info)", fontSize: 12 }}>LIVE</span>
                </div>
                <Row name="DuckCoder" score="1280 XP" tone="accent" />
                <Row name="LoopMaster" score="1210 XP" tone="primary" />
                <Row name="IfElsePro" score="1165 XP" tone="info" />
              </div>

              <div
                className="card"
                style={{ padding: 12, background: "var(--surface)", borderRadius: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-2)" }}>Mission</span>
                  <span style={{ color: "var(--muted)", fontSize: 12 }}>#CH-04</span>
                </div>
                <div style={{ color: "var(--text)", fontWeight: 700, marginBottom: 6 }}>
                  Sử dụng vòng lặp để thu thập 5 coin
                </div>
                <div style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>
                  Gợi ý: dùng <span style={{ color: "var(--primary)" }}>repeat</span> + điều kiện
                  dừng.
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Tag label="Loops" tone="primary" />
                  <Tag label="Conditions" tone="accent" />
                  <Tag label="Realtime" tone="info" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 980px){
            .section .card[style*="grid-template-columns"]{
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}

function Row({
  name,
  score,
  tone,
}: {
  name: string;
  score: string;
  tone: "primary" | "accent" | "info";
}) {
  const color =
    tone === "primary" ? "var(--primary)" : tone === "accent" ? "var(--accent)" : "var(--info)";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span style={{ color: "var(--text)" }}>{name}</span>
      <span style={{ color, fontWeight: 700 }}>{score}</span>
    </div>
  );
}

function Tag({ label, tone }: { label: string; tone: "primary" | "accent" | "info" }) {
  const map = {
    primary: { bg: "color-mix(in srgb, var(--primary) 18%, transparent)", text: "var(--primary)" },
    accent: { bg: "color-mix(in srgb, var(--accent) 18%, transparent)", text: "var(--accent)" },
    info: { bg: "color-mix(in srgb, var(--info) 18%, transparent)", text: "var(--info)" },
  } as const;

  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: map[tone].bg,
        color: map[tone].text,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}
