export default function GridVeil() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "linear-gradient(rgba(34,52,77,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(34,52,77,0.7) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(circle at center, black 28%, transparent 82%)",
      }}
    />
  );
}
