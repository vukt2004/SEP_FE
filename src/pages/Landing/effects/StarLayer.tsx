import { useMemo } from "react";
import { motion } from "framer-motion";
import { palette } from "../landing.theme";

export default function StarLayer() {
  const stars = useMemo(
    () =>
      Array.from({ length: 56 }).map((_, i) => ({
        id: i,
        left: `${(i * 9.7) % 100}%`,
        top: `${(i * 15.3) % 100}%`,
        size: i % 4 === 0 ? 3 : 2,
        duration: 2.5 + (i % 6) * 0.5,
        delay: (i % 7) * 0.25,
        color: i % 5 === 0 ? palette.accent : i % 4 === 0 ? palette.cyan : palette.text,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            background: star.color,
            boxShadow:
              star.color === palette.accent
                ? `0 0 16px ${palette.accent}`
                : star.color === palette.cyan
                  ? `0 0 16px ${palette.cyan}`
                  : "0 0 12px rgba(237,243,251,0.55)",
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1.2, 0.85] }}
          transition={{
            repeat: Infinity,
            duration: star.duration,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
