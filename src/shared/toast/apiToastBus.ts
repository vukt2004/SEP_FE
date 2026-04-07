import type { AlertToastType } from "@/shared/components/AlertToast";

export type ApiToastPayload = {
  type: AlertToastType;
  message: string;
};

type ApiToastListener = (payload: ApiToastPayload) => void;

const listeners = new Set<ApiToastListener>();

export function emitApiToast(payload: ApiToastPayload) {
  if (!payload.message.trim()) return;
  listeners.forEach((listener) => listener(payload));
}

export function onApiToast(listener: ApiToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
