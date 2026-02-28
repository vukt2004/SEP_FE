import { useEffect, useMemo, useState } from "react";
import type { UiMessage } from "../../login/messages";
import styles from "./DuckSpeechBubble.module.css";

type Placement = "top-left" | "top-center" | "top-right";

type Props = {
  message: UiMessage;
  visible?: boolean;
  placement?: Placement;
  className?: string;
  autoHide?: boolean;
};

export default function DuckSpeechBubble({
  message,
  visible = true,
  placement = "top-center",
  className,
  autoHide = true,
}: Props) {
  const [dismissedByTtl, setDismissedByTtl] = useState(false);

  useEffect(() => {
    if (!autoHide) return;
    if (!visible) return;
    if (dismissedByTtl) return;
    if (!message.ttlMs) return;

    const t = window.setTimeout(() => setDismissedByTtl(true), message.ttlMs);
    return () => window.clearTimeout(t);
  }, [autoHide, visible, dismissedByTtl, message.ttlMs]);

  const variantClass = useMemo(() => {
    switch (message.type) {
      case "error":
        return styles.error;
      case "success":
        return styles.success;
      case "loading":
        return styles.loading;
      case "hint":
        return styles.hint;
      case "idle":
      default:
        return styles.idle;
    }
  }, [message.type]);

  const placementClass = useMemo(() => {
    switch (placement) {
      case "top-left":
        return styles.topLeft;
      case "top-right":
        return styles.topRight;
      case "top-center":
      default:
        return styles.topCenter;
    }
  }, [placement]);

  if (!visible || dismissedByTtl) return null;

  return (
    <div
      className={[styles.bubble, variantClass, placementClass, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div className={styles.text}>{message.text}</div>
      <div className={styles.tail} aria-hidden="true" />
      <div className={styles.tailBorder} aria-hidden="true" />
    </div>
  );
}
