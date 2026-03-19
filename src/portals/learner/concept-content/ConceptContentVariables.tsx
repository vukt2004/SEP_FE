import { Target, Package, ArrowRightLeft, Lightbulb, Gamepad2, CheckCircle2 } from "lucide-react";

export function ConceptContentVariables() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Hiểu <strong>biến</strong> là “hộp chứa” để lưu dữ liệu (số, chữ…), và cách{" "}
          <strong>gán</strong> / <strong>đọc</strong> giá trị.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Biến là gì?</h2>
        <div className="concept-diagram">
          <Package size={64} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 12 }}>
            Tưởng tượng biến là cái hộp có nhãn. Nhãn là <strong>tên biến</strong>, trong hộp là <strong>giá trị</strong>.
          </p>
        </div>
        <pre>
          <code>{`int coin = 10; // hộp tên coin đang chứa 10`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Tại sao cần biến?</h2>
        <div className="concept-visual">
          <ul>
            <li>Lưu điểm, máu, coin… để dùng nhiều lần.</li>
            <li>Thay đổi giá trị theo thời gian (nhặt coin thì tăng).</li>
            <li>Giúp code rõ ràng hơn thay vì dùng số “rơi rớt”.</li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Gán và Đọc</h2>
        <p>
          <ArrowRightLeft size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Gán</strong> là “đặt” giá trị vào biến. <strong>Đọc</strong> là dùng biến ở chỗ khác.
        </p>
        <pre>
          <code>{`coin = 10;     // gán
coin = coin+1; // đọc coin, cộng 1, rồi gán lại`}</code>
        </pre>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Tip</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> Hãy đọc câu này như tiếng Việt:
            “coin bằng coin cộng 1”.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Ví dụ trong game</h2>
        <div className="concept-visual">
          <p>
            <Gamepad2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Khi nhặt 1 đồng xu:
          </p>
          <pre>
            <code>{`coin = coin + 1;`}</code>
          </pre>
          <p>Cập nhật UI hiển thị coin cũng dùng biến này.</p>
        </div>
      </section>

      <section className="concept-section" id="section-5">
        <h2>5. Đặt tên biến</h2>
        <div className="concept-example">
          <p>
            <span className="concept-label concept-label--example">Ví dụ</span>
          </p>
          <ul>
            <li>
              Tốt: <code>playerHealth</code>, <code>coin</code>, <code>maxSteps</code>
            </li>
            <li>
              Tệ: <code>a</code>, <code>x1</code>, <code>tmp</code> (khó hiểu)
            </li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <p>
            <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Biến = nơi lưu dữ liệu; gán = đặt giá trị; đọc = dùng giá trị.
          </p>
        </div>
      </section>
    </>
  );
}

