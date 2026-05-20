"use client";

import { GitBranch, UserX } from "lucide-react";
import { maxGeneration } from "./mockFamilyData";
import { PersonSelect } from "./PersonSelect";

type ControlSidebarProps = {
  maxDepth: number;
  onMaxDepthChange: (depth: number) => void;
  greyDeceased: boolean;
  onGreyDeceasedChange: (enabled: boolean) => void;
  pathFromId: string;
  pathToId: string;
  onPathFromChange: (id: string) => void;
  onPathToChange: (id: string) => void;
  pathStatus: "idle" | "ready" | "no-path";
};

export function ControlSidebar({
  maxDepth,
  onMaxDepthChange,
  greyDeceased,
  onGreyDeceasedChange,
  pathFromId,
  pathToId,
  onPathFromChange,
  onPathToChange,
  pathStatus,
}: ControlSidebarProps) {
  return (
    <aside className="pointer-events-auto flex w-56 flex-col gap-5 rounded-2xl border border-[#e8dfd0] bg-white/75 p-4 shadow-lg backdrop-blur-md">
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

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
          Display
        </p>
        <ToggleRow
          label="Grey out deceased"
          icon={<UserX className="h-4 w-4" />}
          checked={greyDeceased}
          onChange={onGreyDeceasedChange}
        />
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
          <GitBranch className="h-3.5 w-3.5" />
          Highlight link
        </p>
        <div className="flex flex-col gap-2">
          <PersonSelect
            label="From"
            value={pathFromId}
            onChange={onPathFromChange}
            maxDepth={maxDepth}
            excludeId={pathToId}
          />
          <PersonSelect
            label="To"
            value={pathToId}
            onChange={onPathToChange}
            maxDepth={maxDepth}
            excludeId={pathFromId}
          />
        </div>
        {pathStatus === "no-path" && (
          <p className="mt-2 text-xs text-[#a85c4a]">No connection found between these people.</p>
        )}
        {pathStatus === "ready" && (
          <p className="mt-2 text-xs text-[#6b7d5a]">Path highlighted on the tree.</p>
        )}
      </div>
    </aside>
  );
}

function ToggleRow({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#e8dfd0] bg-[#fffef9] px-3 py-2 transition-colors hover:border-[#d4c4a8] hover:bg-[#faf6ef]">
      <span className="flex items-center gap-2 text-sm text-[#3d3428]">
        {icon}
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer rounded border-[#d4c4a8] accent-[#b8956a]"
        aria-label={label}
      />
    </label>
  );
}
