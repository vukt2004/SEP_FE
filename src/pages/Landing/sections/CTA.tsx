export function CTA() {
  return (
    <section className="section" id="cta">
      <div className="container">
        <div
          className="card"
          style={{
            padding: 22,
            background: "var(--surface)",
            display: "grid",
            gridTemplateColumns: "1.2fr 0.8fr",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 10px", fontSize: 30, letterSpacing: -0.2 }}>
              Ready to "learn by playing"?
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6 }}>
              Start with a short challenge or enter competitive mode to test your skills in
              real-time.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="btn btnSecondary">View roadmap</button>
            <button className="btn btnPrimary">Create account</button>
            <button className="btn btnAccent">Join battle room</button>
          </div>
        </div>

        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
          Tip: Press <span className="kbd">D</span> to open demo (if you set up the shortcut later).
        </div>

        <style>{`
          @media (max-width: 980px){
            #cta .card{ grid-template-columns: 1fr !important; }
            #cta .card > div:last-child{ justify-content: flex-start !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
