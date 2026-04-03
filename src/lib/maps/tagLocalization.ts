import type { LocaleId } from "@/lib/i18n/translations";

const TAG_LABELS_VI: Record<string, string> = {
  "Algorithm Basics": "Cơ bản thuật toán",
  "Algorithm Design": "Thiết kế thuật toán",
  Arrays: "Mảng",
  "Computational Thinking": "Tư duy máy tính",
  Conditionals: "Điều kiện",
  Debugging: "Gỡ lỗi",
  Functions: "Hàm",
  "Logic Puzzle": "Câu đố logic",
  "Logical Thinking": "Tư duy logic",
  Loops: "Vòng lặp",
  Objects: "Đối tượng",
  "Obstacle Avoidance": "Tránh chướng ngại vật",
  Operators: "Toán tử",
  Optimization: "Tối ưu hóa",
  Pathfinding: "Tìm đường",
  "Pattern Recognition": "Nhận dạng mẫu",
  Pointers: "Con trỏ",
  "Problem Solving": "Giải quyết vấn đề",
  Recursion: "Đệ quy",
  "Resource Collection": "Thu thập tài nguyên",
  Strategy: "Chiến lược",
  Variables: "Biến",
  "If Else": "If / Else",
  "If/Else": "If / Else",
};

export function localizeTagName(name: string, locale: LocaleId): string {
  if (locale !== "vi") return name;
  const exact = TAG_LABELS_VI[name];
  if (exact) return exact;

  const lower = name.toLowerCase();
  const found = Object.entries(TAG_LABELS_VI).find(([k]) => k.toLowerCase() === lower);
  return found ? found[1] : name;
}
