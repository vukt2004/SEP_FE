import { Target, Compass, ListChecks, Lightbulb, Wrench, CheckCircle2 } from "lucide-react";

export function ConceptContentProblemSolving() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <Target size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> Cách <strong>phân tích bài toán</strong>: hiểu đề, chia nhỏ, thử ví dụ, viết
          từng bước, rồi mới code.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Đọc đề như một checklist</h2>
        <div className="concept-visual">
          <p>
            <ListChecks size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Trả lời 4 câu:
          </p>
          <ul>
            <li>Input là gì? (bạn có gì trong tay)</li>
            <li>Output là gì? (cần in/return cái gì)</li>
            <li>Rule/điều kiện đặc biệt? (0, âm, rỗng…)</li>
            <li>Ví dụ mẫu? (tự tạo 1–2 ví dụ)</li>
          </ul>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>2. Chia nhỏ bài toán</h2>
        <div className="concept-diagram">
          <Compass size={64} strokeWidth={1.5} aria-hidden />
          <p style={{ marginTop: 12 }}>
            Đừng cố giải một phát. Hãy tách thành các bước nhỏ, mỗi bước làm được là tiến thêm 1 đoạn.
          </p>
        </div>
        <pre>
          <code>{`Bước 1: ...
Bước 2: ...
Bước 3: ...`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-3">
        <h2>3. Thử tay bằng ví dụ</h2>
        <div className="concept-example">
          <p>
            <span className="concept-label concept-label--example">Ví dụ</span>
          </p>
          <p>
            Nếu đề nói “đếm số phần tử chẵn”, bạn thử với mảng nhỏ: <code>[1,2,4]</code> → kết quả phải là 2.
          </p>
        </div>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Tip</span>{" "}
            <Lightbulb size={18} style={{ verticalAlign: "middle" }} aria-hidden /> Nếu ví dụ tay còn ra sai, code chắc
            chắn sai.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-4">
        <h2>4. Viết “pseudo-code” trước</h2>
        <div className="concept-visual">
          <p>
            <Wrench size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Pseudo-code = viết gần tiếng Việt, chưa cần đúng cú pháp.
          </p>
        </div>
        <pre>
          <code>{`đặt count = 0
duyệt từng phần tử x
  nếu x chẵn thì count++
in count`}</code>
        </pre>
      </section>

      <section className="concept-section" id="section-summary">
        <h2>Ôn lại nhanh</h2>
        <div className="concept-summary">
          <p>
            <CheckCircle2 size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
            Quy trình: hiểu đề → ví dụ → chia nhỏ → pseudo-code → code → test lại.
          </p>
        </div>
      </section>
    </>
  );
}

