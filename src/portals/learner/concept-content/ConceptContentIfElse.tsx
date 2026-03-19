import { Target, GitBranch, Lightbulb, Check, X, Gamepad2, Puzzle, BookOpen } from "lucide-react";

export function ConceptContentIfElse() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Học cách bảo máy tính: "Nếu điều kiện đúng thì làm A, nếu sai thì làm B."
          Giống như: "Nếu trời mưa thì mang áo mưa, không thì mang nón."
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Hiểu "đúng" và "sai"</h2>
        <p>
          Máy tính chỉ hiểu hai trạng thái: <strong>đúng</strong>{" "}
          <Check size={18} style={{ verticalAlign: "middle" }} aria-hidden /> và <strong>sai</strong>{" "}
          <X size={18} style={{ verticalAlign: "middle" }} aria-hidden />.
        </p>
        <div className="concept-visual">
          <p>
            <span className="concept-label concept-label--example">Ví dụ</span>
          </p>
          <ul>
            <li>"3 lớn hơn 2 không?" → Đúng</li>
            <li>"5 bằng 10 không?" → Sai</li>
            <li>"Bạn có ít nhất 1 mạng không?" → Đúng hoặc Sai</li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Hình dung: con đường rẽ đôi</h2>
        <div className="concept-diagram">
          <GitBranch size={64} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 12 }}>
            <strong>If-else</strong> = đứng ở ngã ba, kiểm tra bảng chỉ dẫn (điều kiện). Đúng thì đi đường A, sai thì
            đi đường B.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Viết ra sao?</h2>
        <pre>
          <code>{`if (điều kiện) {
  làm việc A;
} else {
  làm việc B;
}`}</code>
        </pre>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Nhớ</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> <strong>if</strong> = "nếu",{" "}
            <strong>else</strong> = "còn không thì". Máy chỉ chạy <strong>một nhánh</strong> thôi.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Ví dụ dễ: Điểm đạt hay chưa?</h2>
        <div className="concept-example">
          <p>
            <span className="concept-label concept-label--example">Ví dụ</span>
          </p>
          <p>
            Quy định: <code>diem &gt;= 5</code> là đạt.
          </p>
        </div>
        <pre>
          <code>{`if (diem >= 5) {
  in("Đạt");
} else {
  in("Chưa đạt");
}`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-5">
        <h2>5. Nhiều nhánh: else if</h2>
        <pre>
          <code>{`if (diem >= 8) {
  in("Giỏi");
} else if (diem >= 5) {
  in("Đạt");
} else {
  in("Chưa đạt");
}`}</code>
        </pre>
        <div className="concept-visual">
          <p>
            <span className="concept-label concept-label--note">Gợi ý</span>
          </p>
          <ul>
            <li>Luôn đọc từ trên xuống.</li>
            <li>Gặp điều kiện đúng đầu tiên là dừng.</li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-6">
        <h2>6. Trong game</h2>
        <div className="concept-visual">
          <p>
            <Gamepad2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Bạn có thể dùng <strong>if-else</strong> để:
          </p>
          <ul>
            <li>Nếu có tường phía trước thì rẽ, không thì đi tiếp.</li>
            <li>Nếu còn ít mạng thì né quái, không thì tấn công.</li>
          </ul>
        </div>
        <div className="concept-diagram">
          <Puzzle size={58} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 10 }}>
            Tip: hãy viết điều kiện đơn giản trước, chạy được rồi mới thêm nhánh.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <ul>
            <li>
              <strong>if</strong>: kiểm tra điều kiện
            </li>
            <li>
              <strong>else</strong>: trường hợp còn lại
            </li>
            <li>
              <strong>else if</strong>: thêm lựa chọn ở giữa
            </li>
          </ul>
          <p style={{ marginTop: 10 }}>
            <BookOpen size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Bài tập nhỏ: nghĩ 3 tình huống đời thường có "nếu... thì...".
          </p>
        </div>
      </section>
    </>
  );
}

