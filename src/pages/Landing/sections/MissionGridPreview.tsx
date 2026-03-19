import { motion } from "framer-motion";
import { palette } from "../landing.theme";

export default function MissionGridPreview() {
  return (
    <div
      className="grid grid-cols-8 gap-2 rounded-[24px] border p-3"
      style={{ background: palette.surface, borderColor: palette.border }}
    >
      {Array.from({ length: 40 }).map((_, i) => {
        const duck = i === 8;
        const goal = i === 30;
        const obstacle = [4, 5, 12, 13, 20, 28, 35].includes(i);
        const gem = [10, 18, 26].includes(i);

        return (
          <motion.div
            key={i}
            className="aspect-square rounded-xl border"
            initial={{ opacity: 0, scale: 0.84 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18 + i * 0.012, duration: 0.24 }}
            style={{
              background: duck
                ? "rgba(249,115,22,0.16)"
                : goal
                  ? "rgba(34,197,94,0.16)"
                  : gem
                    ? "rgba(6,182,212,0.16)"
                    : obstacle
                      ? "rgba(37,99,235,0.16)"
                      : palette.surface2,
              borderColor: duck
                ? "rgba(249,115,22,0.45)"
                : goal
                  ? "rgba(34,197,94,0.45)"
                  : gem
                    ? "rgba(6,182,212,0.45)"
                    : palette.border,
            }}
          />
        );
      })}
    </div>
  );
}
