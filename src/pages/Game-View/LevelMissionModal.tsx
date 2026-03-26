import {
  Target,
  ShieldAlert,
  Boxes,
  ListChecks,
  Play,
  Hand,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  Lightbulb,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "@/lib/i18n/translations";
import BlocklyWorkspace from "../../tools/block-editor/components/BlocklyWorkspace";
import blocksConfig from "../../shared/block/blocks-config.json";

interface LevelMissionModalProps {
  isOpen: boolean;
  levelTitle: string;
  goal: string;
  blockLimit: number | null;
  requiredBlocks: string[];
  allowedBlocks: string[];
  bannedBlocks?: string[];
  onStart: () => void;
  onClose?: () => void;
}

export function LevelMissionModal({
  isOpen,
  levelTitle,
  goal,
  blockLimit,
  requiredBlocks,
  allowedBlocks,
  bannedBlocks,
  onStart,
  onClose,
}: LevelMissionModalProps) {
  const { t, locale } = useTranslation();
  const isVi = locale === "vi";
  // `levelTitle` được truyền từ caller, nhưng UI tutorial hiện không hiển thị dòng title nữa.
  // Dùng `void` để tránh cảnh báo biến chưa được dùng.
  void levelTitle;
  // Nút đóng đã bỏ theo yêu cầu UX, giữ prop để tương thích caller cũ.
  void onClose;
  // 0..5 represent 6 tutorial screens (matches 6 dots).
  const [screen, setScreen] = useState<number>(0);
  const [isShrunk, setIsShrunk] = useState(false);
  const [bubblePos, setBubblePos] = useState({ x: 24, y: 120 });
  const [isDraggingBubble, setIsDraggingBubble] = useState(false);
  const bubbleDragOffsetRef = useRef({ x: 0, y: 0 });
  const bubbleMovedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setScreen(0);
      setIsShrunk(false);
      if (typeof window !== "undefined") {
        setBubblePos({
          x: Math.max(12, window.innerWidth - 88),
          y: Math.max(12, window.innerHeight - 120),
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isDraggingBubble) return;

    const bubbleSize = 64;
    const margin = 8;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const moveBubble = (clientX: number, clientY: number) => {
      const nextX = clamp(
        clientX - bubbleDragOffsetRef.current.x,
        margin,
        Math.max(margin, window.innerWidth - bubbleSize - margin),
      );
      const nextY = clamp(
        clientY - bubbleDragOffsetRef.current.y,
        margin,
        Math.max(margin, window.innerHeight - bubbleSize - margin),
      );
      setBubblePos({ x: nextX, y: nextY });
      bubbleMovedRef.current = true;
    };

    const handleMouseMove = (event: MouseEvent) => moveBubble(event.clientX, event.clientY);
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      moveBubble(touch.clientX, touch.clientY);
    };
    const handleDragEnd = () => {
      setIsDraggingBubble(false);
      setTimeout(() => {
        bubbleMovedRef.current = false;
      }, 0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDraggingBubble]);

  if (!isOpen) return null;

  const startBubbleDrag = (clientX: number, clientY: number) => {
    bubbleDragOffsetRef.current = {
      x: clientX - bubblePos.x,
      y: clientY - bubblePos.y,
    };
    bubbleMovedRef.current = false;
    setIsDraggingBubble(true);
  };

  if (isShrunk) {
    return (
      <div style={styles.overlayShrunk}>
        <div
          style={{
            ...styles.shrunkBubble,
            left: bubblePos.x,
            top: bubblePos.y,
            cursor: isDraggingBubble ? "grabbing" : "grab",
          }}
          onMouseDown={(event) => startBubbleDrag(event.clientX, event.clientY)}
          onTouchStart={(event) => {
            const touch = event.touches[0];
            if (!touch) return;
            startBubbleDrag(touch.clientX, touch.clientY);
          }}
          onClick={() => {
            if (bubbleMovedRef.current) return;
            setIsShrunk(false);
          }}
          role="button"
          aria-label={isVi ? "Mở lại hướng dẫn" : "Open tutorial"}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              setIsShrunk(false);
            }
          }}
        >
          <Lightbulb size={22} />
          <span style={styles.shrunkBubbleDot} />
        </div>
      </div>
    );
  }

  const formatGoal = (rawGoal: string): string => {
    // PlatformGameView/GameView currently pass goal as English phrases like "Reach Goal".
    // Keep this local mapping so the modal becomes user-friendly without touching all callers.
    if (!isVi) return rawGoal;
    if (rawGoal === "Reach Goal") return "Đưa nhân vật tới ô đích.";
    if (rawGoal === "Collect All Fruits and reach goal") return "Thu thập tất cả 🍎 rồi đưa nhân vật tới ô đích.";
    const m = rawGoal.match(/^Collect (\d+) Fruits and reach goal$/);
    if (m) return `Thu thập ${m[1]} 🍎 rồi đưa nhân vật tới ô đích.`;
    return rawGoal;
  };

  const limitValue = blockLimit !== null ? (isVi ? `${blockLimit} khối` : `${blockLimit} blocks`) : isVi ? "Không giới hạn" : "No limit";
  const limitHint =
    blockLimit !== null
      ? isVi
        ? "Giới hạn số block"
        : "Blocks limit"
      : isVi
        ? "Không giới hạn số block"
        : "No block limit";

  const requiredValue =
    requiredBlocks.length > 0 ? requiredBlocks.join(", ") : isVi ? "Không có" : "None";
  const requiredHint = isVi ? "Block bắt buộc" : "Required blocks";

  const allowedOrBanned = (() => {
    const hasAllowed = allowedBlocks.length > 0;
    const hasBanned = Boolean(bannedBlocks && bannedBlocks.length > 0);

    if (hasAllowed) {
      return { label: isVi ? "Chỉ được dùng" : "Only allowed", value: allowedBlocks.join(", ") };
    }
    if (hasBanned) {
      return { label: isVi ? "Bị cấm" : "Banned", value: bannedBlocks!.join(", ") };
    }
    return { label: isVi ? "Khối" : "Block", value: isVi ? "Được dùng mọi block" : "All blocks allowed" };
  })();

  const dotsCount = 6;
  const activeDotIndex = Math.max(0, Math.min(5, screen));
  const miniWorkspaceBannedBlockTypes = blocksConfig.blocks
    .map((b) => b.type)
    .filter((type) => type !== "move_forward");

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <style>{`
          @keyframes missionViewIn {
            from { opacity: 0; transform: translateY(10px) scale(0.99); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes demoDragBlock {
            0% { transform: translateX(0); opacity: 0.9; }
            35% { transform: translateX(110px); opacity: 1; }
            70% { transform: translateX(80px); opacity: 1; }
            100% { transform: translateX(110px); opacity: 0.9; }
          }
          @keyframes demoArrowPulse {
            0%, 100% { opacity: 0.55; transform: translateX(0); }
            50% { opacity: 0.95; transform: translateX(4px); }
          }
          @keyframes demoPlayPulse {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.95; }
            50% { transform: translateY(-2px) scale(1.08); opacity: 1; }
          }
          @keyframes demoStartWiggle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          @keyframes demoGlow {
            0%, 100% { box-shadow: 0 0 0 rgba(37, 99, 235, 0); }
            50% { box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.12); }
          }
          @keyframes dotBreath {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.55; }
            50% { transform: translateY(-1px) scale(1.05); opacity: 0.9; }
          }
          @keyframes dotActivePulse {
            0%, 100% { transform: translateY(0) scale(1); opacity: 1; }
            50% { transform: translateY(-2px) scale(1.15); opacity: 1; }
          }
        `}</style>
        <div style={styles.modalHeader}>
          <div style={styles.popupHeaderLeft}>
            <Lightbulb size={18} style={{ color: "rgba(255,255,255,0.95)" }} aria-hidden />
            <div style={styles.popupHeaderTitle}>{isVi ? "HƯỚNG DẪN" : "Tutorials"}</div>
          </div>

          <div style={styles.popupHeaderDots} aria-hidden>
            {Array.from({ length: dotsCount }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.dot,
                  background: i === activeDotIndex ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.45)",
                  animation: i === activeDotIndex ? "dotActivePulse 900ms ease-in-out infinite" : "dotBreath 1.2s ease-in-out infinite",
                  animationDelay: i === activeDotIndex ? "0ms" : `${i * 90}ms`,
                }}
              />
            ))}
          </div>

          <div style={styles.popupHeaderRight}>
            <button
              type="button"
              style={styles.headerAction}
              onClick={() => setIsShrunk((p) => !p)}
              aria-label="Shrink tutorial"
            >
              <Minimize2 size={18} style={{ color: "rgba(255,255,255,0.95)" }} aria-hidden />
              <span style={styles.headerActionText}>{isVi ? "Thu gọn" : "Shrink"}</span>
            </button>
          </div>
        </div>

        {!isShrunk && (
          <div style={styles.body}>
          <div key={screen} style={styles.viewAnim}>
            {screen === 0 && (
              <>
                <div style={styles.sectionHeading}>{isVi ? "LẬP TRÌNH BẰNG BLOCK" : "PROGRAM WITH BLOCKS"}</div>
                <div style={styles.featureDesc}>
                  {isVi
                    ? "Kéo block vào vùng lập trình bên phải để điều khiển nhân vật trong màn này. Thứ tự block quyết định hành động."
                    : "Drag blocks into the program area on the right to control the character in this level. Block order determines the actions."}
                </div>
                <div style={styles.featureChipsRow}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Play size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Thứ tự quan trọng" : "Order matters"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Hand size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Kéo vào vùng lập trình" : "Drag to the program area"}
                  </div>
                </div>
                <div style={styles.miniBlocklyWrap}>
                  <div style={styles.miniBlocklyLabelsRow} aria-hidden>
                    <div style={styles.miniBlocklyLabel}>{isVi ? "Khối" : "Blocks"}</div>
                    <div style={styles.miniBlocklyLabel}>{isVi ? "Khu lập trình" : "Program area"}</div>
                  </div>
                  <BlocklyWorkspace
                    workspaceId="tutorial-mini-workspace-0"
                    bannedBlockTypes={miniWorkspaceBannedBlockTypes}
                    blockLimit={null}
                  />
                </div>
                <div style={{ ...styles.stepRow, marginTop: "10px" }}>
                  <span
                    style={{
                      ...styles.stepNum,
                      background: "color-mix(in srgb, var(--primary) 16%, transparent)",
                      borderColor: "color-mix(in srgb, var(--primary) 45%, var(--border))",
                    }}
                  >
                    1
                  </span>
                  <div style={styles.stepText}>
                    {isVi ? "Kéo block vào vùng lập trình (bên phải)." : "Drag blocks into the program area (right side)."}
                    <div style={styles.stepSub}>
                      {isVi ? "Sắp xếp theo thứ tự bạn muốn nhân vật làm trong màn này." : "Arrange blocks in the order you want in this level."}
                    </div>
                  </div>
                  <Hand size={18} style={{ color: "var(--primary)" }} aria-hidden />
                </div>
                <button style={styles.nextButton} onClick={() => setScreen(1)}>
                  {t("next")}
                </button>
              </>
            )}

            {screen === 1 && (
              <>
                <div style={styles.sectionHeading2}>{isVi ? "CHẠY CHƯƠNG TRÌNH" : "RUN PROGRAM"}</div>
                <div style={styles.featureDesc}>
                  {isVi
                    ? "Sau khi kéo block xong, bấm Run Program để chạy chuỗi lệnh. Nhân vật sẽ di chuyển theo thứ tự block từ trên xuống dưới."
                    : "After you drag blocks, press Run Program to execute. The character moves following the blocks from top to bottom."}
                </div>
                <div style={{ ...styles.stepRow, marginTop: "10px" }}>
                  <span
                    style={{
                      ...styles.stepNum,
                      background: "color-mix(in srgb, var(--primary) 16%, transparent)",
                      borderColor: "color-mix(in srgb, var(--primary) 45%, var(--border))",
                    }}
                  >
                    1
                  </span>
                  <div style={styles.stepText}>
                    {isVi ? "Bấm Run Program" : "Press Run Program"}
                    <div style={styles.stepSub}>
                      {isVi ? "Chạy chuỗi block bạn vừa thả." : "Execute the blocks you just built."}
                    </div>
                  </div>
                  <Play
                    size={18}
                    style={{ color: "var(--primary)", animation: "demoPlayPulse 900ms ease-in-out infinite" }}
                    aria-hidden
                  />
                </div>
                <div style={{ ...styles.featureChipsRow, marginTop: "10px" }}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Hand size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Kéo block xong" : "Drag blocks"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Play size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Bấm Run để chạy" : "Run to execute"}
                  </div>
                </div>
                <button style={styles.nextButton} onClick={() => setScreen(2)}>
                  {t("next")}
                </button>
              </>
            )}

            {screen === 2 && (
              <>
                <div style={styles.sectionHeading2}>{isVi ? "MỤC TIÊU" : "GOAL"}</div>
                <div style={styles.goalCard}>
                  <div style={styles.cardTitleRow}>
                    <Target size={16} />
                    <div style={styles.cardTitleText}>{isVi ? "MỤC TIÊU" : "GOAL"}</div>
                  </div>
                  <div style={styles.goalText}>{formatGoal(goal)}</div>
                </div>
                <div style={styles.featureDesc}>
                  {isVi
                    ? "Mục tiêu để qua màn này. Game kiểm tra sau khi bạn bấm Run Program."
                    : "Your goal to pass this level. The game checks it after you press Run Program."}
                </div>
                <div style={styles.featureChipsRow}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Target size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Mục tiêu" : "Goal"}
                  </div>
                </div>
                <button style={styles.nextButton} onClick={() => setScreen(3)}>
                  {t("next")}
                </button>
              </>
            )}

            {screen === 3 && (
              <>
                <div style={styles.sectionHeading2}>{isVi ? "GIỚI HẠN KHỐI" : "BLOCK LIMIT"}</div>
                <div style={styles.infoCardBlue}>
                  <div style={styles.cardTitleRow}>
                    <Boxes size={16} />
                    <div style={styles.cardTitleText}>{isVi ? "GIỚI HẠN KHỐI" : "BLOCK LIMIT"}</div>
                  </div>
                  <div style={styles.infoMain}>{limitValue}</div>
                  <div style={styles.infoSub}>{limitHint}</div>
                  {blockLimit !== null && (
                    <div style={styles.infoNote}>
                      {isVi ? "Vẫn chạy được, nhưng điểm sẽ thấp hơn." : "Over the limit still runs, but your score is lower."}
                    </div>
                  )}
                </div>
                <div style={styles.featureDesc}>
                  {isVi
                    ? blockLimit !== null
                      ? "Màn này có giới hạn số block. Vượt limit vẫn chạy, nhưng điểm sẽ thấp hơn."
                      : "Màn này không giới hạn số block. Bạn có thể thả thoải mái mà không bị trừ điểm do số lượng. Tuy vậy, bạn vẫn phải dùng đúng luật bắt buộc và Allowed/Banned để chương trình chạy được."
                    : blockLimit !== null
                      ? "This level has a block limit. Exceeding it still runs, but your score will be lower."
                      : "No block limit for this level. Drop as many blocks as you want without being penalized for the count. You still must follow the required and Allowed/Banned rules to run and pass."}
                </div>
                <div style={styles.featureChipsRow}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Boxes size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Giới hạn khối" : "Block limit"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Trophy size={14} style={{ color: "var(--warning)" }} aria-hidden />
                    </span>
                    {isVi ? "Vượt = điểm thấp hơn" : "Over = lower score"}
                  </div>
                </div>
                <button style={styles.nextButton} onClick={() => setScreen(4)}>
                  {t("next")}
                </button>
              </>
            )}

            {screen === 4 && (
              <>
                <div style={styles.sectionHeading2}>{isVi ? "CHẠY & KIỂM TRA" : "RUN & CHECK"}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={styles.infoCardOrange}>
                    <div style={styles.cardTitleRow}>
                      <ShieldAlert size={16} />
                      <div style={styles.cardTitleText}>{isVi ? "BẮT BUỘC" : "REQUIRED"}</div>
                    </div>
                    <div style={styles.infoMain}>{requiredValue}</div>
                    <div style={styles.infoSub}>{requiredHint}</div>
                    {requiredBlocks.length > 0 && (
                      <div style={styles.infoNote}>
                        {isVi ? "Thiếu block bắt buộc thì Run Program sẽ không chạy." : "Missing required blocks prevents the program from running."}
                      </div>
                    )}
                  </div>

                  <div style={styles.infoCardPurple}>
                    <div style={styles.cardTitleRow}>
                      <ListChecks size={16} />
                      <div style={styles.cardTitleText}>{allowedOrBanned.label}</div>
                    </div>
                    <div style={styles.infoMain}>{allowedOrBanned.value}</div>
                    <div style={styles.infoSub}>
                      {isVi
                        ? allowedBlocks.length > 0
                          ? "Các block được phép dùng trong màn này."
                          : "Các block bị cấm trong màn này."
                        : allowedBlocks.length > 0
                          ? "Allowed blocks."
                          : "Banned blocks."}
                    </div>
                  </div>
                </div>
                <div style={{ ...styles.stepRow, marginTop: "10px" }}>
                  <span
                    style={{
                      ...styles.stepNum,
                      background: "color-mix(in srgb, var(--primary) 16%, transparent)",
                      borderColor: "color-mix(in srgb, var(--primary) 45%, var(--border))",
                    }}
                  >
                    1
                  </span>
                  <div style={styles.stepText}>
                    {isVi ? "Bấm Run Program để chạy chương trình." : "Press Run Program to execute."}
                    <div style={styles.stepSub}>
                      {isVi
                        ? "Game kiểm tra luật block và mục tiêu trước khi chạy và chấm điểm."
                        : "The game checks block rules and the goal before running and scoring."}
                    </div>
                  </div>
                  <Play
                    size={18}
                    style={{ color: "var(--primary)", animation: "demoPlayPulse 900ms ease-in-out infinite" }}
                    aria-hidden
                  />
                </div>

                <div style={{ ...styles.stepRow, marginTop: "10px" }}>
                  <span
                    style={{
                      ...styles.stepNum,
                      background: "color-mix(in srgb, var(--warning) 16%, transparent)",
                      borderColor: "color-mix(in srgb, var(--warning) 45%, var(--border))",
                    }}
                  >
                    2
                  </span>
                  <div style={styles.stepText}>
                    {isVi ? "Nếu sai luật: không chạy. Nếu vượt limit: vẫn chạy nhưng điểm giảm." : "Fail rules: no run. Exceed limit: still runs, but score drops."}
                    <div style={styles.stepSub}>
                      {isVi ? "Bạn được điểm tốt khi cả số lượng và luật đều đúng." : "You get better points when both count and rules are correct."}
                    </div>
                  </div>
                  <Trophy size={18} style={{ color: "var(--warning)" }} aria-hidden />
                </div>

                <div style={{ ...styles.featureDesc, marginTop: "6px" }}>
                  {isVi ? "Trình tự: kiểm tra luật → chạy nhân vật → kiểm tra mục tiêu." : "Sequence: check rules → run the character → check the goal."}
                </div>
                <div style={styles.featureChipsRow}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <ShieldAlert size={14} style={{ color: "var(--warning)" }} aria-hidden />
                    </span>
                    {isVi ? "1. Kiểm tra luật" : "1. Check rules"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Target size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "2. Kiểm tra mục tiêu" : "2. Check goal"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Trophy size={14} style={{ color: "var(--warning)" }} aria-hidden />
                    </span>
                    {isVi ? "3. Vượt limit: điểm thấp hơn" : "3. Over limit: lower score"}
                  </div>
                </div>

                <button style={styles.nextButton} onClick={() => setScreen(5)}>
                  {t("next")}
                </button>
              </>
            )}

            {screen === 5 && (
              <>
                <div style={styles.sectionHeading2}>{isVi ? "SẴN SÀNG CHƠI" : "READY"}</div>

                <div style={styles.featureDesc}>
                  {isVi ? "Nếu cần, bấm 💡 Hints. Sẵn sàng thì bấm Start để bắt đầu màn này." : "If you need help, press 💡 Hints. When ready, press Start to begin this level."}
                </div>
                <div style={styles.featureChipsRow}>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Lightbulb size={14} style={{ color: "var(--info)" }} aria-hidden />
                    </span>
                    {isVi ? "💡 Hints" : "💡 Hints"}
                  </div>
                  <div style={styles.featureChip}>
                    <span style={styles.featureChipIcon}>
                      <Play size={14} style={{ color: "var(--primary)" }} aria-hidden />
                    </span>
                    {isVi ? "Start" : "Start"}
                  </div>
                </div>

                <button style={styles.startButton} onClick={onStart}>
                  <Play size={16} style={{ animation: "demoStartWiggle 900ms ease-in-out infinite" }} />{" "}
                  <span style={styles.startButtonText}>
                    {isVi ? "Bắt đầu màn chơi!" : "Start the level"}
                    <span style={styles.startButtonSub}>
                      {isVi ? "Bắt đầu lập trình" : "Begin programming"}
                    </span>
                  </span>
                </button>
              </>
            )}
          </div>
          </div>
        )}

        {!isShrunk && (
          <>
            <button
              type="button"
              style={{
                ...styles.navArrow,
                ...(screen === 0 ? styles.navArrowDisabled : {}),
                pointerEvents: screen === 0 ? "none" : "auto",
                left: -18,
              }}
              aria-label="Previous"
              onClick={() => setScreen((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              style={{
                ...styles.navArrow,
                ...(screen === 5 ? styles.navArrowDisabled : {}),
                pointerEvents: screen === 5 ? "none" : "auto",
                right: -18,
              }}
              aria-label="Next"
              onClick={() => setScreen((p) => Math.min(5, p + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlayShrunk: {
    position: "fixed",
    inset: 0,
    zIndex: 1200,
    pointerEvents: "none",
  },
  shrunkBubble: {
    position: "fixed",
    width: 64,
    height: 64,
    borderRadius: 999,
    border: "1px solid color-mix(in srgb, var(--success) 55%, var(--border))",
    background: "linear-gradient(180deg, var(--success) 0%, color-mix(in srgb, var(--success) 72%, var(--primary)) 100%)",
    color: "rgba(255,255,255,0.98)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 14px 28px rgba(16, 185, 129, 0.3)",
    pointerEvents: "auto",
    userSelect: "none",
  },
  shrunkBubbleDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.95)",
    boxShadow: "0 0 0 4px rgba(255,255,255,0.2)",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15, 23, 42, 0.42)",
    backdropFilter: "blur(6px)",
    padding: "16px",
  },
  modal: {
    position: "relative",
    width: "min(640px, 100%)",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "20px",
    boxShadow: "0 24px 54px rgba(15, 23, 42, 0.32)",
    overflow: "hidden",
    color: "var(--text)",
  },
  modalHeader: {
    background: "linear-gradient(90deg, var(--success) 0%, color-mix(in srgb, var(--success) 72%, var(--primary)) 100%)",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    color: "var(--primary-contrast, #fff)",
  },
  popupHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },
  popupHeaderTitle: {
    fontWeight: 900,
    fontSize: "13px",
    letterSpacing: "0.2px",
    color: "rgba(255,255,255,0.98)",
    whiteSpace: "nowrap",
  },
  popupHeaderDots: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(255,255,255,0.45)",
  },
  popupHeaderRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  headerAction: {
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.14)",
    color: "rgba(255,255,255,0.95)",
    borderRadius: 10,
    padding: "8px 10px",
    cursor: "pointer",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.12s ease, background 0.12s ease",
  },
  headerActionText: {
    marginTop: "2px",
    fontSize: "11px",
    fontWeight: 900,
    opacity: 0.95,
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 46,
    height: 46,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "color-mix(in srgb, var(--success) 88%, rgba(0,0,0,0.1))",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(16, 185, 129, 0.22)",
    zIndex: 1,
  },
  navArrowDisabled: {
    opacity: 0.4,
  },
  headerTitles: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  modalHeaderTitle: {
    fontWeight: 800,
    fontSize: "14px",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  modalHeaderSubtitle: {
    fontWeight: 700,
    fontSize: "13px",
    opacity: 0.95,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  closeButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    padding: 0,
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.55)",
    background: "rgba(255,255,255,0.18)",
    color: "var(--primary-contrast, #fff)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  body: {
    padding: "14px 14px 16px",
  },
  viewAnim: {
    animation: "missionViewIn 220ms ease both",
  },
  sectionHeading: {
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.35px",
    color: "var(--text-2)",
    textTransform: "uppercase",
    marginBottom: "10px",
  },
  levelTitleInline: {
    marginTop: "-4px",
    marginBottom: "10px",
    fontSize: "13px",
    fontWeight: 800,
    color: "var(--text-2)",
    lineHeight: 1.25,
  },
  featureDesc: {
    marginTop: "-2px",
    marginBottom: "10px",
    fontSize: "13px",
    fontWeight: 650,
    color: "var(--text-2)",
    lineHeight: 1.45,
  },
  featureBullets: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "10px",
  },
  featureBullet: {
    fontSize: "12px",
    fontWeight: 650,
    color: "var(--text-2)",
    lineHeight: 1.35,
    display: "flex",
    gap: "8px",
    alignItems: "flex-start",
  },
  featureBulletDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 6,
    background: "color-mix(in srgb, var(--primary) 65%, transparent)",
    flex: "0 0 auto",
  },
  featureChipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "10px",
  },
  featureChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 10px",
    borderRadius: 999,
    background: "color-mix(in srgb, var(--primary) 8%, transparent)",
    border: "1px solid color-mix(in srgb, var(--primary) 28%, var(--border))",
    color: "var(--text-2)",
    fontSize: "12px",
    fontWeight: 700,
    lineHeight: 1,
  },
  featureChipIcon: {
    display: "inline-flex",
    width: 22,
    height: 22,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
  },
  miniBlocklyWrap: {
    height: 170,
    width: "100%",
    position: "relative",
    borderRadius: 14,
    border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 6%, var(--surface-2))",
    overflow: "hidden",
    marginBottom: "10px",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
  },
  miniBlocklyLabelsRow: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    display: "flex",
    justifyContent: "space-between",
    pointerEvents: "none",
    zIndex: 2,
  },
  miniBlocklyLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.25px",
    color: "var(--text-2)",
    opacity: 0.95,
    textTransform: "uppercase",
  },
  demoPanel: {
    borderRadius: "14px",
    border: "1px solid color-mix(in srgb, var(--primary) 25%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 8%, var(--surface-2))",
    padding: "10px 12px",
    marginBottom: "10px",
  },
  demoLabelsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
    color: "var(--text-2)",
    fontWeight: 800,
    fontSize: "12px",
  },
  demoLabel: {
    opacity: 0.95,
  },
  demoTrack: {
    position: "relative",
    height: 44,
    borderRadius: 12,
    background: "color-mix(in srgb, var(--surface-2) 70%, transparent)",
    border: "1px dashed color-mix(in srgb, var(--primary) 25%, var(--border))",
    overflow: "hidden",
  },
  demoBlock: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 28,
    height: 20,
    borderRadius: 10,
    border: "1px solid color-mix(in srgb, var(--primary) 40%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 20%, var(--surface))",
    animation: "demoDragBlock 1.2s ease-in-out infinite",
  },
  demoBlockTag: {
    position: "absolute",
    top: 3,
    left: 3,
    width: 18,
    height: 12,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "color-mix(in srgb, var(--primary) 22%, var(--surface))",
  },
  demoBlockText: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    textAlign: "center",
    fontSize: 9,
    fontWeight: 900,
    color: "var(--text)",
    opacity: 0.95,
    pointerEvents: "none",
  },
  demoArrow: {
    position: "absolute",
    top: 22,
    left: 46,
    right: 10,
    height: 2,
    background: "linear-gradient(90deg, color-mix(in srgb, var(--primary) 70%, transparent), color-mix(in srgb, var(--primary) 20%, transparent))",
    borderRadius: 999,
    animation: "demoArrowPulse 1.2s ease-in-out infinite",
  },
  sectionHeading2: {
    marginTop: "14px",
    marginBottom: "10px",
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.35px",
    color: "var(--text-2)",
    textTransform: "uppercase",
  },
  steps: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "2px",
  },
  stepRow: {
    borderRadius: "12px",
    background: "var(--surface-2)",
    border: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    boxShadow: "0 10px 18px color-mix(in srgb, var(--primary) 6%, transparent)",
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "12px",
    color: "var(--primary-contrast, #fff)",
    border: "1px solid rgba(0,0,0,0.12)",
    flex: "0 0 auto",
  },
  stepText: {
    fontWeight: 700,
    fontSize: "13px",
    color: "var(--text)",
    flex: 1,
    lineHeight: 1.25,
  },
  stepSub: {
    fontWeight: 600,
    fontSize: "11px",
    color: "var(--text-2)",
    lineHeight: 1.35,
    marginTop: "2px",
  },
  goalCard: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--success) 30%, var(--border))",
    background: "color-mix(in srgb, var(--success) 10%, transparent)",
    padding: "12px 12px",
  },
  infoGrid: {
    display: "grid",
    gap: "10px",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: "10px",
  },
  cardTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "6px",
  },
  cardTitleText: {
    fontWeight: 700,
    fontSize: "12px",
    letterSpacing: "0.2px",
    textTransform: "uppercase",
    color: "var(--text-2)",
  },
  goalText: {
    fontWeight: 700,
    fontSize: "14px",
    color: "var(--text)",
  },
  infoCardBlue: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--primary) 40%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
    padding: "12px 12px",
  },
  infoCardOrange: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))",
    background: "color-mix(in srgb, var(--accent) 14%, transparent)",
    padding: "12px 12px",
  },
  infoCardPurple: {
    borderRadius: "12px",
    border: "1px solid color-mix(in srgb, var(--info) 40%, var(--border))",
    background: "color-mix(in srgb, var(--info) 14%, transparent)",
    padding: "12px 12px",
    gridColumn: "1 / -1",
  },
  infoMain: {
    fontWeight: 700,
    fontSize: "16px",
    color: "var(--text)",
    lineHeight: 1.25,
  },
  infoSub: {
    fontWeight: 600,
    fontSize: "11px",
    color: "var(--text-2)",
    marginTop: "4px",
  },
  infoNote: {
    fontWeight: 600,
    fontSize: "11px",
    color: "var(--text-2)",
    marginTop: "6px",
    lineHeight: 1.25,
  },
  nextButton: {
    width: "100%",
    marginTop: "14px",
    border: "1px solid color-mix(in srgb, var(--primary) 45%, var(--border))",
    background: "color-mix(in srgb, var(--primary) 10%, var(--surface-2))",
    color: "var(--primary)",
    borderRadius: "14px",
    padding: "12px 14px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.12s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease",
    boxShadow: "0 10px 18px color-mix(in srgb, var(--primary) 10%, transparent)",
  },
  startButton: {
    width: "100%",
    marginTop: "14px",
    border: "1px solid color-mix(in srgb, var(--primary) 52%, var(--border))",
    background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-hover) 100%)",
    color: "#fff",
    borderRadius: "14px",
    padding: "14px 14px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    transition: "transform 0.12s ease",
    boxShadow: "0 12px 24px color-mix(in srgb, var(--primary) 25%, transparent)",
    animation: "demoGlow 1.1s ease-in-out infinite",
  },
  startButtonText: {
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "flex-start",
    lineHeight: 1.1,
  },
  startButtonSub: {
    fontWeight: 900,
    fontSize: "11px",
    opacity: 0.95,
    marginTop: "4px",
  },
};
