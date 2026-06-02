import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import {
  buildElkGraph,
  coupleNodeId,
  individuals,
  unions,
} from "./familyGraph";
import {
  COUPLE_INNER_GAP,
  COUPLE_UNION_DROP,
  COUPLE_WIDTH,
  LAYER_GAP,
  NODE_HEIGHT,
  NODE_WIDTH,
  UNION_SIZE,
} from "./layoutConstants";

export type LayoutPosition = { id: string; x: number; y: number };

const elk = new ELK();

/** Horizontal gap between two adjacent blocks (a person card or a couple). */
const SIBLING_GAP = 50;
/** Vertical distance between successive generations. */
const GEN_V_SPACING = NODE_HEIGHT + LAYER_GAP;

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Run ELK's layered algorithm purely to obtain a good left-to-right ORDER
 * (crossing-minimized) and to decide each couple's husband/wife orientation.
 * The actual x-coordinates are then recomputed with a tidy-tree pass so that
 * every couple is horizontally centered over the span of its children — the
 * classic "parent centered over its subtree" look.
 */
async function elkOrder(): Promise<{
  centerX: Map<string, number>;
  couples: ReturnType<typeof buildElkGraph>["couples"];
}> {
  const { nodes, edges, couples } = buildElkGraph();

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.partitioning.activate": "true",
      "elk.layered.spacing.nodeNodeBetweenLayers": String(LAYER_GAP),
      "elk.spacing.nodeNode": "55",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.cycleBreaking.strategy": "GREEDY",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.edgeRouting": "ORTHOGONAL",
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: node.width,
      height: node.height,
      layoutOptions: {
        "elk.partitioning.partition": String(node.partition),
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const result = await elk.layout(elkGraph);

  const centerX = new Map<string, number>();
  for (const child of result.children ?? []) {
    const width = child.width ?? NODE_WIDTH;
    centerX.set(child.id, (child.x ?? 0) + width / 2);
  }
  return { centerX, couples };
}

export async function computeLayout(): Promise<Map<string, LayoutPosition>> {
  const { centerX, couples } = await elkOrder();

  const coupleByUnion = new Map(couples.map((c) => [c.unionId, c]));
  const personToUnion = new Map<string, string>();
  for (const c of couples) {
    personToUnion.set(c.leftId, c.unionId);
    personToUnion.set(c.rightId, c.unionId);
  }

  // Parent union of each individual, taken from the family CHIL lists. The
  // GEDCOM `FAMC` pointer is sometimes omitted, so we trust the child lists.
  const parentUnionOfPerson = new Map<string, string>();
  for (const union of Object.values(unions)) {
    for (const childId of union.childIds) {
      if (!parentUnionOfPerson.has(childId)) {
        parentUnionOfPerson.set(childId, union.id);
      }
    }
  }

  // ---- Block model: a block is a couple (two cards) or a lone person. ----
  const blockOfPerson = (id: string) =>
    personToUnion.has(id) ? coupleNodeId(personToUnion.get(id)!) : id;
  const isCoupleBlock = (blockId: string) => blockId.startsWith("couple:");
  const unionOfCoupleBlock = (blockId: string) =>
    blockId.slice("couple:".length);

  const blockMembers = (blockId: string): string[] =>
    isCoupleBlock(blockId)
      ? unions[unionOfCoupleBlock(blockId)].partnerIds
      : [blockId];

  const blockWidth = (blockId: string) =>
    isCoupleBlock(blockId) ? COUPLE_WIDTH : NODE_WIDTH;

  const blockGen = (blockId: string) =>
    isCoupleBlock(blockId)
      ? unions[unionOfCoupleBlock(blockId)].generation
      : (individuals[blockId]?.generation ?? 0);

  // The "blood" member is the partner whose own parents anchor this block into
  // the tree. Couples with no in-tree parent become roots; the (rare) couple
  // where both partners have parents attaches to one side, leaving the other a
  // longer edge.
  const bloodMember = (blockId: string): string => {
    const members = blockMembers(blockId);
    return members.find((m) => parentUnionOfPerson.has(m)) ?? members[0];
  };

  const parentUnionOfBlock = (blockId: string): string | null =>
    parentUnionOfPerson.get(bloodMember(blockId)) ?? null;

  // Which block "owns" a union (and therefore parents its children): the couple
  // block for grouped unions, otherwise the couple-side partner's block.
  const ownerBlockOfUnion = (unionId: string): string | null => {
    if (coupleByUnion.has(unionId)) return coupleNodeId(unionId);
    const partners = unions[unionId].partnerIds;
    for (const p of partners) {
      const b = blockOfPerson(p);
      if (isCoupleBlock(b)) return b;
    }
    return partners.length ? blockOfPerson(partners[0]) : null;
  };

  const unionsOwnedBy = new Map<string, string[]>();
  for (const union of Object.values(unions)) {
    const owner = ownerBlockOfUnion(union.id);
    if (!owner) continue;
    const list = unionsOwnedBy.get(owner);
    if (list) list.push(union.id);
    else unionsOwnedBy.set(owner, [union.id]);
  }

  // ---- Couple orientation: drop husband-left when flipping reduces crossings.
  const parentAnchorX = (personId: string): number | null => {
    const famc = parentUnionOfPerson.get(personId);
    if (!famc) return null;
    if (coupleByUnion.has(famc)) return centerX.get(coupleNodeId(famc)) ?? null;
    return centerX.get(famc) ?? null;
  };

  const coupleOrientation = new Map<string, { left: string; right: string }>();
  for (const couple of couples) {
    const c = centerX.get(coupleNodeId(couple.unionId)) ?? 0;
    const la = parentAnchorX(couple.leftId);
    const ra = parentAnchorX(couple.rightId);
    let swap = false;
    if (la !== null && ra !== null) swap = la > ra;
    else if (la !== null) swap = la > c;
    else if (ra !== null) swap = ra < c;
    coupleOrientation.set(
      couple.unionId,
      swap
        ? { left: couple.rightId, right: couple.leftId }
        : { left: couple.leftId, right: couple.rightId },
    );
  }

  /** X offset of a person's card center from the left edge of their block. */
  const cardOffset = (personId: string): number => {
    const block = blockOfPerson(personId);
    if (!isCoupleBlock(block)) return NODE_WIDTH / 2;
    const orient = coupleOrientation.get(unionOfCoupleBlock(block));
    return orient && orient.right === personId
      ? COUPLE_WIDTH - NODE_WIDTH / 2
      : NODE_WIDTH / 2;
  };

  type ChildEntry = { block: string; childId: string };

  const childEntriesOf = (blockId: string): ChildEntry[] => {
    const owned = unionsOwnedBy.get(blockId) ?? [];
    const seen = new Set<string>();
    const result: ChildEntry[] = [];
    for (const unionId of owned) {
      for (const childId of unions[unionId].childIds) {
        const cb = blockOfPerson(childId);
        // Skip the partner that this block is *not* the primary parent of, so a
        // couple is only attached under one family.
        if (bloodMember(cb) !== childId) continue;
        if (seen.has(cb)) continue;
        seen.add(cb);
        result.push({ block: cb, childId });
      }
    }
    result.sort(
      (a, b) => (centerX.get(a.block) ?? 0) - (centerX.get(b.block) ?? 0),
    );
    return result;
  };

  // ---- Tidy-tree x assignment (Reingold-Tilford style with contours). ----
  const blockX = new Map<string, number>();
  const contours = new Map<string, Contour>();

  type Contour = { left: (number | undefined)[]; right: (number | undefined)[] };

  const shiftSubtree = (blockId: string, dx: number) => {
    blockX.set(blockId, (blockX.get(blockId) ?? 0) + dx);
    for (const entry of childEntriesOf(blockId)) shiftSubtree(entry.block, dx);
  };

  /** Card center of a child (accounts for which side of a couple they sit on). */
  const childCardCenter = (entry: ChildEntry) =>
    (blockX.get(entry.block) ?? 0) + cardOffset(entry.childId);

  const layout = (blockId: string): Contour => {
    const cached = contours.get(blockId);
    if (cached) return cached;

    const gen = blockGen(blockId);
    const width = blockWidth(blockId);
    const children = childEntriesOf(blockId);

    if (children.length === 0) {
      blockX.set(blockId, 0);
      const left: (number | undefined)[] = [];
      const right: (number | undefined)[] = [];
      left[gen] = 0;
      right[gen] = width;
      const contour = { left, right };
      contours.set(blockId, contour);
      return contour;
    }

    const mergedLeft: (number | undefined)[] = [];
    const mergedRight: (number | undefined)[] = [];
    for (let i = 0; i < children.length; i++) {
      const sub = layout(children[i].block);
      if (i > 0) {
        let shift = 0;
        const depth = Math.max(mergedRight.length, sub.left.length);
        for (let g = 0; g < depth; g++) {
          const r = mergedRight[g];
          const l = sub.left[g];
          if (r !== undefined && l !== undefined) {
            shift = Math.max(shift, r + SIBLING_GAP - l);
          }
        }
        if (shift !== 0) {
          shiftSubtree(children[i].block, shift);
          for (let g = 0; g < sub.left.length; g++) {
            if (sub.left[g] !== undefined) sub.left[g]! += shift;
            if (sub.right[g] !== undefined) sub.right[g]! += shift;
          }
        }
      }
      for (let g = 0; g < sub.left.length; g++) {
        if (sub.left[g] !== undefined)
          mergedLeft[g] =
            mergedLeft[g] === undefined
              ? sub.left[g]
              : Math.min(mergedLeft[g]!, sub.left[g]!);
        if (sub.right[g] !== undefined)
          mergedRight[g] =
            mergedRight[g] === undefined
              ? sub.right[g]
              : Math.max(mergedRight[g]!, sub.right[g]!);
      }
    }

    // Center this block's anchor (its dot) over the children's card span.
    let minCard = Infinity;
    let maxCard = -Infinity;
    for (const entry of children) {
      const cc = childCardCenter(entry);
      minCard = Math.min(minCard, cc);
      maxCard = Math.max(maxCard, cc);
    }
    const x = (minCard + maxCard) / 2 - width / 2;
    blockX.set(blockId, x);

    const left = mergedLeft.slice();
    const right = mergedRight.slice();
    left[gen] = left[gen] === undefined ? x : Math.min(left[gen]!, x);
    right[gen] =
      right[gen] === undefined ? x + width : Math.max(right[gen]!, x + width);
    const contour = { left, right };
    contours.set(blockId, contour);
    return contour;
  };

  // Pack root subtrees (and any leftover blocks) left to right.
  const allBlocks = new Set<string>();
  for (const c of couples) allBlocks.add(coupleNodeId(c.unionId));
  for (const id of Object.keys(individuals))
    if (!personToUnion.has(id)) allBlocks.add(id);

  const roots = [...allBlocks]
    .filter((b) => parentUnionOfBlock(b) === null)
    .sort((a, b) => (centerX.get(a) ?? 0) - (centerX.get(b) ?? 0));

  const packRight: (number | undefined)[] = [];
  const packOne = (blockId: string) => {
    const sub = layout(blockId);
    let shift = 0;
    const depth = Math.max(packRight.length, sub.left.length);
    for (let g = 0; g < depth; g++) {
      const r = packRight[g];
      const l = sub.left[g];
      if (r !== undefined && l !== undefined) {
        shift = Math.max(shift, r + SIBLING_GAP - l);
      }
    }
    if (shift !== 0) {
      shiftSubtree(blockId, shift);
      for (let g = 0; g < sub.right.length; g++) {
        if (sub.right[g] !== undefined) sub.right[g]! += shift;
      }
    }
    for (let g = 0; g < sub.right.length; g++) {
      if (sub.right[g] !== undefined)
        packRight[g] =
          packRight[g] === undefined
            ? sub.right[g]
            : Math.max(packRight[g]!, sub.right[g]!);
    }
  };

  for (const root of roots) packOne(root);
  // Safety net: place anything the forest walk missed as extra roots.
  for (const block of allBlocks) if (!contours.has(block)) packOne(block);

  // Normalize so the leftmost block starts at x = 0.
  let minX = Infinity;
  for (const x of blockX.values()) minX = Math.min(minX, x);
  if (!Number.isFinite(minX)) minX = 0;

  // ---- Emit final positions. ----
  const positions = new Map<string, LayoutPosition>();
  for (const [blockId, rawX] of blockX) {
    const x = rawX - minX;
    const y = blockGen(blockId) * GEN_V_SPACING;
    if (isCoupleBlock(blockId)) {
      const unionId = unionOfCoupleBlock(blockId);
      const { left, right } = coupleOrientation.get(unionId)!;
      positions.set(left, { id: left, x, y });
      positions.set(right, {
        id: right,
        x: x + NODE_WIDTH + COUPLE_INNER_GAP,
        y,
      });
      positions.set(unionId, {
        id: unionId,
        x: x + COUPLE_WIDTH / 2 - UNION_SIZE / 2,
        y: y + COUPLE_UNION_DROP,
      });
    } else {
      positions.set(blockId, { id: blockId, x, y });
    }
  }

  // Loose union anchors (single-parent / remarriage): center the dot between
  // its partners, in the band below them.
  for (const union of Object.values(unions)) {
    if (coupleByUnion.has(union.id)) continue;
    const partnerPositions = union.partnerIds
      .map((id) => positions.get(id))
      .filter((pos): pos is LayoutPosition => Boolean(pos));
    if (partnerPositions.length === 0) continue;
    positions.set(union.id, {
      id: union.id,
      x:
        average(partnerPositions.map((pos) => pos.x + NODE_WIDTH / 2)) -
        UNION_SIZE / 2,
      y: union.generation * GEN_V_SPACING + COUPLE_UNION_DROP,
    });
  }

  return positions;
}
