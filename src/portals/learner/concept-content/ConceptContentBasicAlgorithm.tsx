import { GitBranch, ListOrdered, PlayCircle, Shapes, CheckCircle2 } from "lucide-react";
import { ConceptLessonBlockly } from "./ConceptLessonBlockly";

/** Nội dung lý thuyết cho concept seed ContentKey = basic-algorithm (Giải quyết vấn đề). */
export function ConceptContentBasicAlgorithm() {
  return (
    <>
      <div className="concept-intro" id="section-intro">
        <p>
          <GitBranch size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          <strong>Bài này học gì?</strong> <strong>Thuật toán cơ bản</strong> ở đây nghĩa là: một <strong>chuỗi bước rõ ràng</strong>{" "}
          để máy tính giải một bài toán — có đầu vào, đầu ra, và mỗi bước làm được kiểm tra.
        </p>
      </div>

      <section className="concept-section" id="section-1">
        <h2>1. Thuật toán ≠ “code hoa mỹ”</h2>
        <p>
          Thuật toán là <strong>cách làm</strong>. Code chỉ là <strong>cách bạn viết</strong> cách làm đó cho máy hiểu.
          Nếu bạn nói được từng bộc bằng lời hoặc giấy nháp, bạn đã có thuật toán.
        </p>
        <div className="concept-callout">
          <p>
            <span className="concept-label concept-label--tip">Ghi nhớ</span> Viết thuật toán trước, chọn cú pháp
            (if/for/while) sau.
          </p>
        </div>
      </section>

      <section className="concept-section" id="section-2">
        <h2>
          <ListOrdered size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          2. Ba phần tối thiểu
        </h2>
        <ul>
          <li>
            <strong>Input</strong> — dữ liệu ban đầu (ví dụ: danh sách điểm, một số n).
          </li>
          <li>
            <strong>Các bước xử lý</strong> — lặp, đếm, so sánh, cộng dồn… theo thứ tự không mơ hồ.
          </li>
          <li>
            <strong>Output</strong> — kết quả cần trả về hoặc in ra (tổng, max, “Có/Không”…).
          </li>
        </ul>
      </section>

      <section className="concept-section" id="section-3">
        <h2>
          <PlayCircle size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          3. Ví dụ: tìm số lớn nhất trong ba số
        </h2>
        <div className="concept-example">
          <p>
            <span className="concept-label concept-label--example">Input</span> ba số{" "}
            <code>a</code>, <code>b</code>, <code>c</code>.
          </p>
          <p>
            <span className="concept-label concept-label--example">Output</span> số lớn nhất trong ba số đó.
          </p>
        </div>
        <pre>
          <code>{`đặt max = a
nếu b > max thì max = b
nếu c > max thì max = c
trả về max`}</code>
        </pre>
        <p>Mỗi dòng chỉ làm một việc; thứ tự “so sánh rồi cập nhật max” rất dễ kiểm tra bằng tay.</p>
      </section>

      <section className="concept-section" id="section-4">
        <h2>
          <Shapes size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          4. Khi nào cần vòng lặp trong thuật toán?
        </h2>
        <p>
          Khi bạn phải <strong>làm cùng một việc</strong> với <strong>nhiều phần tử</strong> (duyệt danh sách, đếm ký tự,
          thử từng ô trên bản đồ…). Số lần lặp có thể biết trước (thường dùng <code>for</code>) hoặc phụ thuộc điều kiện
          (thường dùng <code>while</code>) — hai khái niệm này nằm ở mục <strong>Vòng lặp</strong> trong lộ trình.
        </p>
        <ConceptLessonBlockly
          title="Sắp xếp thuật toán bằng block"
          hint="Kết hợp Repeat, If và điều kiện path — giống cách bạn lên kế hoạch nhiều bước rồi mới chơi map."
          preset="plan_mix"
          heightPx={360}
        />
      </section>

      <section className="concept-section" id="section-summary">
        <h2>
          <CheckCircle2 size={20} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden />
          Ôn lại nhanh
        </h2>
        <ul>
          <li>Thuật toán = các bước có thứ tự, có input/output.</li>
          <li>Viết pseudo-code giúp bạn thấy lỗi logic trước khi viết code thật.</li>
          <li>Luôn thử 1–2 ví dụ nhỏ bằng tay để “chạy thử” thuật toán.</li>
        </ul>
      </section>
    </>
  );
}
