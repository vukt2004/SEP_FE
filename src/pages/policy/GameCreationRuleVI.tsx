type RuleSection = {
  id: string;
  title: string;
  bullets: string[];
};

const highlights = [
  {
    title: "Tiêu chí đánh giá",
    value: "7 nhóm",
    description: "Bộ quy định gồm 7 nhóm tiêu chí cốt lõi cho game.",
  },
  {
    title: "Trọng tâm",
    value: "Playability",
    description: "Nội dung phải có thể chơi và hoàn thành được trong thực tế.",
  },
  {
    title: "Độ tin cậy",
    value: "Ổn định",
    description: "Không có lỗi kỹ thuật gây kẹt, vỡ logic hoặc mất công bằng.",
  },
  {
    title: "An toàn",
    value: "Nội dung sạch",
    description: "Tên và mô tả không chứa yếu tố phản cảm hoặc vi phạm.",
  },
];

const ruleSections: RuleSection[] = [
  {
    id: "1",
    title: "Tính hợp lệ",
    bullets: [
      "Game có điểm bắt đầu (Start) và điểm kết thúc (Goal).",
      "Game có thể hoàn thành được (solvable).",
      "Không bị kẹt (soft lock).",
      "Không có đường đi sai hoặc không thể tới đích.",
      "Các object như door, key, switch hoạt động đúng.",
    ],
  },
  {
    id: "2",
    title: "Độ khó",
    bullets: [
      "Độ khó phù hợp với level được chọn.",
      "Không quá dễ đến mức giải được ngay lập tức.",
      "Không quá khó hoặc quá phức tạp so với mục tiêu level.",
      "Số bước giải hợp lý.",
      "Thời gian giải hợp lý.",
    ],
  },
  {
    id: "3",
    title: "Tính công bằng",
    bullets: [
      "Không có bẫy không thể đoán trước.",
      "Không gây thua vô lý.",
      "Cơ chế rõ ràng và dễ hiểu, ví dụ door, key, hazard.",
    ],
  },
  {
    id: "4",
    title: "Chất lượng kỹ thuật",
    bullets: [
      "Không có bug kỹ thuật như collision hoặc trigger lỗi.",
      "Object hoạt động đúng theo thiết kế.",
    ],
  },
  {
    id: "5",
    title: "Trực quan và trải nghiệm người dùng",
    bullets: [
      "Bố cục rõ ràng, dễ nhìn.",
      "Không rối mắt, không spam object.",
      "Các thành phần quan trọng dễ nhận biết.",
      "Sử dụng asset hợp lý.",
    ],
  },
  {
    id: "6",
    title: "An toàn nội dung",
    bullets: [
      "Tên game phù hợp.",
      "Mô tả không vi phạm.",
      "Không chứa nội dung phản cảm.",
    ],
  },
  {
    id: "7",
    title: "Thông tin mô tả",
    bullets: [
      "Có tên game.",
      "Có mô tả (description).",
      "Có tag phù hợp.",
    ],
  },
];

export default function GameCreationRuleVIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f3ea] via-[#f4f9ff] to-[#eef8f0] text-[#14213d]">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="rounded-3xl border border-[#b8cad6] bg-white/80 p-6 shadow-lg shadow-[#99a9bb]/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <p className="inline-flex rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#0f766e]">
            Quy định tạo game
          </p>
          <h1
            className="mt-4 text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"
            style={{ fontFamily: "Merriweather, Georgia, serif" }}
          >
            Quy Định Tạo Game
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#3b4a68] sm:text-base">
            Bộ quy định này dùng để kiểm tra chất lượng game trước khi đưa lên nền tảng,
            giúp đảm bảo tính hoàn thành, tính công bằng, độ ổn định kỹ thuật và trải nghiệm người
            chơi.
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-[#5f6f8f]">
            Cập nhật gần nhất: 17/04/2026
          </p>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#c7d8e3] bg-white/75 p-4 shadow-sm shadow-[#aabccd]/30"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#4e627f]">
                {item.title}
              </p>
              <p
                className="mt-2 text-xl font-extrabold text-[#0f172a]"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-[#42536f]">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 space-y-6">
          {ruleSections.map((section) => (
            <article
              key={section.id}
              className="rounded-3xl border border-[#c6d5de] bg-white/85 p-5 shadow-md shadow-[#9fb0bf]/20 sm:p-7"
            >
              <h2
                className="text-2xl font-bold text-[#0b2c4a] sm:text-3xl"
                style={{ fontFamily: "Merriweather, Georgia, serif" }}
              >
                {section.id}. {section.title}
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-[#2f4566] sm:text-base">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
