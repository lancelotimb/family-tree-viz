"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Users } from "lucide-react";
import type { NodeContextMenuTarget } from "./familyTreeActionsContext";

type NodeContextMenuProps = {
  target: NodeContextMenuTarget | null;
  onClose: () => void;
  onFocusLineage: (target: NodeContextMenuTarget) => void;
  focusPersonId: string;
  focusUnionId: string;
};

export function NodeContextMenu({
  target,
  onClose,
  onFocusLineage,
  focusPersonId,
  focusUnionId,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );

  useLayoutEffect(() => {
    if (!target || !menuRef.current) {
      setPosition(null);
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    let left = target.x;
    let top = target.y;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding;
    }
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    setPosition({ left, top });
  }, [target]);

  useEffect(() => {
    if (!target) return;

    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [target, onClose]);

  if (!target) return null;

  const isActive =
    target.kind === "person"
      ? focusPersonId === target.nodeId
      : focusUnionId === target.nodeId;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Node actions"
      className="fixed z-[60] min-w-[11rem] overflow-hidden rounded-xl border border-[#e8dfd0] bg-white/95 py-1 shadow-xl backdrop-blur-md"
      style={{
        left: position?.left ?? target.x,
        top: position?.top ?? target.y,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <p className="truncate px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-[#a8957a]">
        {target.label}
      </p>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onFocusLineage(target);
          onClose();
        }}
        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#faf6ef] ${
          isActive ? "text-[#4a5c3d]" : "text-[#3d3428]"
        }`}
      >
        <Users className="h-4 w-4 shrink-0 text-[#8b7d6b]" aria-hidden />
        {isActive ? "Lineage focused" : "Focus lineage"}
      </button>
    </div>
  );
}
