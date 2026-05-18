"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { maxGeneration } from "./mockFamilyData";

type ControlSidebarProps = {
  maxDepth: number;
  onMaxDepthChange: (depth: number) => void;
};

export function ControlSidebar({ maxDepth, onMaxDepthChange }: ControlSidebarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <aside className="pointer-events-auto flex w-56 flex-col gap-5 rounded-2xl border border-[#e8dfd0] bg-white/75 p-4 shadow-lg backdrop-blur-md">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
          Canvas
        </p>
        <div className="flex flex-col gap-2">
          <ControlButton
            label="Zoom in"
            icon={<ZoomIn className="h-4 w-4" />}
            onClick={() => zoomIn({ duration: 300 })}
          />
          <ControlButton
            label="Zoom out"
            icon={<ZoomOut className="h-4 w-4" />}
            onClick={() => zoomOut({ duration: 300 })}
          />
          <ControlButton
            label="Fit view"
            icon={<Maximize2 className="h-4 w-4" />}
            onClick={() => fitView({ duration: 500, padding: 0.15 })}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
            Generation depth
          </p>
          <span className="text-xs tabular-nums text-[#3d3428]">
            {maxDepth + 1} / {maxGeneration + 1}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={maxGeneration}
          value={maxDepth}
          onChange={(e) => onMaxDepthChange(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#e8dfd0] accent-[#b8956a]"
          aria-label="Filter by generation depth"
        />
        <div className="mt-1 flex justify-between text-[10px] text-[#a8957a]">
          <span>Root</span>
          <span>Latest</span>
        </div>
      </div>
    </aside>
  );
}

function ControlButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-[#e8dfd0] bg-[#fffef9] px-3 py-2 text-sm text-[#3d3428] transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
    >
      {icon}
      {label}
    </button>
  );
}
