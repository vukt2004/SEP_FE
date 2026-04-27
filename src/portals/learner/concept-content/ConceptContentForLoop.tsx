import { Target, Repeat, Hash, Gamepad2, Lightbulb, CheckCircle2 } from "lucide-react";
import { ConceptLessonBlockly } from "./ConceptLessonBlockly";

export function ConceptContentForLoop() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Dùng <strong>for</strong> để lặp lại hành động nhiều lần (đếm bước, nhặt đồ…)
          mà không phải viết lại y chang.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Vòng lặp For là gì?</h2>
        <div className="concept-diagram">
          <Repeat size={64} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 12 }}>For = “lặp lại N lần” (hoặc đến khi điều kiện dừng).</p>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Viết for ra sao?</h2>
        <pre>
          <code>{`for (i = 0; i < 3; i = i + 1) {
  làm gì đó;
}`}</code>
        </pre>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Cách đọc</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> Bắt đầu i=0; nếu i&lt;3 thì chạy;
            chạy xong thì i=i+1.
          </p>
        </div>
        <ConceptLessonBlockly
          title="Thử Repeat (for trong game)"
          hint="Khối Repeat có ô số lần — gắn number vào, trong do xếp move / turn. Giống vòng for đếm bước."
          preset="repeat_basic"
          heightPx={340}
        />
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Ví dụ: Đếm 1 đến 3</h2>
        <pre>
          <code>{`for (i = 1; i <= 3; i = i + 1) {
  in(i);
}`}</code>
        </pre>
        <div className="concept-visual">
          <p>
            <Hash size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Kết quả: 1, 2, 3
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Trong game</h2>
        <div className="concept-visual">
          <p>
            <Gamepad2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Đi thẳng 5 bước:
          </p>
          <pre>
            <code>{`for (i = 0; i < 5; i = i + 1) {
  moveForward();
}`}</code>
          </pre>
        </div>
      </section>

      <section className="concept-section" id="section-5">
        <h2>5. Lặp ngược và bước nhảy</h2>
        <pre>
          <code>{`for (i = 10; i >= 0; i = i - 2) {
  in(i);
}`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <p>
            <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            For giúp lặp có kiểm soát: khởi tạo → điều kiện → tăng/giảm.
          </p>
        </div>
      </section>
    </>
  );
}

