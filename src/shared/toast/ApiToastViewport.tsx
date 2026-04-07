import { useEffect, useRef, useState } from "react";
import { AlertToast } from "@/shared/components/AlertToast";
import { onApiToast, type ApiToastPayload } from "@/shared/toast/apiToastBus";

const TOAST_DURATION_MS = 3200;
const TOAST_RIGHT_SHIFT = 7;
const TOAST_TOP_SHIFT = 4;
const TOAST_SCALE_STEP = 0.012;
const TOAST_OPACITY_STEP = 0.08;

type ToastItem = ApiToastPayload & {
  id: number;
};

export function ApiToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextIdRef = useRef(1);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismissToast = (id: number) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const unsubscribe = onApiToast((payload) => {
      const id = nextIdRef.current++;
      setToasts((current) => [...current, { ...payload, id }]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);

      timersRef.current.set(id, timer);
    });

    return () => {
      unsubscribe();
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, index) => (
        <AlertToast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          style={{
            top: 86 + index * TOAST_TOP_SHIFT,
            transform: `translateX(${index * TOAST_RIGHT_SHIFT}px) scale(${1 - index * TOAST_SCALE_STEP})`,
            transformOrigin: "top right",
            opacity: Math.max(0.72, 1 - index * TOAST_OPACITY_STEP),
            zIndex: 60 - index,
          }}
          onClose={() => {
            dismissToast(toast.id);
          }}
        />
      ))}
    </>
  );
}
