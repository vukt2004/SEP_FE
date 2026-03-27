import { X } from "lucide-react";

export type AlertToastType = "success" | "warning" | "error";

export function AlertToast(props: {
  type?: AlertToastType;
  message: string;
  onClose: () => void;
}) {
  const type = props.type ?? "success";

  const tone =
    type === "success"
      ? {
          border: "border-emerald-200 dark:border-emerald-900",
          bg: "bg-white dark:bg-slate-900",
          iconBg: "bg-emerald-500/10",
          iconText: "text-emerald-600 dark:text-emerald-400",
          icon: "✓",
        }
      : type === "warning"
        ? {
            border: "border-amber-200 dark:border-amber-900",
            bg: "bg-white dark:bg-slate-900",
            iconBg: "bg-amber-500/10",
            iconText: "text-amber-600 dark:text-amber-400",
            icon: "!",
          }
        : {
            border: "border-red-200 dark:border-red-900",
            bg: "bg-white dark:bg-slate-900",
            iconBg: "bg-red-500/10",
            iconText: "text-red-600 dark:text-red-400",
            icon: "×",
          };

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed right-6 top-[86px] z-[60] flex min-w-[280px] max-w-[420px] items-center gap-3 rounded-xl border px-3 py-2 shadow-xl",
        tone.border,
        tone.bg,
      ].join(" ")}
    >
      <div
        className={[
          "grid h-8 w-8 place-items-center rounded-lg text-sm font-black",
          tone.iconBg,
          tone.iconText,
        ].join(" ")}
        aria-hidden
      >
        {tone.icon}
      </div>
      <div className="min-w-0 flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
        <span className="truncate">{props.message}</span>
      </div>
      <button
        type="button"
        onClick={props.onClose}
        className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        aria-label="Close toast"
      >
        <X size={16} />
      </button>
    </div>
  );
}

