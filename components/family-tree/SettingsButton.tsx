"use client";

import { Settings } from "lucide-react";

type SettingsButtonProps = {
  onClick: () => void;
  className?: string;
};

export function SettingsButton({ onClick, className = "" }: SettingsButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Settings"
      title="Settings"
      className={`flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef] ${className}`}
    >
      <Settings className="h-4 w-4" />
    </button>
  );
}
