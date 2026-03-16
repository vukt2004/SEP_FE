// 3 mini-game thẻ trên cùng một màn, mỗi thẻ 1 câu hỏi.
import { useState } from "react";
import { Gamepad2, Check, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./ConceptMiniGame.module.css";

type GameKey = "if-else" | "variables" | "operations" | "execution-order" | "for-loop";

interface ConceptMiniGameProps {
  contentKey: string | null | undefined;
}

function toGameKey(key: string | null | undefined): GameKey | null {
  if (!key) return null;
  const k = key.toLowerCase().trim().replace(/\s+/g, "-").replace(/_/g, "-");
  const slug = k.replace(/[^a-z0-9-]/g, "");
  if (k === "if-else" || k.includes("if-else") || slug.includes("ifelse")) return "if-else";
  if (k === "variables" || k.includes("variable") || slug.includes("var") || slug.includes("bin"))
    return "variables";
  if (
    k === "operations" ||
    k.includes("operation") ||
    slug.includes("phep") ||
    slug.includes("toan") ||
    slug.includes("math") ||
    slug.includes("php") ||
    slug.includes("ton")
  )
    return "operations";
  if (
    k === "for-loop" ||
    k.includes("for-loop") ||
    k.includes("for loop") ||
    slug.includes("forloop") ||
    slug.includes("loop") ||
    slug.includes("vonglap") ||
    slug.includes("vong-lap")
  )
    return "for-loop";
  if (
    k === "execution-order" ||
    k.includes("execution") ||
    k.includes("order") ||
    slug.includes("thutu") ||
    slug.includes("thucthi") ||
    slug.includes("thc")
  )
    return "execution-order";
  return null;
}

const IF_ELSE_ITEMS: { diem: number; condition: string; correct: "Đạt" | "Chưa đạt" }[] = [
  { diem: 7, condition: "diem >= 5", correct: "Đạt" },
  { diem: 3, condition: "diem >= 5", correct: "Chưa đạt" },
  { diem: 5, condition: "diem >= 5", correct: "Đạt" },
];

const VAR_ITEMS: { code: string; answer: number }[] = [
  { code: "mang = 3\nmang = mang - 1", answer: 2 },
  { code: "diem = 0\ndiem = diem + 10", answer: 10 },
  { code: "x = 5\nx = x * 2", answer: 10 },
];

const OPS_ITEMS: { expr: string; answer: number }[] = [
  { expr: "2 + 3 * 4", answer: 14 },
  { expr: "10 - 2 * 3", answer: 4 },
  { expr: "(2 + 3) * 4", answer: 20 },
];

const ORDER_ITEMS: { steps: string[]; correctOrder: number[] }[] = [
  { steps: ["diem = 10", "diem = diem + 5", "in(diem)"], correctOrder: [0, 1, 2] },
  { steps: ["mang = 3", "mang = mang - 1", "in(mang)"], correctOrder: [0, 1, 2] },
  { steps: ["diem = 0", "diem = diem + 10", "in(diem)"], correctOrder: [0, 1, 2] },
];

const FOR_LOOP_ITEMS: { code: string; question: string; answer: number }[] = [
  {
    code: "for (i=1; i<=3; i=i+1) { ... }",
    question: "Khối lệnh trong for chạy mấy lần?",
    answer: 3,
  },
  { code: "for (i=0; i<2; i=i+1) { ... }", question: "Vòng lặp chạy mấy lần?", answer: 2 },
  { code: "i=0; for 2 lần: i = i + 1", question: "Giá trị của i sau khi hết vòng lặp?", answer: 2 },
];

const GAME_COUNT = 3;

export function ConceptMiniGame({ contentKey }: ConceptMiniGameProps) {
  const { t } = useTranslation();
  const gameKey = toGameKey(contentKey);
  const [results, setResults] = useState<(null | "correct" | "wrong")[]>([null, null, null]);
  const [orderSelections, setOrderSelections] = useState<number[][]>([[], [], []]);

  if (!gameKey) return null;

  const setResult = (index: number, value: "correct" | "wrong") => {
    setResults((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const setOrderFor = (gameIndex: number, indices: number[]) => {
    setOrderSelections((prev) => {
      const next = prev.map((a) => [...a]);
      next[gameIndex] = indices;
      return next;
    });
  };

  return (
    <section className={styles.miniGameSection} aria-label="Mini games">
      <h2 className={styles.sectionTitle}>
        <Gamepad2 size={22} aria-hidden />
        {t("conceptMiniGame")}
      </h2>
      <p className={styles.sectionDesc}>{t("conceptMiniGameDesc")}</p>
      <div className={styles.cardsGrid}>
        {gameKey === "if-else" &&
          IF_ELSE_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <IfElseCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              onResult={setResult}
              t={t}
            />
          ))}
        {gameKey === "variables" &&
          VAR_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <VarCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              onResult={setResult}
              t={t}
            />
          ))}
        {gameKey === "operations" &&
          OPS_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <OpsCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              onResult={setResult}
              t={t}
            />
          ))}
        {gameKey === "execution-order" &&
          ORDER_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <OrderCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              selection={orderSelections[idx] ?? []}
              onSelection={(sel) => setOrderFor(idx, sel)}
              onResult={setResult}
              t={t}
            />
          ))}
        {gameKey === "for-loop" &&
          FOR_LOOP_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <ForLoopCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              onResult={setResult}
              t={t}
            />
          ))}
      </div>
    </section>
  );
}

