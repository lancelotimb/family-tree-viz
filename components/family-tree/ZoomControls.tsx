"use client";

import { useReactFlow } from "@xyflow/react";
import {
  Calendar,
  Image,
  LogOut,
  Maximize2,
  Plus,
  Settings,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "./layoutConstants";

export type ViewMode = "2d" | "3d";

type ZoomControlsProps = {
  onSettingsClick?: () => void;
  timeTravelOpen?: boolean;
  onTimeTravelOpen?: () => void;
  onTimeTravelClose?: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onZoomIn3D?: () => void;
  onZoomOut3D?: () => void;
  /** Reset the 3D camera to its default framing. */
  onResetView?: () => void;
  onAddPerson?: () => void;
  onManageGallery?: () => void;
  addPersonDisabled?: boolean;
  onAdminLogout?: () => void;
};

export function ZoomControls({
  onSettingsClick,
  timeTravelOpen = false,
  onTimeTravelOpen,
  onTimeTravelClose,
  viewMode = "2d",
  onViewModeChange,
  onZoomIn3D,
  onZoomOut3D,
  onResetView,
  onAddPerson,
  onManageGallery,
  addPersonDisabled = false,
  onAdminLogout,
}: ZoomControlsProps) {
  const { getZoom, zoomTo, fitView } = useReactFlow();

  const zoomIn = () => {
    const next = Math.min(getZoom() * ZOOM_STEP, MAX_ZOOM);
    zoomTo(next, { duration: 300 });
  };

  const zoomOut = () => {
    const next = Math.max(getZoom() / ZOOM_STEP, MIN_ZOOM);
    zoomTo(next, { duration: 300 });
  };

  const is3D = viewMode === "3d";

  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      {onAddPerson ? (
        <AdminZoomButton
          label="Add person"
          icon={<Plus className="h-4 w-4" />}
          onClick={onAddPerson}
          disabled={addPersonDisabled}
        />
      ) : null}
      {onManageGallery ? (
        <AdminZoomButton
          label="Manage gallery"
          icon={<Image className="h-4 w-4" />}
          onClick={onManageGallery}
          disabled={addPersonDisabled}
        />
      ) : null}
      {onAdminLogout ? (
        <AdminZoomButton
          label="Sign out"
          icon={<LogOut className="h-4 w-4" />}
          onClick={onAdminLogout}
        />
      ) : null}
      {onSettingsClick && (
        <ZoomButton
          label="Settings"
          icon={<Settings className="h-4 w-4" />}
          onClick={onSettingsClick}
          className="hidden max-md:flex"
        />
      )}

      {onViewModeChange && (
        <ModeToggle
          mode={viewMode}
          onClick={() => onViewModeChange(is3D ? "2d" : "3d")}
        />
      )}

      {is3D ? (
        <>
          <ZoomButton
            label="Zoom in"
            icon={<ZoomIn className="h-4 w-4" />}
            onClick={() => onZoomIn3D?.()}
          />
          <ZoomButton
            label="Zoom out"
            icon={<ZoomOut className="h-4 w-4" />}
            onClick={() => onZoomOut3D?.()}
          />
          <ZoomButton
            label="Reset view"
            icon={<Maximize2 className="h-4 w-4" />}
            onClick={() => onResetView?.()}
          />
          {timeTravelOpen ? (
            <ZoomButton
              label="Close time travel"
              icon={<X className="h-4 w-4" />}
              onClick={onTimeTravelClose ?? (() => {})}
              className="hidden md:flex"
            />
          ) : onTimeTravelOpen ? (
            <ZoomButton
              label="Time travel"
              icon={<Calendar className="h-4 w-4" />}
              onClick={onTimeTravelOpen}
            />
          ) : null}
        </>
      ) : (
        <>
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
            onClick={() =>
              fitView({ duration: 500, padding: 0.15, minZoom: MIN_ZOOM })
            }
          />
          {timeTravelOpen ? (
            <ZoomButton
              label="Close time travel"
              icon={<X className="h-4 w-4" />}
              onClick={onTimeTravelClose ?? (() => {})}
              className="hidden md:flex"
            />
          ) : onTimeTravelOpen ? (
            <ZoomButton
              label="Time travel"
              icon={<Calendar className="h-4 w-4" />}
              onClick={onTimeTravelOpen}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * The 2D / 3D switcher. Shows the text label of the mode it will switch to.
 */
function ModeToggle({
  mode,
  onClick,
}: {
  mode: ViewMode;
  onClick: () => void;
}) {
  const is3D = mode === "3d";
  const target = is3D ? "2D" : "3D";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Switch to ${target} view`}
      title={`Switch to ${target} view`}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#e8dfd0] bg-white/80 text-[#3d3428] shadow-lg backdrop-blur-md transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
    >
      <span className="text-sm font-bold leading-none tracking-wide">
        {target}
      </span>
    </button>
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

function AdminZoomButton({
  label,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-[#6b7d5a] bg-[#eef4e8]/95 text-[#4a5c3d] shadow-lg backdrop-blur-md transition-colors hover:border-[#5a6d4d] hover:bg-[#e4eddb] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
    </button>
  );
}
