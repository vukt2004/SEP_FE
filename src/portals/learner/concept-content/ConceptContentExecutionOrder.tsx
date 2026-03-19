import { Target, ListOrdered, Footprints, Lightbulb, Gamepad2, CheckCircle2 } from "lucide-react";

export function ConceptContentExecutionOrder() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Hiểu <strong>thứ tự thực thi</strong>: code chạy từ trên xuống, từng bước một.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Đọc từ trên xuống</h2>
        <div className="concept-diagram">
          <ListOrdered size={64} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 12 }}>
            Máy không “đoán ý” — nó làm theo <strong>đúng thứ tự</strong> bạn viết.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Ví dụ từng bước</h2>
        <pre>
          <code>{`x = 1;
x = x + 2;
x = x * 3;`}</code>
        </pre>
        <div className="concept-visual">
          <p>
            <span className="concept-label concept-label--example">Chạy trong đầu</span>
          </p>
          <ol>
            <li>Bước 1: x = 1</li>
            <li>Bước 2: x = 3</li>
            <li>Bước 3: x = 9</li>
          </ol>
        </div>
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Xếp khối trong game</h2>
        <div className="concept-visual">
          <p>
            <Gamepad2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Nếu bạn xếp: <code>đi tới</code> rồi mới <code>nhặt</code>, thì nhặt chỉ chạy sau khi đã tới.
          </p>
          <p>Đổi thứ tự khối → kết quả đổi ngay.</p>
        </div>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Tip</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> Khi debug, hãy hỏi: “Dòng nào chạy
            trước? Sau đó giá trị biến là gì?”
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Tại sao thứ tự quan trọng?</h2>
        <div className="concept-diagram">
          <Footprints size={58} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 10 }}>
            Thứ tự quyết định trạng thái hiện tại: đi trước hay kiểm tra trước sẽ dẫn tới hành vi khác nhau.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <p>
            <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Code thường chạy từ trên xuống. Đổi thứ tự → đổi kết quả.
          </p>
        </div>
      </section>
    </>
  );
}

