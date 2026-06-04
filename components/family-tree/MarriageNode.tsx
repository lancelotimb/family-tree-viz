"use client";

import { useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useFamilyTreeActions } from "./familyTreeActionsContext";
import { familyHighlight } from "./familyHighlightColors";
import { unionSearchIndex } from "./familyGraph";
import type { UnionNodeData } from "./types";
import { useLongPress } from "./useLongPress";

/**
 * The "marriage node": partners connect to its top and children branch from its
 * bottom, giving every child a single shared anchor instead of a faked midpoint.
 */
export function MarriageNode({ id, data }: NodeProps) {
  const union = data as UnionNodeData;
  const { openNodeContextMenu, suppressNextNodeClick } = useFamilyTreeActions();

  const unionLabel =
    unionSearchIndex.find((entry) => entry.id === id)?.label ?? "Union";

  const showContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      openNodeContextMenu({
        nodeId: id,
        kind: "union",
        label: unionLabel,
        x: clientX,
        y: clientY,
      });
    },
    [id, unionLabel, openNodeContextMenu],
  );

  const { longPressHandlers } = useLongPress({
    onLongPress: (event) => {
      event.preventDefault();
      suppressNextNodeClick();
      showContextMenu(event.clientX, event.clientY);
    },
  });
  const hoverRelated = union.hoverRelated;
  const pathHighlighted = union.pathHighlighted && !hoverRelated;
  const focusHighlighted = union.focusHighlighted && !hoverRelated && !pathHighlighted;
  const branchColor = union.branchColor;
  const colorByFamily = union.colorByFamily ?? true;

  const highlight = hoverRelated
    ? familyHighlight.hover.related
    : pathHighlighted
      ? familyHighlight.path.related
      : focusHighlighted
        ? familyHighlight.focus.primary
        : null;

  return (
    <div
      {...longPressHandlers}
      className="relative flex h-7 w-7 items-center justify-center"
      style={{ touchAction: "manipulation" }}
    >
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
          hoverRelated
            ? "family-hover-union"
            : pathHighlighted
              ? "family-path-union"
              : focusHighlighted
                ? "family-focus-union"
                : ""
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
