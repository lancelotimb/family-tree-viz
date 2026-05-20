"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User } from "lucide-react";
import type { FamilyMemberNodeData } from "./types";

function formatLifespan(birthYear: number, deathYear: number | null) {
  return deathYear ? `${birthYear} – ${deathYear}` : `${birthYear} –`;
}

export function FamilyMemberNode({ data, selected }: NodeProps) {
  const member = data as FamilyMemberNodeData;
  const isGreyed = member.greyed;
  const isPathHighlighted = member.pathHighlighted;

  return (
    <div
      className={`w-[200px] rounded-xl border bg-[#fffef9] px-4 py-3 shadow-sm transition-all duration-300 ${
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
        className="!h-2 !w-2 !opacity-0"
      />
      <Handle
        id="spouse-left"
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="spouse-right"
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-0 !bg-transparent !opacity-0"
      />
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border bg-gradient-to-b from-[#faf6ef] to-[#f0e8da] ${
          isPathHighlighted ? "border-[#7a9e6a]" : "border-[#e8dfd0]"
        }`}
      >
        <User
          className={`h-6 w-6 ${isPathHighlighted ? "text-[#5a7d4a]" : "text-[#a8957a]"}`}
          strokeWidth={1.5}
        />
      </div>
      <p
        className={`mt-2 text-center font-serif text-base font-medium leading-tight ${
          isPathHighlighted ? "text-[#3d5230]" : "text-[#3d3428]"
        }`}
      >
        {member.name}
      </p>
      <p className="mt-1 text-center text-xs tracking-wide text-[#8b7d6b]">
        {formatLifespan(member.birthYear, member.deathYear)}
      </p>
    </div>
  );
}
