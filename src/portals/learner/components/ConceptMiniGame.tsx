// 3 mini-game thẻ trên cùng một màn, mỗi thẻ 1 câu hỏi.
import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/translations";
import styles from "./ConceptMiniGame.module.css";

type GameKey = "if-else" | "variables" | "operations" | "execution-order" | "for-loop" | "while-loop";

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
  if (k === "operators" || slug === "operators") return "operations";
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
  if (k === "comparison" || k.includes("comparison") || slug.includes("sosanh")) return null;
  if (k === "basic-algorithm" || k.includes("basic-algorithm") || slug.includes("thuattoan")) return null;
  if (
    k === "while-loop" ||
    k.includes("while-loop") ||
    k.includes("while loop") ||
    (k.includes("while") && !k.includes("for"))
  )
    return "while-loop";
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

const WHILE_LOOP_ITEMS: { code: string; question: string; answer: number }[] = [
  {
    code: "i = 0\nwhile (i < 3) {\n  i = i + 1\n}",
    question: "Thân while chạy mấy lần?",
    answer: 3,
  },
  {
    code: "i = 3\nwhile (i > 0) {\n  i = i - 1\n}",
    question: "Thân while chạy mấy lần?",
    answer: 3,
  },
  {
    code: "while (3 < 1) {\n  ...\n}",
    question: "Thân while chạy mấy lần?",
    answer: 0,
  },
];

const GAME_COUNT = 3;

type RoundResult = "correct" | "wrong";

function choiceBtnClass(optLabel: string, userPick: string | null, result: null | RoundResult): string {
  const parts = [styles.choiceBtn];
  if (result && userPick !== null && optLabel === userPick) {
    parts.push(result === "correct" ? styles.choicePickedCorrect : styles.choicePickedWrong);
  }
  return parts.join(" ");
}

export function ConceptMiniGame({ contentKey }: ConceptMiniGameProps) {
  const { t } = useTranslation();
  const gameKey = toGameKey(contentKey);
  const [results, setResults] = useState<(null | RoundResult)[]>([null, null, null]);
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null]);
  const [orderSelections, setOrderSelections] = useState<number[][]>([[], [], []]);

  if (!gameKey) return null;

  const setRoundResult = (index: number, value: RoundResult, pickDisplay: string) => {
    setResults((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setPicks((prev) => {
      const next = [...prev];
      next[index] = pickDisplay;
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
              pickLabel={picks[idx]}
              onResult={setRoundResult}
            />
          ))}
        {gameKey === "variables" &&
          VAR_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <VarCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              pickLabel={picks[idx]}
              onResult={setRoundResult}
            />
          ))}
        {gameKey === "operations" &&
          OPS_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <OpsCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              pickLabel={picks[idx]}
              onResult={setRoundResult}
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
              onResult={setRoundResult}
            />
          ))}
        {gameKey === "for-loop" &&
          FOR_LOOP_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <ForLoopCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              pickLabel={picks[idx]}
              onResult={setRoundResult}
            />
          ))}
        {gameKey === "while-loop" &&
          WHILE_LOOP_ITEMS.slice(0, GAME_COUNT).map((q, idx) => (
            <WhileLoopCard
              key={idx}
              index={idx}
              question={q}
              result={results[idx]}
              pickLabel={picks[idx]}
              onResult={setRoundResult}
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
  pickLabel,
  onResult,
}: {
  index: number;
  question: (typeof IF_ELSE_ITEMS)[0];
  result: null | RoundResult;
  pickLabel: string | null;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
            className={choiceBtnClass(opt, pickLabel, result)}
            disabled={result !== null}
            onClick={() => {
              const ok = opt === question.correct;
              onResult(index, ok ? "correct" : "wrong", opt);
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function VarCard({
  index,
  question,
  result,
  pickLabel,
  onResult,
}: {
  index: number;
  question: (typeof VAR_ITEMS)[0];
  result: null | RoundResult;
  pickLabel: string | null;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
            className={choiceBtnClass(String(opt), pickLabel, result)}
            disabled={result !== null}
            onClick={() => {
              const ok = opt === question.answer;
              onResult(index, ok ? "correct" : "wrong", String(opt));
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function OpsCard({
  index,
  question,
  result,
  pickLabel,
  onResult,
}: {
  index: number;
  question: (typeof OPS_ITEMS)[0];
  result: null | RoundResult;
  pickLabel: string | null;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
            className={choiceBtnClass(String(opt), pickLabel, result)}
            disabled={result !== null}
            onClick={() => {
              const ok = opt === question.answer;
              onResult(index, ok ? "correct" : "wrong", String(opt));
            }}
          >
            {opt}
          </button>
        ))}
      </div>
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
}: {
  index: number;
  question: (typeof ORDER_ITEMS)[0];
  result: null | RoundResult;
  selection: number[];
  onSelection: (sel: number[]) => void;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
    const pickedStr = selection.map((i) => question.steps[i]).join(" → ");
    onResult(index, ok ? "correct" : "wrong", pickedStr);
  };

  const listFrame =
    result === "correct" ? styles.orderListFrameOk : result === "wrong" ? styles.orderListFrameBad : "";

  return (
    <div className={styles.card}>
      <p className={styles.cardLabel}>Mini game {index + 1}</p>
      <p className={styles.cardQuestion}>Chọn thứ tự chạy (1 → 2 → 3):</p>
      <div className={`${styles.orderList} ${listFrame}`.trim()}>
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
    </div>
  );
}

function ForLoopCard({
  index,
  question,
  result,
  pickLabel,
  onResult,
}: {
  index: number;
  question: (typeof FOR_LOOP_ITEMS)[0];
  result: null | RoundResult;
  pickLabel: string | null;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
            className={choiceBtnClass(String(opt), pickLabel, result)}
            disabled={result !== null}
            onClick={() => {
              const ok = opt === question.answer;
              onResult(index, ok ? "correct" : "wrong", String(opt));
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function WhileLoopCard({
  index,
  question,
  result,
  pickLabel,
  onResult,
}: {
  index: number;
  question: (typeof WHILE_LOOP_ITEMS)[0];
  result: null | RoundResult;
  pickLabel: string | null;
  onResult: (i: number, v: RoundResult, pick: string) => void;
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
            className={choiceBtnClass(String(opt), pickLabel, result)}
            disabled={result !== null}
            onClick={() => {
              const ok = opt === question.answer;
              onResult(index, ok ? "correct" : "wrong", String(opt));
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
