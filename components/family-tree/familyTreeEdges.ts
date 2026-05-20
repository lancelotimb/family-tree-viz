import type { Edge } from "@xyflow/react";
import type { LayoutPosition } from "./familyTreeLayout";
import type { FamilyEdgeData, FamilyMemberProfile } from "./types";

const edgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

function coupleChildren(
  profiles: Record<string, FamilyMemberProfile>,
  parentA: string,
  parentB: string,
): string[] {
  const a = profiles[parentA];
  const b = profiles[parentB];
  return [...new Set([...a.childIds, ...b.childIds])].sort(
    (x, y) => profiles[x].birthYear - profiles[y].birthYear,
  );
}

export function buildFamilyEdges(
  profiles: Record<string, FamilyMemberProfile>,
  layout: Map<string, LayoutPosition>,
): Edge[] {
  const edges: Edge[] = [];
  const spousePairs = new Set<string>();
  const coupleChildLinks = new Set<string>();

  for (const profile of Object.values(profiles)) {
    if (!profile.spouseId) continue;

    const pairKey = [profile.id, profile.spouseId].sort().join("|");
    if (spousePairs.has(pairKey)) continue;
    spousePairs.add(pairKey);

    const posA = layout.get(profile.id)!;
    const posB = layout.get(profile.spouseId)!;
    const [leftId, rightId] =
      posA.col <= posB.col
        ? [profile.id, profile.spouseId]
        : [profile.spouseId, profile.id];

    edges.push({
      id: `spouse-${pairKey}`,
      source: leftId,
      target: rightId,
      type: "straight",
      sourceHandle: "spouse-right",
      targetHandle: "spouse-left",
      style: edgeStyle,
    });

    if (coupleChildLinks.has(pairKey)) continue;
    coupleChildLinks.add(pairKey);

    const children = coupleChildren(profiles, profile.id, profile.spouseId);
    const parentA = leftId;
    const parentB = rightId;

    for (const childId of children) {
      const data: FamilyEdgeData = { parentA, parentB };
      edges.push({
        id: `branch-${pairKey}-${childId}`,
        source: parentA,
        target: childId,
        type: "familyBranch",
        targetHandle: "child",
        data,
        style: edgeStyle,
      });
    }
  }

  for (const profile of Object.values(profiles)) {
    if (profile.spouseId) continue;

    for (const childId of profile.childIds) {
      const data: FamilyEdgeData = { parentA: profile.id, parentB: null };
      edges.push({
        id: `branch-${profile.id}-${childId}`,
        source: profile.id,
        target: childId,
        type: "familyBranch",
        targetHandle: "child",
        data,
        style: edgeStyle,
      });
    }
  }

  return edges;
}
