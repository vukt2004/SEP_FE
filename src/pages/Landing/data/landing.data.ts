import type { ChapterData } from "../landing.types";
import { palette } from "../landing.theme";
import { Orbit, ShieldCheck, Sparkles, Zap } from "lucide-react";

export const highlightCards = [
  {
    title: "Act-based storytelling",
    desc: "Trang được chia theo nhịp cảm xúc để cinematic direction rõ ràng hơn thay vì trải card đều nhau.",
    icon: Orbit,
    tone: palette.primary,
  },
  {
    title: "Depth through motion",
    desc: "Orbit rings, star layers và reveal motion tạo chiều sâu trong khi vẫn giữ UI sạch và dễ đọc.",
    icon: Sparkles,
    tone: palette.cyan,
  },
  {
    title: "Visual tension",
    desc: "Nhịp trang tăng dần từ khám phá sang học rồi sang cạnh tranh để tạo payoff cho CTA cuối.",
    icon: Zap,
    tone: palette.accent,
  },
  {
    title: "Clean sci-fi identity",
    desc: "Không cần gradient vẫn có chất nhờ scale, border, shadow và hệ orbit lặp lại xuyên suốt trang.",
    icon: ShieldCheck,
    tone: palette.yellow,
  },
] as const;

export const chapterData: ChapterData[] = [
  {
    id: "arrival",
    chapter: "Act I",
    eyebrow: "Arrival",
    title: "Mở đầu phải tạo cảm giác người xem đang tiến vào quỹ đạo của một nhiệm vụ",
    desc: "Section này dùng không khí, không gian và visual scale để khiến người xem cảm thấy mình đã rời khỏi một landing page bình thường và bước vào một thế giới học tập có câu chuyện.",
    toneColor: palette.accent,
    points: [
      "Hero như một cảnh mở màn thay vì một khối marketing thông thường.",
      "Giữ khoảng thở lớn và chuyển động chậm để tạo chất điện ảnh.",
      "Tạo động lực kéo tiếp xuống bằng cảm giác còn điều gì đó phía dưới.",
    ],
  },
  {
    id: "learning",
    chapter: "Act II",
    eyebrow: "Learning",
    title: "Sau khi gây ấn tượng, landing page phải chứng minh QuackOrbit dạy logic như thế nào",
    desc: "Phần này là trái tim sản phẩm. Nó chuyển từ cảm xúc sang clarity để user hiểu rằng học ở đây là học bằng block, mô phỏng 2D và vòng lặp thử-sai dễ tiếp cận.",
    toneColor: palette.primary,
    points: [
      "Biến logic thành chuỗi hành động có thể quan sát được.",
      "Cho thấy simulation là sân khấu chính của việc học.",
      "Làm rõ vì sao trải nghiệm này thân thiện với beginner hơn code thuần văn bản.",
    ],
  },
  {
    id: "competition",
    chapter: "Act III",
    eyebrow: "Competition",
    title:
      "Đây là nơi nhịp trang được đẩy lên cao hơn: từ hiểu sản phẩm sang muốn tham gia cuộc chơi",
    desc: "Multiplayer trong cinematic direction phải là chapter mang năng lượng khác: nhanh hơn, căng hơn và sống động hơn như một arena thực sự.",
    toneColor: palette.accent,
    points: [
      "Tăng cảm giác kịch tính bằng score, ranking và replay value.",
      "Làm rõ đây không chỉ là nơi học một mình mà còn là nơi học qua cạnh tranh vui vẻ.",
      "Tạo cao trào hợp lý trước CTA finale.",
    ],
  },
];
