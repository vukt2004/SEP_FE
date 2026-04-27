import { Scale, Equal, ChevronRight, CheckCircle2 } from "lucide-react";
import { ConceptLessonBlockly } from "./ConceptLessonBlockly";

/** So sánh — ContentKey seed: comparison */
export function ConceptContentComparison() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Scale size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Các phép <strong>so sánh</strong> tạo ra kết quả đúng/sai để rẽ nhánh trong
          chương trình.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Kết quả của phép so sánh</h2>
        <p>
          Khi viết <code>a &gt; b</code>, <code>a == b</code>, <code>a != b</code>… máy trả về một giá trị{" "}
          <strong>boolean</strong> (đúng/sai) — trong nhiều ngôn ngữ là <code>true</code> / <code>false</code>.
        </p>
      </section>

      <section className="concept-section" id="section-2">
        <h2>
          <Equal size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          2. Bảng gợi nhớ nhanh
        </h2>
        <ul>
          <li>
            <code>==</code> hoặc <code>===</code> (tùy ngôn ngữ): hai giá trị có <strong>bằng</strong> nhau không?
          </li>
          <li>
            <code>!=</code> / <code>!==</code>: có <strong>khác</strong> nhau không?
          </li>
          <li>
            <code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>: thứ tự lớn nhỏ trên trục số
            (hoặc quy tắc so sánh chuỗi theo ngôn ngữ).
          </li>
        </ul>
      </section>

      <section className="concept-section" id="section-3">
        <h2>
          <ChevronRight size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          3. Gắn với if
        </h2>
        <pre>
          <code>{`nếu (điểm >= 5) {
  in("Đạt")
} ngược lại {
  in("Chưa đạt")
}`}</code>
        </pre>
        <p>Điều kiện trong ngoặc phải là biểu thức so sánh (hoặc kết hợp nhiều so sánh bằng AND/OR).</p>
        <ConceptLessonBlockly
          title="Ghép điều kiện đúng/sai"
          hint="Khối compare hai vế là số; true/false và path ahead cho điều kiện kiểu game. Sau đó có thể gắn vào If ở màn game thật."
          preset="compare_play"
          heightPx={320}
        />
      </section>

      <section className="concept-section" id="section-summary">
        <h2>
          <CheckCircle2 size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          Ôn lại nhanh
        </h2>
        <ul>
          <li>So sánh tạo đúng/sai để điều khiển luồng.</li>
          <li>So sánh số với số khác so sánh chuỗi/chuỗi — cần đọc kỹ quy tắc ngôn ngữ bạn dùng.</li>
        </ul>
      </section>
    </>
  );
}
