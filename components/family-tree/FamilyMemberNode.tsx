"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { pathHighlight } from "./pathHighlightColors";
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
  const isPathHighlighted = member.pathHighlighted;
  const isPathFocus = isPathHighlighted && (member.hovered || selected);
  const isHovered = member.hovered;
  const isHoverRelated = member.hoverRelated;
  const branchColor = member.branchColor;
  const colorByFamily = member.colorByFamily ?? true;

  const pathColors = isPathFocus ? pathHighlight.focus : pathHighlight.muted;

  const cardBorderColor = isPathHighlighted
    ? pathColors.border
    : isHovered
      ? "#2563eb"
      : isHoverRelated
        ? "#3b82f6"
        : colorByFamily
          ? branchColor.border
          : selected
            ? "#b8956a"
            : "#e8dfd0";
  const avatarBorderColor = isPathHighlighted
    ? pathColors.border
    : isHovered
      ? "#2563eb"
      : isHoverRelated
        ? "#60a5fa"
        : colorByFamily
          ? branchColor.border
          : "#e8dfd0";
  const avatarColor = isPathHighlighted
    ? pathColors.stroke
    : isHovered
      ? "#1d4ed8"
      : isHoverRelated
        ? "#2563eb"
        : colorByFamily
          ? branchColor.stroke
          : "#a8957a";
  const cardBackground = isPathHighlighted
    ? colorByFamily
      ? `color-mix(in srgb, ${branchColor.background} ${isPathFocus ? 38 : 32}%, #fffef9)`
      : "#fffef9"
    : isHovered
      ? "#eff6ff"
      : isHoverRelated
        ? "#f0f7ff"
        : colorByFamily
          ? `color-mix(in srgb, ${branchColor.background} 45%, #fffef9)`
          : "#fffef9";

  return (
    // Pin the card to the exact size the layout reserves (NODE_WIDTH ×
    // NODE_HEIGHT) so every node is identical and never overflows the gap the
    // layout left for it. The fixed height is what keeps long and short names
    // from producing different-sized cards.
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderColor: cardBorderColor,
        backgroundColor: cardBackground,
      }}
      title={`${member.name} (${member.familyName})`}
      className={`flex flex-col items-center rounded-xl border-2 px-4 py-3 shadow-sm transition-all duration-200 ${
        isPathFocus
          ? "z-[1] scale-[1.02] border-[2.5px] shadow-md ring-2 ring-[#d4c4a8]/45"
          : isPathHighlighted
            ? "shadow-sm ring-1 ring-[#c8dcc2]/30"
            : isHovered
              ? "family-hover-node z-10 scale-[1.05] border-[3px] shadow-xl ring-4 ring-[#60a5fa]/80"
              : isHoverRelated
                ? "z-[1] scale-[1.02] border-[2.5px] shadow-lg ring-2 ring-[#93c5fd]/75"
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
      {/* Fixed two-line box for the name: `line-clamp-2` truncates longer names
          with an ellipsis (full name shown via the `title` tooltip), keeping the
          card height constant no matter how long the name is. */}
      <div className="mt-2 flex h-10 w-full items-center justify-center">
        <p
          title={member.name}
          className={`line-clamp-2 w-full break-words text-center font-serif text-base font-medium leading-tight ${
            isPathHighlighted
              ? isPathFocus
                ? "text-[#5e5038]"
                : "text-[#6a7d66]"
              : isHovered
                ? "text-[#1e3a8a]"
                : isHoverRelated
                  ? "text-[#1e40af]"
                  : "text-[#3d3428]"
          }`}
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
