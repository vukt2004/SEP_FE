const STEPS = [
  {
    title: "Chọn nhiệm vụ",
    desc: "Bắt đầu bằng challenge theo chủ đề: điều kiện, vòng lặp, biến, hàm…",
    tone: "primary" as const,
  },
  {
    title: "Lắp ghép block",
    desc: "Kéo-thả block để tạo logic. Hệ thống kiểm tra và feedback ngay lập tức.",
    tone: "info" as const,
  },
  {
    title: "Nhận XP & leo rank",
    desc: "Hoàn thành nhanh hơn, đúng hơn → nhiều điểm hơn. Vào Competitive để thử sức.",
    tone: "accent" as const,
  },
];

export function HowItWorks() {
  return (
    <section className="section alt" id="how">
      <div className="container">
        <h2 style={{ margin: "0 0 10px", fontSize: 32, letterSpacing: -0.2 }}>Cách hoạt động</h2>
        <p style={{ margin: "0 0 22px", color: "var(--text-2)", lineHeight: 1.6, maxWidth: 820 }}>
          Quy trình cực ngắn: chọn → làm → nhận feedback → tối ưu.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {STEPS.map((s, idx) => (
            <StepCard key={s.title} index={idx + 1} {...s} />
          ))}
        </div>

        <style>{`
          @media (max-width: 980px){
            #how .container > div{ grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

function StepCard({
  index,
  title,
  desc,
  tone,
}: {
  index: number;
  title: string;
  desc: string;
  tone: "primary" | "info" | "accent";
}) {
  const color =
    tone === "primary" ? "var(--primary)" : tone === "accent" ? "var(--accent)" : "var(--info)";

  return (
    <div className="card" style={{ padding: 18, background: "var(--surface)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--surface-2)",
            display: "grid",
            placeItems: "center",
            color,
            fontWeight: 900,
          }}
        >
          {index}
        </div>
        <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>
      </div>

      <div style={{ color: "var(--text-2)", lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}
