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

  return (
    <div
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={`flex flex-col items-center rounded-xl border bg-[#fffef9] px-4 py-3 shadow-sm transition-all duration-300 ${
        isPathHighlighted
          ? "border-[#7a9e6a] shadow-md ring-2 ring-[#9bc48a]/50"
          : selected
            ? "border-[#b8956a] shadow-md ring-2 ring-[#d4b896]/40"
            : "border-[#e8dfd0] hover:border-[#d4c4a8] hover:shadow-md"
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
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border bg-gradient-to-b from-[#faf6ef] to-[#f0e8da] ${
          isPathHighlighted ? "border-[#7a9e6a]" : "border-[#e8dfd0]"
        }`}
      >
        <ProfileAvatar
          gender={member.gender}
          className={`h-6 w-6 ${isPathHighlighted ? "text-[#5a7d4a]" : "text-[#a8957a]"}`}
          strokeWidth={1.5}
        />
      </div>
      <div className="mt-2 flex h-10 w-full items-center justify-center">
        <p
          title={member.name}
          className={`line-clamp-2 w-full break-words text-center font-serif text-base font-medium leading-tight ${
            isPathHighlighted ? "text-[#3d5230]" : "text-[#3d3428]"
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
