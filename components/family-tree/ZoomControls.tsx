"use client";

import { useReactFlow } from "@xyflow/react";
import { Maximize2, Settings, ZoomIn, ZoomOut } from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "./layoutConstants";

type ZoomControlsProps = {
  onSettingsClick?: () => void;
};

export function ZoomControls({ onSettingsClick }: ZoomControlsProps) {
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
      {onSettingsClick && (
        <ZoomButton
          label="Settings"
          icon={<Settings className="h-4 w-4" />}
          onClick={onSettingsClick}
          className="hidden max-md:flex"
        />
      )}
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
        onClick={() => fitView({ duration: 500, padding: 0.15, minZoom: MIN_ZOOM })}
      />
    </div>
  );
}

function ZoomButton({
  label,
  icon,
  onClick,
  className = "flex",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef] ${className}`}
    >
      {icon}
    </button>
  );
}
