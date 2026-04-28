import { Target, Plus, Minus, X as XIcon, Divide, Gamepad2, Lightbulb, CheckCircle2 } from "lucide-react";
import { ConceptLessonBlockly } from "./ConceptLessonBlockly";

export function ConceptContentOperations() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Biết các <strong>phép toán</strong> cơ bản và cách chúng chạy trong code.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Bốn phép tính</h2>
        <div className="concept-visual">
          <ul>
            <li>
              <Plus size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
              Cộng: <code>a + b</code>
            </li>
            <li>
              <Minus size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
              Trừ: <code>a - b</code>
            </li>
            <li>
              <XIcon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
              Nhân: <code>a * b</code>
            </li>
            <li>
              <Divide size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
              Chia: <code>a / b</code>
            </li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Ví dụ trong game</h2>
        <div className="concept-example">
          <p>
            <span className="concept-label concept-label--example">Ví dụ</span>
          </p>
          <p>
            <Gamepad2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Nhặt 3 đồng xu:
          </p>
          <pre>
            <code>{`coin = coin + 3;`}</code>
          </pre>
          <p>Uống bình máu +20 nhưng không vượt quá max:</p>
          <pre>
            <code>{`hp = hp + 20;
if (hp > maxHp) hp = maxHp;`}</code>
          </pre>
        </div>
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Nhân/Chia trước</h2>
        <pre>
          <code>{`x = 2 + 3 * 4; // = 14 (vì 3*4 trước)`}</code>
        </pre>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Tip</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> Nếu muốn cộng trước, dùng ngoặc:
          </p>
          <pre>
            <code>{`x = (2 + 3) * 4; // = 20`}</code>
          </pre>
        </div>
        <ConceptLessonBlockly
          title="Ghép biểu thức với block math"
          hint="Dùng khối số, phép toán (+ − * /) và biến: tạo biến rồi set = phép toán trên get variable."
          preset="variables_play"
          heightPx={340}
        />
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Dùng với biến</h2>
        <pre>
          <code>{`score = score + 10;
score = score - 1;`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-5">
        <h2>5. Tóm tắt bằng hình</h2>
        <div className="concept-diagram">
          <CheckCircle2 size={58} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 10 }}>
            Thứ tự ưu tiên: <strong>()</strong> trước, rồi <strong>* /</strong>, cuối cùng <strong>+ -</strong>.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <ul>
            <li>Dùng toán tử để tính toán và cập nhật biến.</li>
            <li>Nhớ ưu tiên phép tính, dùng ngoặc khi cần.</li>
          </ul>
        </div>
      </section>
    </>
  );
}

