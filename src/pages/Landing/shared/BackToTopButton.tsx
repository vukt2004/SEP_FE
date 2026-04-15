import { useEffect, useState } from "react";
import { palette } from "../landing.theme";

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      id="back-to-top-btn"
      aria-label="Back to top"
      onClick={scrollToTop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "fixed",
        bottom: 32,
        right: 32,
        zIndex: 999,
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: `1.5px solid ${hovered ? palette.primary : palette.border}`,
        background: hovered ? palette.primary : palette.surface,
        color: hovered ? "#fff" : palette.primary,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: hovered
          ? "0 6px 28px rgba(0,0,0,.35)"
          : "0 4px 24px rgba(0,0,0,.25)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible
          ? hovered
            ? "translateY(-3px)"
            : "translateY(0)"
          : "translateY(16px)",
        transition:
          "opacity .35s ease, transform .35s ease, background .2s ease, border-color .2s ease, color .2s ease, box-shadow .2s ease",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
