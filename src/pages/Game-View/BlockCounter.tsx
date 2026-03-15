import type { CSSProperties } from "react";

interface BlockCounterProps {
  used: number;
  limit: number | null;
}

export function BlockCounter({ used, limit }: BlockCounterProps) {
  const text = limit !== null ? `${used} / ${limit}` : `${used} / No limit`;
  return (
    <div style={styles.container}>
      <span style={styles.label}>Blocks Used:</span>
      <span style={styles.value}>{text}</span>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid color-mix(in srgb, var(--warning) 42%, var(--border))",
    background: "color-mix(in srgb, var(--warning) 16%, var(--surface))",
    fontSize: "12px",
    fontWeight: 700,
  },
  label: {
    color: "var(--text-2)",
  },
  value: {
    color: "var(--text)",
  },
};