function IfElseCard({
  index,
  question,
  result,
  onResult,
  t,
}: {
  index: number;
  question: (typeof IF_ELSE_ITEMS)[0];
  result: null | "correct" | "wrong";
  onResult: (i: number, v: "correct" | "wrong") => void;
  t: (k: string) => string;
}) {
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>
        <code>diem = {question.diem}</code>, <code>{question.condition}</code>. Máy in gì?
      </p>
      <div className={styles.choices}>
        {(["Đạt", "Chưa đạt"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            className={styles.choiceBtn}
            disabled={result !== null}
            onClick={() => onResult(index, opt === question.correct ? "correct" : "wrong")}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && (
        <div className={result === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result === "correct" ? <Check size={18} /> : <X size={18} />}
          <span>{result === "correct" ? t("correct") : t("wrong")}</span>
        </div>
      )}
    </div>
  );
}

function VarCard({
  index,
  question,
  result,
  onResult,
  t,
}: {
  index: number;
  question: (typeof VAR_ITEMS)[0];
  result: null | "correct" | "wrong";
  onResult: (i: number, v: "correct" | "wrong") => void;
  t: (k: string) => string;
}) {
  const options = [question.answer, question.answer + 1, question.answer - 1, question.answer + 2]
    .filter((v, i, arr) => v >= 0 && arr.indexOf(v) === i)
    .slice(0, 4)
    .sort((a, b) => a - b);
  if (!options.includes(question.answer)) options.push(question.answer);
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>Giá trị cuối cùng?</p>
      <pre className={styles.codeBlock}>
        <code>{question.code}</code>
      </pre>
      <div className={styles.choices}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={styles.choiceBtn}
            disabled={result !== null}
            onClick={() => onResult(index, opt === question.answer ? "correct" : "wrong")}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && (
        <div className={result === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result === "correct" ? <Check size={18} /> : <X size={18} />}
          <span>{result === "correct" ? t("correct") : t("wrong")}</span>
        </div>
      )}
    </div>
  );
}

function OpsCard({
  index,
  question,
  result,
  onResult,
  t,
}: {
  index: number;
  question: (typeof OPS_ITEMS)[0];
  result: null | "correct" | "wrong";
  onResult: (i: number, v: "correct" | "wrong") => void;
  t: (k: string) => string;
}) {
  const options = [question.answer, question.answer + 2, question.answer - 2, question.answer + 5]
    .filter((v, i, arr) => v >= 0 && arr.indexOf(v) === i)
    .slice(0, 4)
    .sort((a, b) => a - b);
  if (!options.includes(question.answer)) options.push(question.answer);
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>
        <code>{question.expr}</code> = ?
      </p>
      <div className={styles.choices}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={styles.choiceBtn}
            disabled={result !== null}
            onClick={() => onResult(index, opt === question.answer ? "correct" : "wrong")}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && (
        <div className={result === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result === "correct" ? <Check size={18} /> : <X size={18} />}
          <span>{result === "correct" ? t("correct") : t("wrong")}</span>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  index,
  question,
  result,
  selection,
  onSelection,
  onResult,
  t,
}: {
  index: number;
  question: (typeof ORDER_ITEMS)[0];
  result: null | "correct" | "wrong";
  selection: number[];
  onSelection: (sel: number[]) => void;
  onResult: (i: number, v: "correct" | "wrong") => void;
  t: (k: string) => string;
}) {
  const toggle = (i: number) => {
    if (result !== null) return;
    if (selection.includes(i)) {
      onSelection(selection.filter((x) => x !== i));
    } else {
      onSelection([...selection, i].slice(-3));
    }
  };
  const submit = () => {
    if (selection.length !== 3) return;
    const ok = selection.join(",") === question.correctOrder.join(",");
    onResult(index, ok ? "correct" : "wrong");
  };
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>Chọn thứ tự chạy (1 → 2 → 3):</p>
      <div className={styles.orderList}>
        {question.steps.map((s, i) => (
          <button
            key={i}
            type="button"
            className={styles.orderItem}
            disabled={result !== null}
            onClick={() => toggle(i)}
          >
            {selection.indexOf(i) >= 0 ? `${selection.indexOf(i) + 1}. ` : ""}
            <code>{s}</code>
          </button>
        ))}
      </div>
      {selection.length === 3 && !result && (
        <button type="button" className={styles.submitOrderBtn} onClick={submit}>
          Kiểm tra
        </button>
      )}
      {result && (
        <div className={result === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result === "correct" ? <Check size={18} /> : <X size={18} />}
          <span>{result === "correct" ? t("correct") : t("wrong")}</span>
        </div>
      )}
    </div>
  );
}

function ForLoopCard({
  index,
  question,
  result,
  onResult,
  t,
}: {
  index: number;
  question: (typeof FOR_LOOP_ITEMS)[0];
  result: null | "correct" | "wrong";
  onResult: (i: number, v: "correct" | "wrong") => void;
  t: (k: string) => string;
}) {
  const options = [question.answer, question.answer + 1, question.answer - 1, question.answer + 2]
    .filter((v, i, arr) => v >= 0 && arr.indexOf(v) === i)
    .slice(0, 4)
    .sort((a, b) => a - b);
  if (!options.includes(question.answer)) options.push(question.answer);
  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>{question.question}</p>
      <pre className={styles.codeBlock}>
        <code>{question.code}</code>
      </pre>
      <div className={styles.choices}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={styles.choiceBtn}
            disabled={result !== null}
            onClick={() => onResult(index, opt === question.answer ? "correct" : "wrong")}
          >
            {opt}
          </button>
        ))}
      </div>
      {result && (
        <div className={result === "correct" ? styles.feedbackCorrect : styles.feedbackWrong}>
          {result === "correct" ? <Check size={18} /> : <X size={18} />}
          <span>{result === "correct" ? t("correct") : t("wrong")}</span>
        </div>
      )}
    </div>
  );
}
