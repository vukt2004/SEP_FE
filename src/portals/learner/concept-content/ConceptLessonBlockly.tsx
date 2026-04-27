import { useId, useMemo } from "react";
import BlocklyWorkspace from "@/tools/block-editor/components/BlocklyWorkspace";
import styles from "./ConceptLessonBlockly.module.css";

/** Các nhóm block đúng với blocks-config.json — gắn với từng chủ đề bài học. */
export const CONCEPT_BLOCKLY_PRESETS = {
  /** Thứ tự lệnh: đi, quay, chờ */
  sequence: ["move_forward", "turn_left", "turn_right", "wait"],
  /** If / điều kiện trong game */
  branch: [
    "custom_if",
    "path_ahead",
    "wall_ahead",
    "logic_true",
    "logic_false",
    "logic_not",
    "move_forward",
    "turn_left",
    "turn_right",
    "wait",
  ],
  /** For / repeat với số lần */
  repeat_basic: ["repeat", "move_forward", "turn_left", "turn_right", "number_literal"],
  /** While + điều kiện quan sát */
  while_basic: ["custom_while", "path_ahead", "move_forward", "turn_left", "logic_not", "logic_true", "logic_false"],
  /** Biến + số + phép toán (giống game) */
  variables_play: ["create_variable", "set_variable", "get_variable", "number_literal", "math_arithmetic"],
  /** So sánh số / đúng sai + if (có nhánh Khác) */
  compare_play: [
    "custom_if",
    "logic_compare",
    "number_literal",
    "logic_true",
    "logic_false",
    "path_ahead",
    "move_forward",
    "turn_left",
  ],
  /** Ghép kế hoạch nhỏ: lặp + rẽ nhánh + di chuyển (có quay phải cho nhánh Khác) */
  plan_mix: ["repeat", "custom_if", "path_ahead", "move_forward", "turn_left", "turn_right", "number_literal"],
} as const;

export type ConceptBlocklyPreset = keyof typeof CONCEPT_BLOCKLY_PRESETS;

/** Khối mẫu đã ghép trên sân — cùng kiểu block với preset (Blockly 12 XML). */
const BLOCKLY_XML = 'xmlns="https://developers.google.com/blockly/xml"';

/** Gắn movable/deletable/editable=false để Blockly lưu trong snapshot + không kéo/sửa mẫu. */
export function withConceptStarterLockAttrs(xml: string): string {
  if (!xml.includes("<block ")) return xml;
  return xml.replace(/<block /g, '<block movable="false" deletable="false" editable="false" ');
}

const STARTER_XML_BY_PRESET: Record<ConceptBlocklyPreset, string> = {
  sequence: `<xml ${BLOCKLY_XML}><block type="move_forward" x="48" y="72"><next><block type="turn_left"><next><block type="wait"></block></next></block></next></block></xml>`,
  branch: `<xml ${BLOCKLY_XML}><block type="custom_if" x="40" y="64"><value name="CONDITION"><block type="path_ahead"></block></value><statement name="DO"><block type="move_forward"><next><block type="turn_left"></block></next></block></statement><statement name="ELSE"><block type="turn_right"><next><block type="wait"></block></next></block></statement></block></xml>`,
  repeat_basic: `<xml ${BLOCKLY_XML}><block type="repeat" x="40" y="56"><value name="TIMES"><block type="number_literal"><field name="VALUE">3</field></block></value><statement name="DO"><block type="move_forward"><next><block type="turn_right"></block></next></block></statement></block></xml>`,
  while_basic: `<xml ${BLOCKLY_XML}><block type="custom_while" x="40" y="56"><value name="CONDITION"><block type="path_ahead"></block></value><statement name="DO"><block type="move_forward"><next><block type="turn_left"></block></next></block></statement></block></xml>`,
  variables_play: `<xml ${BLOCKLY_XML}><block type="create_variable" x="32" y="48"><field name="NAME">score</field><value name="VALUE"><block type="number_literal"><field name="VALUE">0</field></block></value><next><block type="set_variable"><field name="NAME">score</field><value name="VALUE"><block type="math_arithmetic"><value name="A"><block type="get_variable"><field name="NAME">score</field></block></value><field name="OP">+</field><value name="B"><block type="number_literal"><field name="VALUE">10</field></block></value></block></value></block></next></block></xml>`,
  compare_play: `<xml ${BLOCKLY_XML}><block type="custom_if" x="32" y="40"><value name="CONDITION"><block type="logic_compare"><value name="A"><block type="number_literal"><field name="VALUE">5</field></block></value><field name="OP">></field><value name="B"><block type="number_literal"><field name="VALUE">2</field></block></value></block></value><statement name="DO"><block type="move_forward"></block></statement><statement name="ELSE"><block type="turn_left"></block></statement></block></xml>`,
  plan_mix: `<xml ${BLOCKLY_XML}><block type="repeat" x="32" y="40"><value name="TIMES"><block type="number_literal"><field name="VALUE">2</field></block></value><statement name="DO"><block type="custom_if"><value name="CONDITION"><block type="path_ahead"></block></value><statement name="DO"><block type="move_forward"><next><block type="turn_left"></block></next></block></statement><statement name="ELSE"><block type="turn_right"></block></statement></block></statement></block></xml>`,
};

