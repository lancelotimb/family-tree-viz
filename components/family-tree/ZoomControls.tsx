"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

export function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <ZoomButton
        label="Zoom in"
        icon={<ZoomIn className="h-4 w-4" />}
        onClick={() => zoomIn({ duration: 300 })}
      />
      <ZoomButton
        label="Zoom out"
        icon={<ZoomOut className="h-4 w-4" />}
        onClick={() => zoomOut({ duration: 300 })}
      />
      <ZoomButton
        label="Fit view"
        icon={<Maximize2 className="h-4 w-4" />}
        onClick={() => fitView({ duration: 500, padding: 0.15 })}
      />
    </div>
  );
}

function ZoomButton({
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
      aria-label={label}
      title={label}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
    >
      {icon}
    </button>
  );
}
