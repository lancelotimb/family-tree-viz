"use client";

import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useFamilyTreeActions } from "./familyTreeActionsContext";
import { familyHighlight } from "./familyHighlightColors";
import { ProfileAvatar } from "./ProfileAvatar";
import { getLayoutMetrics } from "./layoutConstants";
import { treeCardName } from "./gedcom";
import type { PersonNodeData } from "./types";
import { useLongPress } from "./useLongPress";

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `${birth} –`;
}

function nodeHighlightClasses(
  isHovered: boolean | undefined,
  isHoverRelated: boolean | undefined,
  isPathHighlighted: boolean | undefined,
  isFocusHighlighted: boolean | undefined,
  selected: boolean | undefined,
) {
  if (isHovered) {
    return "family-hover-node z-10 scale-[1.05] border-[2.5px] ring-2 ring-[#5a94d0]/70";
  }
  if (isHoverRelated) {
    return "z-[1] scale-[1.02] border-[2.5px] ring-2 ring-[#7ab8e8]/60";
  }
  if (isPathHighlighted) {
    return "z-[1] scale-[1.02] border-[2.5px] ring-2 ring-[#6ad088]/60";
  }
  if (isFocusHighlighted) {
    return "family-focus-node z-[2] scale-[1.04] border-[2.5px] ring-2 ring-[#d87878]/65";
  }
  if (selected) {
    return "shadow-md ring-2 ring-[#d4b896]/50";
  }
  return "hover:shadow-md";
}

export function FamilyMemberNode({ id, data, selected }: NodeProps) {
  const member = data as PersonNodeData;
  const { openNodeContextMenu, suppressNextNodeClick } = useFamilyTreeActions();
  const showNamesOnly = member.showNamesOnly ?? false;
  const metrics = getLayoutMetrics(showNamesOnly);

  const showContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      openNodeContextMenu({
        nodeId: id,
        kind: "person",
        label: member.name,
        x: clientX,
        y: clientY,
      });
    },
    [id, member.name, openNodeContextMenu],
  );

  const { longPressHandlers } = useLongPress({
    onLongPress: (event) => {
      event.preventDefault();
      suppressNextNodeClick();
      showContextMenu(event.clientX, event.clientY);
    },
  });
  const isGreyed = member.greyed;
  const isHovered = member.hovered;
  const isHoverRelated = member.hoverRelated;
  const isPathHighlighted = member.pathHighlighted && !isHovered && !isHoverRelated;
  const isFocusHighlighted =
    member.focusHighlighted && !isHovered && !isHoverRelated && !isPathHighlighted;
  const shouldGreyOut =
    isGreyed && !isHovered && !isHoverRelated && !isFocusHighlighted;
  const branchColor = member.branchColor;
  const colorByFamily = member.colorByFamily ?? true;

  const highlight = isHovered
    ? familyHighlight.hover.primary
    : isHoverRelated
      ? familyHighlight.hover.related
      : isPathHighlighted
        ? familyHighlight.path.related
        : isFocusHighlighted
          ? familyHighlight.focus.primary
          : null;

  const cardBorderColor = highlight
    ? highlight.border
    : colorByFamily
      ? branchColor.border
      : selected
        ? "#b8956a"
        : "#e8dfd0";
  const avatarBorderColor = cardBorderColor;
  const avatarColor = highlight
    ? highlight.stroke
    : colorByFamily
      ? branchColor.stroke
      : "#a8957a";
  const cardBackground = highlight
    ? colorByFamily
      ? `color-mix(in srgb, ${branchColor.background} 32%, ${highlight.background})`
      : highlight.background
    : colorByFamily
      ? `color-mix(in srgb, ${branchColor.background} 45%, #fffef9)`
      : "#fffef9";

  const lifespan = formatLifespan(member.birthYear, member.deathYear);
  const cardLabel = treeCardName(member.firstName, member.familyName);
  const tooltip = showNamesOnly
    ? `${member.name} (${member.familyName}) · ${lifespan}`
    : `${member.name} (${member.familyName})`;

  if (showNamesOnly) {
    return (
      <div
        {...longPressHandlers}
        style={{
          width: metrics.nodeWidth,
          height: metrics.nodeHeight,
          borderColor: cardBorderColor,
          backgroundColor: cardBackground,
          touchAction: "manipulation",
        }}
        title={tooltip}
        className={`flex items-center justify-center rounded-lg border px-2 shadow-sm transition-all duration-200 ${nodeHighlightClasses(
          isHovered,
          isHoverRelated,
          isPathHighlighted,
          isFocusHighlighted,
          selected,
        )} ${shouldGreyOut ? "opacity-45 grayscale" : ""}`}
      >
        <Handle
          id="child"
          type="target"
          position={Position.Top}
          className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        />
        <Handle
          id="parent-out"
          type="source"
          position={Position.Bottom}
          className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
        />
        <p
          title={member.name}
          className="w-full truncate text-center font-serif text-sm font-medium leading-none"
          style={{ color: highlight?.text ?? "#3d3428" }}
        >
          {cardLabel}
        </p>
      </div>
    );
  }

  return (
    <div
      {...longPressHandlers}
      style={{
        width: metrics.nodeWidth,
        height: metrics.nodeHeight,
        borderColor: cardBorderColor,
        backgroundColor: cardBackground,
        touchAction: "manipulation",
      }}
      title={tooltip}
      className={`flex flex-col items-center rounded-xl border-2 px-4 py-3 shadow-sm transition-all duration-200 ${nodeHighlightClasses(
        isHovered,
        isHoverRelated,
        isPathHighlighted,
        isFocusHighlighted,
        selected,
      )} ${shouldGreyOut ? "opacity-45 grayscale" : ""}`}
    >
      <Handle
        id="child"
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="parent-out"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <div
        style={{
          borderColor: avatarBorderColor,
          background: colorByFamily
            ? `linear-gradient(180deg, ${branchColor.background}, #f0e8da)`
            : "linear-gradient(180deg, #faf6ef, #f0e8da)",
        }}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
      >
        <ProfileAvatar
          gender={member.gender}
          className="h-8 w-8"
          style={{ color: avatarColor }}
          strokeWidth={1.5}
        />
      </div>
      <div className="mt-2 flex h-10 w-full items-center justify-center">
        <p
          title={member.name}
          className="line-clamp-2 w-full break-words text-center font-serif text-base font-medium leading-tight"
          style={{ color: highlight?.text ?? "#3d3428" }}
        >
          {cardLabel}
        </p>
      </div>
      <p className="mt-1 shrink-0 text-center text-xs tracking-wide text-[#8b7d6b]">
        {lifespan}
      </p>
    </div>
  );
}
