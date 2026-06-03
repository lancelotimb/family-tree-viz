"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { familyHighlight } from "./familyHighlightColors";
import type { UnionNodeData } from "./types";

/**
 * The "marriage node": partners connect to its top and children branch from its
 * bottom, giving every child a single shared anchor instead of a faked midpoint.
 */
export function MarriageNode({ data }: NodeProps) {
  const union = data as UnionNodeData;
  const hoverRelated = union.hoverRelated;
  const pathHighlighted = union.pathHighlighted && !hoverRelated;
  const branchColor = union.branchColor;
  const colorByFamily = union.colorByFamily ?? true;

  const highlight = hoverRelated
    ? familyHighlight.hover.related
    : pathHighlighted
      ? familyHighlight.path.related
      : null;

  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <Handle
        id="union-top"
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <Handle
        id="union-bottom"
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <span
        style={{
          borderColor: highlight
            ? highlight.marriageBorder
            : colorByFamily
              ? branchColor.border
              : "#c4b49a",
          backgroundColor: highlight
            ? highlight.marriageFill
            : colorByFamily
              ? branchColor.background
              : "#efe6d4",
        }}
        className={`block rounded-full border transition-all duration-200 ${
          hoverRelated ? "family-hover-union" : pathHighlighted ? "family-path-union" : ""
        } ${union.singleParent ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}`}
        title={
          union.marriageYear
            ? `Married ${union.marriageYear}${union.divorced ? " (divorced)" : ""}`
            : undefined
        }
      />
    </div>
  );
}
