import React from "react";
import { useTranslation } from "@/lib/i18n/translations";

interface ExecutionIncompleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export const ExecutionIncompleteModal: React.FC<ExecutionIncompleteModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
    >
      <div
        style={{
          width: "min(92vw, 420px)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.28)",
          padding: "20px",
          color: "var(--text)",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "20px" }}>{t("executionIncompleteTitle")}</h3>
        <p style={{ margin: "10px 0 18px", fontSize: "14px", color: "var(--text-2)" }}>
          {t("executionIncompleteDesc")}
        </p>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "10px",
            padding: "10px 12px",
            background: "var(--warning)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("ok")}
        </button>
      </div>
    </div>
  );
};
