/**
 * Landing palette dùng CSS variables để theo theme sáng/tối (data-theme trên documentElement).
 * Khi đổi theme ở header app, landing page cũng đổi theo.
 */
export const palette = {
  bg: "var(--bg)",
  surface: "var(--surface)",
  surface2: "var(--surface-2)",
  surface3: "var(--surface-2)",
  border: "var(--border)",
  text: "var(--text)",
  text2: "var(--text-2)",
  muted: "var(--muted)",
  primary: "var(--primary)",
  accent: "var(--accent)",
  cyan: "var(--info)",
  success: "var(--success)",
  yellow: "var(--warning)",
} as const;

export const landingEase = [0.22, 1, 0.36, 1] as const;
