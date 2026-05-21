"use client";

import { BaseEdge, useInternalNode, type EdgeProps } from "@xyflow/react";
import { NODE_HEIGHT, NODE_WIDTH } from "./layoutConstants";
import type { FamilyEdgeData } from "./types";

function bottomCenter(node: NonNullable<ReturnType<typeof useInternalNode>>) {
  return {
    x: node.internals.positionAbsolute.x + NODE_WIDTH / 2,
    y: node.internals.positionAbsolute.y + NODE_HEIGHT,
  };
}

function topCenter(node: NonNullable<ReturnType<typeof useInternalNode>>) {
  return {
    x: node.internals.positionAbsolute.x + NODE_WIDTH / 2,
    y: node.internals.positionAbsolute.y,
  };
}

export function FamilyBranchEdge({
  id,
  target,
  data,
  style,
  markerEnd,
  interactionWidth,
}: EdgeProps) {
  const edgeData = data as FamilyEdgeData | undefined;
  const parentA = useInternalNode(edgeData?.parentA ?? "");
  const parentB = edgeData?.parentB ? useInternalNode(edgeData.parentB) : undefined;
  const child = useInternalNode(target);

  if (!parentA || !child) return null;

  const origin = parentB
    ? (() => {
        const a = bottomCenter(parentA);
        const b = bottomCenter(parentB);
        return { x: (a.x + b.x) / 2, y: Math.max(a.y, b.y) };
      })()
    : bottomCenter(parentA);

  const childTop = topCenter(child);
  const busY = origin.y + (childTop.y - origin.y) / 2;
  const path = `M ${origin.x} ${origin.y} V ${busY} H ${childTop.x} V ${childTop.y}`;

  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
      interactionWidth={interactionWidth ?? 20}
    />
  );
}
