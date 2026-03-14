import { palette } from "../landing.theme";

export default function HeroStats() {
  return (
    <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
      {[
        ["Act I", "Arrival"],
        ["Act II", "Learning"],
        ["Act III", "Competition"],
        ["Finale", "Launch"],
      ].map(([value, label]) => (
        <div
          key={label}
          className="rounded-2xl border p-4"
          style={{ background: palette.surface, borderColor: palette.border }}
        >
          <div className="text-2xl font-bold" style={{ color: palette.text }}>
            {value}
          </div>
          <div className="mt-1 text-sm" style={{ color: palette.muted }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
