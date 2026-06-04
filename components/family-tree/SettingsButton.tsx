"use client";

import { Settings } from "lucide-react";

type SettingsButtonProps = {
  onClick: () => void;
  className?: string;
  label?: string;
  iconPosition?: "left" | "right";
  variant?: "icon" | "panel-header";
};

export function SettingsButton({
  onClick,
  className = "",
  label,
  iconPosition = "left",
  variant = "icon",
}: SettingsButtonProps) {
  const ariaLabel = label ?? "Settings";
  const isPanelHeader = variant === "panel-header" && label;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`flex cursor-pointer items-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef] ${
        isPanelHeader
          ? "shrink-0 gap-1.5 px-4 py-2"
          : label
            ? `gap-2 px-3 py-2 ${iconPosition === "right" ? "flex-row-reverse" : ""}`
            : "h-10 w-10 justify-center"
      } ${className}`}
    >
      {isPanelHeader ? (
        <>
          <span className="font-serif text-base font-medium text-[#3d3428]">{label}</span>
          <Settings className="h-4 w-4 shrink-0 text-[#8b7d6b]" />
        </>
      ) : (
        <>
          <Settings className="h-4 w-4 shrink-0" />
          {label ? <span className="text-sm font-medium">{label}</span> : null}
        </>
      )}
    </button>
  );
}
