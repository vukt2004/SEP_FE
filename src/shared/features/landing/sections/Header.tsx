import { useMemo, useState } from "react";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Header() {
  const [open, setOpen] = useState(false);

  const nav = useMemo(
    () => [
      { label: "Tính năng", id: "features" },
      { label: "Cách hoạt động", id: "how" },
      { label: "Bắt đầu", id: "cta" },
    ],
    [],
  );

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(11,18,32,0.85)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        className="container"
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              color: "var(--info)",
              fontWeight: 800,
            }}
          >
            Q
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 800, letterSpacing: 0.2 }}>QuackOrbit</span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Game-based learning platform
            </span>
          </div>
        </div>

        <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="pill" style={{ display: "none" }} />

          <div className="desktopNav" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {nav.map((x) => (
              <button
                key={x.id}
                className="btn btnSecondary"
                style={{ padding: "10px 12px" }}
                onClick={() => scrollToId(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>

          <button className="btn btnPrimary" onClick={() => scrollToId("cta")}>
            Chơi ngay
          </button>

          <button
            className="btn btnSecondary"
            style={{ padding: "10px 12px", display: "none" }}
            onClick={() => setOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </nav>
      </div>

      {/* Mobile dropdown (tùy bạn bật bằng CSS) */}
      {open && (
        <div className="container" style={{ paddingBottom: 12 }}>
          <div className="card" style={{ padding: 12 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {nav.map((x) => (
                <button
                  key={x.id}
                  className="btn btnSecondary"
                  style={{ justifyContent: "space-between" }}
                  onClick={() => {
                    setOpen(false);
                    scrollToId(x.id);
                  }}
                >
                  <span>{x.label}</span>
                  <span style={{ color: "var(--muted)" }}>↗</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
