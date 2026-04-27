import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ConceptLessonBlockly } from "./ConceptLessonBlockly";

/** While loop — ContentKey seed: while-loop */
export function ConceptContentWhileLoop() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <RefreshCw size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Vòng lặp <strong>while</strong>: lặp lại khối lệnh <strong>miễn là điều kiện còn đúng</strong>.
          Khác <code>for</code> thường dùng khi biết số vòng lặp, <code>while</code> hay dùng khi số lần phụ thuộc dữ liệu.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Cấu trúc tư duy</h2>
        <pre>
          <code>{`while (điều_kiện) {
  // làm gì đó, và phải có khả năng làm điều_kiện thành sai
}`}</code>
        </pre>
        <p>
          Trước mỗi lần vào thân vòng lặp, chương trình kiểm tra điều kiện. <strong>Sai</strong> → thoát vòng, chạy
          dòng tiếp theo sau <code>while</code>.
        </p>
      </section>

      <section className="concept-section" id="section-2">
        <h2>
          <AlertTriangle size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          2. Vòng lặp vô hạn
        </h2>
        <p>
          Nếu thân vòng lặp <strong>không bao giờ</strong> làm điều kiện trở thành sai, chương trình chạy mãi — đó là lỗi
          logic thường gặp. Luôn tự hỏi:           “Sau mỗi vòng, điều gì thay đổi để đến lúc phải dừng?”
        </p>
        <ConceptLessonBlockly
          title="Thử While với điều kiện quan sát"
          hint="While + path ahead / NOT: lặp miễn điều kiện đúng; trong thân phải có hành động làm đổi trạng thái (ví dụ move) để tránh vô hạn."
          preset="while_basic"
          heightPx={360}
        />
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Ví dụ: đếm ngược về 0</h2>
        <pre>
          <code>{`n = 3
while (n > 0) {
  in(n)
  n = n - 1
}`}</code>
        </pre>
        <p>In lần lượt 3, 2, 1 rồi khi <code>n == 0</code> điều kiện <code>n &gt; 0</code> sai → kết thúc.</p>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>
          <CheckCircle2 size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          Ôn lại nhanh
        </h2>
        <ul>
          <li>While = lặp khi điều kiện đúng.</li>
          <li>Phải đảm bảo tiến tới lúc điều kiện sai để tránh vô hạn.</li>
          <li>For thường gọn khi đếm theo chỉ số; while gọn khi “lặp cho đến khi gặp điều kiện dừng”.</li>
        </ul>
      </section>
    </>
  );
}
