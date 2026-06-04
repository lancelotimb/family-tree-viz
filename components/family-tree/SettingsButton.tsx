"use client";

import { Settings } from "lucide-react";

type SettingsButtonProps = {
  onClick: () => void;
  className?: string;
  label?: string;
};

export function SettingsButton({ onClick, className = "", label }: SettingsButtonProps) {
  const ariaLabel = label ?? "Settings";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`flex cursor-pointer items-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef] ${
        label ? "gap-2 px-3 py-2" : "h-10 w-10 justify-center"
      } ${className}`}
    >
      <Settings className="h-4 w-4 shrink-0" />
      {label ? <span className="text-sm font-medium">{label}</span> : null}
    </button>
  );
}
