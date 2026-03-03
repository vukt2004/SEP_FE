/**
 * StatCard Component
 *
 * Reusable card component for displaying dashboard statistics
 * Follows the design tokens from tokens.css
 */

import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "accent" | "info" | "success";
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant = "default" }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "border-[var(--primary)]";
      case "accent":
        return "border-[var(--accent)]";
      case "info":
        return "border-[var(--info)]";
      case "success":
        return "border-[var(--success)]";
      default:
        return "border-[var(--border)]";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return "text-[var(--primary)]";
      case "accent":
        return "text-[var(--accent)]";
      case "info":
        return "text-[var(--info)]";
      case "success":
        return "text-[var(--success)]";
      default:
        return "text-[var(--text-2)]";
    }
  };

  return (
    <div
      className={`
        bg-[var(--surface)] 
        border-2 
        ${getVariantStyles()} 
        rounded-2xl 
        p-6 
        transition-all 
        hover:border-opacity-80
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[var(--text-2)] text-sm font-medium mb-2">{label}</p>
          <p className="text-[var(--text)] text-2xl font-bold">{value}</p>
        </div>
        {icon && <div className={`${getIconColor()} text-2xl`}>{icon}</div>}
      </div>
    </div>
  );
};
