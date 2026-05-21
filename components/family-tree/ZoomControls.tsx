"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";

/** React Flow defaults to 1.2× per step; use a larger factor for button zoom. */
const ZOOM_STEP = 1.45;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.8;

export function ZoomControls() {
  const { getZoom, zoomTo, fitView } = useReactFlow();

  const zoomIn = () => {
    const next = Math.min(getZoom() * ZOOM_STEP, MAX_ZOOM);
    zoomTo(next, { duration: 300 });
  };

  const zoomOut = () => {
    const next = Math.max(getZoom() / ZOOM_STEP, MIN_ZOOM);
    zoomTo(next, { duration: 300 });
  };

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      <ZoomButton
        label="Zoom in"
        icon={<ZoomIn className="h-4 w-4" />}
        onClick={zoomIn}
      />
      <ZoomButton
        label="Zoom out"
        icon={<ZoomOut className="h-4 w-4" />}
        onClick={zoomOut}
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
