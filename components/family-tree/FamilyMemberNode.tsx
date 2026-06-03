"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
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
  const isHovered = member.hovered;
  const isHoverRelated = member.hoverRelated;
  const branchColor = member.branchColor;
  const colorByFamily = member.colorByFamily ?? true;
  const cardBorderColor = isPathHighlighted
    ? "#7a9e6a"
    : isHovered
      ? "#b8956a"
      : isHoverRelated
        ? "#d4b896"
        : colorByFamily
          ? branchColor.border
          : selected
            ? "#b8956a"
            : "#e8dfd0";
  const avatarBorderColor = isPathHighlighted
    ? "#7a9e6a"
    : isHovered || isHoverRelated
      ? "#b8956a"
      : colorByFamily
        ? branchColor.border
        : "#e8dfd0";
  const avatarColor = isPathHighlighted
    ? "#5a7d4a"
    : isHovered || isHoverRelated
      ? "#8b6b45"
      : colorByFamily
        ? branchColor.stroke
        : "#a8957a";

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
        backgroundColor: colorByFamily
          ? `color-mix(in srgb, ${branchColor.background} 45%, #fffef9)`
          : "#fffef9",
      }}
      title={`${member.name} (${member.familyName})`}
      className={`flex flex-col items-center rounded-xl border-2 px-4 py-3 shadow-sm transition-all duration-300 ${
        isPathHighlighted
          ? "shadow-md ring-2 ring-[#9bc48a]/60"
          : isHovered
            ? "z-10 scale-[1.03] shadow-lg ring-2 ring-[#d4b896]/70"
            : isHoverRelated
              ? "shadow-md ring-2 ring-[#d4b896]/35"
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
          className="h-6 w-6"
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
              ? "text-[#3d5230]"
              : isHovered || isHoverRelated
                ? "text-[#4a3d2a]"
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
