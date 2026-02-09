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
              Sẵn sàng “học bằng chơi” chưa?
            </h2>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6 }}>
              Bắt đầu với challenge ngắn hoặc vào competitive để thử sức realtime.
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="btn btnSecondary">Xem roadmap</button>
            <button className="btn btnPrimary">Tạo tài khoản</button>
            <button className="btn btnAccent">Vào phòng đấu</button>
          </div>
        </div>

        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 12 }}>
          Tip: Nhấn <span className="kbd">D</span> để mở demo (nếu bạn gắn phím tắt sau).
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
