import type { FamilyMemberProfile } from "./types";

export type LayoutPosition = { row: number; col: number };

type Profiles = Record<string, FamilyMemberProfile>;

function coupleChildren(
  profiles: Profiles,
  parentA: string,
  parentB: string,
): string[] {
  const a = profiles[parentA];
  const b = profiles[parentB];
  return [...new Set([...a.childIds, ...b.childIds])].sort(
    (x, y) => profiles[x].birthYear - profiles[y].birthYear,
  );
}

function singleParentChildren(profiles: Profiles, parentId: string): string[] {
  const parent = profiles[parentId];
  if (parent.spouseId) return [];
  return [...parent.childIds].sort(
    (x, y) => profiles[x].birthYear - profiles[y].birthYear,
  );
}

/**
 * Classic family-tree layout: each generation on one row, siblings share a row
 * with consecutive columns, spouses sit beside their partner, and couples are
 * centered above their children.
 */
export function computeFamilyTreeLayout(
  profiles: Profiles,
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const placed = new Set<string>();

  const isPlaced = (id: string) => placed.has(id);

  const mark = (id: string, row: number, col: number) => {
    positions.set(id, { row, col });
    placed.add(id);
  };

  type Span = { startCol: number; endCol: number };

  const coupleColumnStart = (childSpan: Span) => {
    const spanWidth = childSpan.endCol - childSpan.startCol;
    return childSpan.startCol + Math.max(0, Math.floor((spanWidth - 2) / 2));
  };

  const placeCoupleAboveChildren = (
    parentA: string,
    parentB: string,
    row: number,
    childSpan: Span,
  ) => {
    const coupleStart = coupleColumnStart(childSpan);
    mark(parentA, row, coupleStart);
    mark(parentB, row, coupleStart + 1);
  };

  /** Lay out siblings (same parents) on one row; returns column span used. */
  function layoutSiblingGroup(
    childIds: string[],
    row: number,
    startCol: number,
  ): Span {
    let col = startCol;

    for (const childId of childIds) {
      if (isPlaced(childId)) continue;
      const span = layoutBranch(childId, row, col);
      col = span.endCol;
    }

    return { startCol, endCol: col };
  }

  /** Lay out one person (and spouse / descendants). */
  function layoutBranch(id: string, row: number, startCol: number): Span {
    const person = profiles[id];
    if (isPlaced(id)) {
      const existing = positions.get(id)!;
      return { startCol: existing.col, endCol: existing.col + 1 };
    }

    const spouseId = person.spouseId;
    if (spouseId && !isPlaced(spouseId)) {
      return layoutCouple(id, spouseId, row, startCol);
    }

    const children = singleParentChildren(profiles, id).filter((c) => !isPlaced(c));
    if (children.length > 0) {
      const childRow = row + 1;
      const childSpan = layoutSiblingGroup(children, childRow, startCol);
      const center =
        childSpan.startCol + Math.floor((childSpan.endCol - childSpan.startCol) / 2);
      mark(id, row, center);
      return { startCol, endCol: childSpan.endCol };
    }

    mark(id, row, startCol);
    return { startCol, endCol: startCol + 1 };
  }

  function layoutCouple(
    parentA: string,
    parentB: string,
    row: number,
    startCol: number,
  ): Span {
    const children = coupleChildren(profiles, parentA, parentB).filter(
      (c) => !isPlaced(c),
    );
    const childRow = row + 1;

    if (children.length === 0) {
      mark(parentA, row, startCol);
      mark(parentB, row, startCol + 1);
      return { startCol, endCol: startCol + 2 };
    }

    const childSpan = layoutSiblingGroup(children, childRow, startCol);
    placeCoupleAboveChildren(parentA, parentB, row, childSpan);

    return { startCol, endCol: childSpan.endCol };
  }

  const rootCouples: [string, string][] = [];
  const seenCouples = new Set<string>();

  for (const profile of Object.values(profiles)) {
    if (profile.generation !== 0 || !profile.spouseId) continue;
    const key = [profile.id, profile.spouseId].sort().join("|");
    if (seenCouples.has(key)) continue;
    seenCouples.add(key);
    rootCouples.push([profile.id, profile.spouseId]);
  }

  rootCouples.sort(([a], [b]) => a.localeCompare(b));

  let col = 0;
  const branchGap = 1;

  for (const [a, b] of rootCouples) {
    const span = layoutCouple(a, b, 0, col);
    col = span.endCol + branchGap;
  }

  // Place anyone not yet positioned (e.g. already placed via marriage)
  for (const profile of Object.values(profiles)) {
    if (!isPlaced(profile.id)) {
      layoutBranch(profile.id, profile.generation, col);
      col += 2;
    }
  }

  return positions;
}
