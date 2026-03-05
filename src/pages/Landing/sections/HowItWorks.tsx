const STEPS = [
  {
    title: "Choose a task",
    desc: "Start with themed challenges: conditions, loops, variables, functions…",
    tone: "primary" as const,
  },
  {
    title: "Assemble blocks",
    desc: "Drag and drop blocks to create logic. The system checks and provides instant feedback.",
    tone: "info" as const,
  },
  {
    title: "Earn XP & climb ranks",
    desc: "Complete faster and more accurately → more points. Enter Competitive to test your skills.",
    tone: "accent" as const,
  },
];

export function HowItWorks() {
  return (
    <section className="section alt" id="how">
      <div className="container">
        <h2 style={{ margin: "0 0 10px", fontSize: 32, letterSpacing: -0.2 }}>How It Works</h2>
        <p style={{ margin: "0 0 22px", color: "var(--text-2)", lineHeight: 1.6, maxWidth: 820 }}>
          Very short workflow: choose → do → receive feedback → optimize.
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