const STARTER_EXPLANATION_BY_PRESET: Record<ConceptBlocklyPreset, string> = {
  sequence:
    "Chuỗi mẫu: Tiến → Quay trái → Chờ — thể hiện thứ tự chạy từ trên xuống. Mỗi lệnh chờ lệnh trước xong mới tới lượt; “Chờ” tách bước giống khi game cần nhịp.",
  branch:
    "Nếu có đường phía trước thì làm nhánh “Làm”: tiến rồi quay trái; nếu không thì nhánh “Khác”: quay phải rồi chờ — hai hướng xử lý khác nhau cho hai tình huống (đúng / sai của điều kiện).",
  repeat_basic:
    "Lặp 3 lần khối “Làm”: mỗi vòng gồm tiến rồi quay phải — số lần lặp cố định giống for; thân lặp là chuỗi lệnh được nhắc lại.",
  while_basic:
    "While kiểm tra điều kiện trước mỗi vòng: chừng nào còn đường phía trước thì lặp tiến + quay trái; hết đường thì thoát — khác for vì không biết trước số vòng.",
  variables_play:
    "Tạo biến score = 0, rồi gán score = score + 10 — biến nhớ giá trị giữa các lệnh; phép cộng dùng giá trị hiện tại của score rồi ghi đè lại.",
  compare_play:
    "Điều kiện là so sánh 5 > 2 (luôn đúng): nhánh “Làm” tiến; nhánh “Khác” quay trái — minh họa so sánh số quyết định nhánh if/else.",
  plan_mix:
    "Vòng ngoài lặp đúng 2 lần; mỗi lần vào thân lặp gặp if: có đường thì tiến + quay trái, không có đường thì quay phải — lồng điều kiện trong lặp giống nhiều bài game (lặp bước, mỗi bước tùy tình huống).",
};

type Props = {
  title: string;
  hint?: string;
  /** Dùng preset có sẵn… */
  preset?: ConceptBlocklyPreset;
  /** …hoặc danh sách type tùy chỉnh (ưu tiên hơn preset nếu có phần tử). */
  visibleBlockTypes?: string[];
  /** XML mẫu tùy chỉnh (khi dùng `visibleBlockTypes` không qua preset). */
  starterDemoXml?: string;
  /** Giải thích riêng khi dùng `starterDemoXml` (không có preset). */
  starterExplanation?: string;
  /** Chiều cao vùng kéo thả (px). */
  heightPx?: number;
};

export function ConceptLessonBlockly({
  title,
  hint,
  preset,
  visibleBlockTypes,
  starterDemoXml,
  starterExplanation,
  heightPx = 340,
}: Props) {
  const reactId = useId().replace(/:/g, "");
  const workspaceId = useMemo(() => `concept-blockly-${reactId}`, [reactId]);

  const blocks = useMemo(() => {
    if (visibleBlockTypes?.length) return [...visibleBlockTypes];
    if (preset) return [...CONCEPT_BLOCKLY_PRESETS[preset]];
    return null;
  }, [preset, visibleBlockTypes]);

  const starterXml = useMemo(() => {
    const custom = starterDemoXml?.trim();
    if (custom) return custom;
    if (preset) return STARTER_XML_BY_PRESET[preset];
    return "";
  }, [preset, starterDemoXml]);

  const lockedStarterXml = useMemo(
    () => (starterXml ? withConceptStarterLockAttrs(starterXml) : ""),
    [starterXml],
  );

  const explanationText = useMemo(() => {
    if (starterExplanation?.trim()) return starterExplanation.trim();
    if (preset) return STARTER_EXPLANATION_BY_PRESET[preset];
    return "";
  }, [preset, starterExplanation]);

  if (!blocks?.length) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        {starterXml ? (
          <>
            <p className={styles.demoNote}>
              Trên sân có <strong>ví dụ ghép sẵn</strong> (nhạt nhẹ, không kéo được) — chỉ để quan sát
              cấu trúc. Bạn kéo khối <em>mới</em> từ cột trái vào để luyện; có thùng rác để xóa khối
              bạn thêm.
            </p>
            {explanationText ? <p className={styles.explainBody}>{explanationText}</p> : null}
          </>
        ) : null}
      </div>
      <div className={styles.workspace} style={{ minHeight: heightPx, height: heightPx }}>
        <BlocklyWorkspace
          workspaceId={workspaceId}
          visibleBlockTypes={blocks}
          initialXml={lockedStarterXml || undefined}
          conceptStarterPresentation={Boolean(lockedStarterXml)}
        />
      </div>
      <p className={styles.footer}>
        Kéo khối từ cột trái (hoặc từ nhóm trong flyout) vào vùng làm việc; có thùng rác để xóa khối.
      </p>
    </div>
  );
}
