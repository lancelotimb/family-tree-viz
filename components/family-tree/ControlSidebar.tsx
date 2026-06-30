"use client";

import {
  AlignCenterHorizontal,
  Eye,
  GitBranch,
  GitFork,
  Palette,
  Type,
  UserX,
  Users,
  X,
} from "lucide-react";
import type { FamilyBranch } from "./branchPalette";
import { PersonSearchInput } from "./PersonSearchInput";
import { SettingsButton } from "./SettingsButton";
import { UnionSearchInput } from "./UnionSearchInput";

export type ControlPanelProps = {
  greyDeceased: boolean;
  onGreyDeceasedChange: (enabled: boolean) => void;
  colorByFamily: boolean;
  onColorByFamilyChange: (enabled: boolean) => void;
  centerParents: boolean;
  onCenterParentsChange: (enabled: boolean) => void;
  /** When true the option is muted (e.g. it does not apply to the 3D view). */
  centerParentsDisabled?: boolean;
  showNamesOnly: boolean;
  onShowNamesOnlyChange: (enabled: boolean) => void;
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
  focusPersonId: string;
  onFocusPersonChange: (id: string) => void;
  focusUnionId: string;
  onFocusUnionChange: (id: string) => void;
  lineagePersonIds: Set<string> | null;
  aliveAtYear?: number | null;
};

export function ControlSidebarContent({
  greyDeceased,
  onGreyDeceasedChange,
  colorByFamily,
  onColorByFamilyChange,
  centerParents,
  onCenterParentsChange,
  centerParentsDisabled = false,
  showNamesOnly,
  onShowNamesOnlyChange,
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
  focusPersonId,
  onFocusPersonChange,
  focusUnionId,
  onFocusUnionChange,
  lineagePersonIds,
  aliveAtYear = null,
}: ControlPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
          <Eye className="h-3.5 w-3.5" />
          Affichage
        </p>
        <ToggleRow
          label="Griser les personnes décédées"
          icon={<UserX className="h-4 w-4" />}
          checked={greyDeceased}
          onChange={onGreyDeceasedChange}
        />
        <div className="mt-2">
          <ToggleRow
            label="Colorer par nom de famille"
            icon={<Palette className="h-4 w-4" />}
            checked={colorByFamily}
            onChange={onColorByFamilyChange}
          />
        </div>
        <div className="mt-2">
          <ToggleRow
            label="Centrer les parents au-dessus des enfants"
            icon={<AlignCenterHorizontal className="h-4 w-4" />}
            checked={centerParents && !centerParentsDisabled}
            onChange={onCenterParentsChange}
            disabled={centerParentsDisabled}
            hint={centerParentsDisabled ? "Non utilisé dans la vue 3D" : undefined}
          />
        </div>
        <div className="mt-2">
          <ToggleRow
            label="Afficher seulement les noms"
            icon={<Type className="h-4 w-4" />}
            checked={showNamesOnly}
            onChange={onShowNamesOnlyChange}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
            <Users className="h-3.5 w-3.5" />
            Cibler une lignée
          </p>
          {focusPersonId || focusUnionId ? (
            <button
              type="button"
              onClick={() => {
                onFocusPersonChange("");
                onFocusUnionChange("");
              }}
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <PersonSearchInput
            label="Personne"
            value={focusPersonId}
            onChange={onFocusPersonChange}
            aliveAtYear={aliveAtYear}
            placeholder="Rechercher une personne..."
          />
          <UnionSearchInput
            label="Union"
            value={focusUnionId}
            onChange={onFocusUnionChange}
            visibleFamilyNames={visibleFamilyNames}
            placeholder="Rechercher une union..."
          />
        </div>
        {focusPersonId ? (
          <p className="mt-2 text-xs text-[#6b7d5a]">
            Affichage de cette personne, de ses ascendants, de ses descendants et
            du conjoint de chaque descendant lorsqu&apos;ils ont des enfants ensemble.
          </p>
        ) : focusUnionId ? (
          <p className="mt-2 text-xs text-[#6b7d5a]">
            Affichage des deux partenaires, de leurs ascendants, de leurs descendants
            et du conjoint de chaque descendant lorsqu&apos;ils ont des enfants ensemble.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#8b7d6b]">
            Laissez vide pour afficher l&apos;arbre complet.
          </p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#8b7d6b]">
            <GitBranch className="h-3.5 w-3.5" />
            Surligner un lien
          </p>
          {pathFromId || pathToId ? (
            <button
              type="button"
              onClick={() => {
                onPathFromChange("");
                onPathToChange("");
              }}
              className="shrink-0 rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
            >
              Réinitialiser
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <PersonSearchInput
            label="De"
            value={pathFromId}
            onChange={onPathFromChange}
            excludeId={pathToId}
            visibleFamilyNames={visibleFamilyNames}
            lineagePersonIds={lineagePersonIds}
            aliveAtYear={aliveAtYear}
          />
          <PersonSearchInput
            label="À"
            value={pathToId}
            onChange={onPathToChange}
            excludeId={pathFromId}
            visibleFamilyNames={visibleFamilyNames}
            lineagePersonIds={lineagePersonIds}
            aliveAtYear={aliveAtYear}
          />
        </div>
        {pathStatus === "no-path" && (
          <p className="mt-2 text-xs text-[#a85c4a]">
            Aucun lien trouvé entre ces personnes.
          </p>
        )}
        {pathStatus === "ready" && (
          <p className="mt-2 text-xs text-[#6b7d5a]">Chemin surligné dans l&apos;arbre.</p>
        )}
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
    </div>
  );
}

type ControlSidebarProps = ControlPanelProps & {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function ControlSidebar({ expanded, onExpandedChange, ...props }: ControlSidebarProps) {
  if (!expanded) {
    return (
      <SettingsButton
        label="Paramètres"
        iconPosition="right"
        variant="panel-header"
        onClick={() => onExpandedChange(true)}
      />
    );
  }

  return (
    <aside className="pointer-events-auto flex max-h-[calc(100dvh-5.5rem)] w-[300px] shrink-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-[#e8dfd0] bg-white/75 px-4 pb-4 pt-2 shadow-lg backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-serif text-base font-medium text-[#3d3428]">Paramètres</h2>
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className="shrink-0 cursor-pointer rounded-full p-1.5 text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          aria-label="Réduire les paramètres"
          title="Réduire les paramètres"
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
          {visibleFamilyNames.size} sur {branches.length} visibles
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={onShowAllBranches}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          >
            Tout
          </button>
          <button
            type="button"
            onClick={onHideAllBranches}
            className="rounded-md px-2 py-1 text-[10px] font-medium text-[#8b7d6b] transition-colors hover:bg-[#f5efe4] hover:text-[#3d3428]"
          >
            Aucun
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
              aria-label={`Afficher la branche ${branch.familyName}`}
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
  disabled = false,
  hint,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label
      title={hint}
      className={`flex items-center justify-between gap-2 rounded-lg border border-[#e8dfd0] bg-[#fffef9] px-3 py-2 transition-colors ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:border-[#d4c4a8] hover:bg-[#faf6ef]"
      }`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-sm text-[#3d3428]">
          {icon}
          {label}
        </span>
        {disabled && hint ? (
          <span className="mt-0.5 pl-6 text-[10px] text-[#a8957a]">{hint}</span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded border-[#d4c4a8] accent-[#b8956a] ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
        aria-label={label}
      />
    </label>
  );
}
