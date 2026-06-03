"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { familyHighlight } from "./familyHighlightColors";
import { ProfileAvatar } from "./ProfileAvatar";
import { NODE_HEIGHT, NODE_WIDTH } from "./layoutConstants";
import type { PersonNodeData } from "./types";

function formatLifespan(birthYear: number | null, deathYear: number | null) {
  const birth = birthYear ?? "?";
  return deathYear ? `${birth} – ${deathYear}` : `${birth} –`;
}

export function FamilyMemberNode({ data, selected }: NodeProps) {
  const member = data as PersonNodeData;
  const isGreyed = member.greyed;
  const isHovered = member.hovered;
  const isHoverRelated = member.hoverRelated;
  const isPathHighlighted = member.pathHighlighted && !isHovered && !isHoverRelated;
  const isFocusHighlighted =
    member.focusHighlighted && !isHovered && !isHoverRelated && !isPathHighlighted;
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

  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderColor: cardBorderColor,
        backgroundColor: cardBackground,
      }}
      title={`${member.name} (${member.familyName})`}
      className={`flex flex-col items-center rounded-xl border-2 px-4 py-3 shadow-sm transition-all duration-200 ${
        isHovered
          ? "family-hover-node z-10 scale-[1.05] border-[2.5px] ring-2 ring-[#5a94d0]/70"
          : isHoverRelated
            ? "z-[1] scale-[1.02] border-[2.5px] ring-2 ring-[#7ab8e8]/60"
            : isPathHighlighted
              ? "z-[1] scale-[1.02] border-[2.5px] ring-2 ring-[#6ad088]/60"
              : isFocusHighlighted
                ? "family-focus-node z-[2] scale-[1.04] border-[2.5px] ring-2 ring-[#9333ea]/75"
                : selected
                  ? "shadow-md ring-2 ring-[#d4b896]/50"
                  : "hover:shadow-md"
      } ${isGreyed ? "opacity-45 grayscale" : ""}`}
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
          {member.name}
        </p>
      </div>
      <p className="mt-1 shrink-0 text-center text-xs tracking-wide text-[#8b7d6b]">
        {formatLifespan(member.birthYear, member.deathYear)}
      </p>
    </div>
  );
}
