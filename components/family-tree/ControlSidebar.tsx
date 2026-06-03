"use client";

import { GitBranch, GitFork, Palette, UserX, X } from "lucide-react";
import type { FamilyBranch } from "./branchPalette";
import { PersonSelect } from "./PersonSelect";
import { SettingsButton } from "./SettingsButton";

export type ControlPanelProps = {
  greyDeceased: boolean;
  onGreyDeceasedChange: (enabled: boolean) => void;
  colorByFamily: boolean;
  onColorByFamilyChange: (enabled: boolean) => void;
  familyBranches: FamilyBranch[];
  visibleFamilyNames: Set<string>;
  onFamilyVisibilityChange: (familyName: string, visible: boolean) => void;
  onShowAllBranches: () => void;
  onHideAllBranches: () => void;
  pathFromId: string;
  pathToId: string;
  onPathFromChange: (id: string) => void;
  onPathToChange: (id: string) => void;
  pathStatus: "idle" | "ready" | "no-path";
};

export function ControlSidebarContent({
  greyDeceased,
  onGreyDeceasedChange,
  colorByFamily,
  onColorByFamilyChange,
  familyBranches,
  visibleFamilyNames,
  onFamilyVisibilityChange,
  onShowAllBranches,
  onHideAllBranches,
  pathFromId,
  pathToId,
  onPathFromChange,
  onPathToChange,
  pathStatus,
}: ControlPanelProps) {
  return (
    <>
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
        <div className="mt-2">
          <ToggleRow
            label="Color by family name"
            icon={<Palette className="h-4 w-4" />}
            checked={colorByFamily}
            onChange={onColorByFamilyChange}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
          <GitFork className="h-3.5 w-3.5" />
          Branches
        </p>
        <BranchSelector
          branches={familyBranches}
          visibleFamilyNames={visibleFamilyNames}
          onFamilyVisibilityChange={onFamilyVisibilityChange}
          onShowAllBranches={onShowAllBranches}
          onHideAllBranches={onHideAllBranches}
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
            excludeId={pathToId}
            visibleFamilyNames={visibleFamilyNames}
          />
          <PersonSelect
            label="To"
            value={pathToId}
            onChange={onPathToChange}
            excludeId={pathFromId}
            visibleFamilyNames={visibleFamilyNames}
          />
        </div>
        {pathStatus === "no-path" && (
          <p className="mt-2 text-xs text-[#a85c4a]">
            No connection found between these people.
          </p>
        )}
        {pathStatus === "ready" && (
          <p className="mt-2 text-xs text-[#8a9a82]">Path highlighted on the tree.</p>
        )}
      </div>
    </>
  );
}

type ControlSidebarProps = ControlPanelProps & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function ControlSidebar({ expanded, onExpandedChange, ...props }: ControlSidebarProps) {
  if (!expanded) {
    return <SettingsButton onClick={() => onExpandedChange(true)} />;
  }

  return (
    <aside className="pointer-events-auto flex w-64 shrink-0 flex-col gap-3 overflow-hidden rounded-2xl border border-[#e8dfd0] bg-white/75 px-4 pb-4 pt-2 shadow-lg backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-serif text-base font-medium text-[#3d3428]">Parameters</h2>
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          aria-label="Collapse settings"
          title="Collapse settings"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <ControlSidebarContent {...props} />
    </aside>
  );
}

function BranchSelector({
  branches,
  visibleFamilyNames,
  onFamilyVisibilityChange,
  onShowAllBranches,
  onHideAllBranches,
}: {
  branches: FamilyBranch[];
  visibleFamilyNames: Set<string>;
  onFamilyVisibilityChange: (familyName: string, visible: boolean) => void;
  onShowAllBranches: () => void;
  onHideAllBranches: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#e8dfd0] bg-[#fffef9]">
      <div className="flex items-center justify-between gap-2 border-b border-[#e8dfd0] px-3 py-2">
        <p className="text-xs text-[#8b7d6b]">
          {visibleFamilyNames.size} of {branches.length} visible
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onShowAllBranches}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          >
            All
          </button>
          <button
            type="button"
            onClick={onHideAllBranches}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          >
            None
          </button>
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto p-1.5">
        {branches.map((branch) => (
          <label
            key={branch.familyName}
            className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[#faf6ef]"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full border"
                style={{
                  borderColor: branch.color.border,
                  backgroundColor: branch.color.background,
                }}
                aria-hidden
              />
              <span className="truncate text-sm text-[#3d3428]">
                {branch.familyName}
              </span>
              <span className="text-[10px] text-[#a8957a]">{branch.count}</span>
            </span>
            <input
              type="checkbox"
              checked={visibleFamilyNames.has(branch.familyName)}
              onChange={(e) =>
                onFamilyVisibilityChange(branch.familyName, e.target.checked)
              }
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#d4c4a8] accent-[#b8956a]"
              aria-label={`Show ${branch.familyName} branch`}
            />
          </label>
        ))}
      </div>
    </div>
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
