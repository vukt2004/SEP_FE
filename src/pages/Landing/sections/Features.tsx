const FEATURES = [
  {
    title: "Challenge Mode",
    desc: "Giải đố theo cấp độ với mục tiêu rõ ràng. Học nhanh các khái niệm cốt lõi bằng nhiệm vụ ngắn.",
    tone: "primary" as const,
    bullets: ["Feedback tức thì", "Gợi ý theo ngữ cảnh", "Theo dõi tiến độ"],
  },
  {
    title: "Competitive Mode",
    desc: "Thi đấu realtime để tối ưu lời giải. Hệ thống rank tạo động lực học dài hạn.",
    tone: "accent" as const,
    bullets: ["Realtime scoreboard", "Matchmaking", "Phân tích hiệu suất"],
  },
  {
    title: "Marketplace / UGC",
    desc: "Tạo level và chia sẻ cộng đồng. Mở rộng nội dung liên tục mà không phụ thuộc dev team.",
    tone: "info" as const,
    bullets: ["Publish level", "Rating & review", "Moderation workflow"],
  },
];

export function Features() {
  return (
    <section className="section" id="features">
      <div className="container">
        <h2 style={{ margin: "0 0 10px", fontSize: 32, letterSpacing: -0.2 }}>Tính năng chính</h2>
        <p style={{ margin: "0 0 22px", color: "var(--text-2)", lineHeight: 1.6, maxWidth: 820 }}>
          Nền tảng được thiết kế theo hướng “học qua chơi”: nhiệm vụ rõ, tiến độ rõ, và động lực rõ.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>

        <style>{`
            @media (max-width: 980px){
                #features .container > div{ grid-template-columns: 1fr !important; }
            }
            @media (min-width: 981px) and (max-width: 1180px){
                #features .container > div{ grid-template-columns: repeat(2, 1fr) !important; }
            }
        `}</style>
      </div>
    </section>
  );
}

function FeatureCard(props: {
  title: string;
  desc: string;
  bullets: string[];
  tone: "primary" | "accent" | "info" | "warning";
}) {
  const toneColor =
    props.tone === "primary"
      ? "var(--primary)"
      : props.tone === "accent"
        ? "var(--accent)"
        : props.tone === "info"
          ? "var(--info)"
          : "var(--warning)";

  return (
    <div className="card" style={{ padding: 18, background: "var(--surface)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 900 }}>{props.title}</div>
        <span
          style={{
            width: 34,
            height: 34,
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            color: toneColor,
            fontWeight: 900,
          }}
          aria-hidden
        >
          ◆
        </span>
      </div>

      <div style={{ color: "var(--text-2)", lineHeight: 1.6 }}>{props.desc}</div>

      <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "var(--text-2)" }}>
        {props.bullets.map((b) => (
          <li key={b} style={{ margin: "6px 0" }}>
            <span style={{ color: toneColor, fontWeight: 800 }}>•</span> {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
