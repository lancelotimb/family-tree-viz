import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import {
  buildElkGraph,
  individuals,
  unions,
  type CoupleGroup,
  type ElkEdgeInput,
  type ElkGraphOptions,
  type ElkNodeInput,
} from "./familyGraph";
import {
  COUPLE_INNER_GAP,
  COUPLE_UNION_DROP,
  COUPLE_WIDTH,
  H_GAP,
  LAYER_GAP,
  NODE_WIDTH,
  UNION_SIZE,
} from "./layoutConstants";

export type LayoutPosition = { id: string; x: number; y: number };

const elk = new ELK();

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Horizontal extent of a subtree, recorded per generation layer as the left and
 * right edges occupied at that layer. Used to slide neighbouring subtrees apart
 * by only as much as the layers they actually share require.
 */
type Contour = Map<number, { min: number; max: number }>;

function mergeContour(into: Contour, from: Contour, shift = 0): void {
  for (const [layer, range] of from) {
    const min = range.min + shift;
    const max = range.max + shift;
    const existing = into.get(layer);
    if (!existing) {
      into.set(layer, { min, max });
    } else {
      existing.min = Math.min(existing.min, min);
      existing.max = Math.max(existing.max, max);
    }
  }
}

/**
 * Smallest shift that places `incoming` to the right of everything already in
 * `accum`, keeping at least `gap` between boxes that share a generation layer.
 * Layers that don't overlap can't collide (different rows), so they don't
 * constrain the shift.
 */
function separationShift(accum: Contour, incoming: Contour, gap: number): number {
  let shift = 0;
  let constrained = false;
  for (const [layer, range] of incoming) {
    const existing = accum.get(layer);
    if (!existing) continue;
    const needed = existing.max + gap - range.min;
    if (!constrained || needed > shift) {
      shift = needed;
      constrained = true;
    }
  }
  return constrained ? shift : 0;
}

/**
 * Re-arrange the horizontal (x) positions of the ELK boxes so each parent box
 * (a single person or a combined couple) is centered over the midpoint of its
 * children, à la Reingold–Tilford. Vertical layering, box widths, and the
 * left-to-right ordering ELK chose are all preserved; only x changes.
 *
 * The family graph is a DAG (a couple box has a parent on each partner's side,
 * children can be shared across unions), so we first reduce it to a spanning
 * forest by giving each box a single "primary" parent. For a couple we prefer
 * the parent on the side of the partner whose surname the children carry (the
 * blood line), so e.g. the Imberton main line keeps descending under the
 * Imberton grandparents and stays beside its siblings instead of being adopted
 * into the spouse's branch. Otherwise we fall back to the parent whose ELK
 * center is closest, keeping the result near ELK's arrangement. Secondary links
 * still render as edges; they just don't drive centering.
 *
 * Married-in spouses from a *loose* union (e.g. a remarriage that wasn't merged
 * into a combined couple box) have no parents of their own, so on their own
 * they would look like independent roots and get packed next to the founding
 * ancestors — far from their actual spouse. We instead detect them as
 * "satellites" of their anchored partner, keep them out of the forest, and
 * after centering translate them (preserving ELK's adjacency) by however far
 * that partner moved, so they ride along beside them.
 */
function centerParentsOverChildren(
  positions: Map<string, LayoutPosition>,
  nodes: ElkNodeInput[],
  edges: ElkEdgeInput[],
  couples: CoupleGroup[],
): void {
  const gap = H_GAP;
  const widthOf = new Map<string, number>();
  const layerOf = new Map<string, number>();
  for (const node of nodes) {
    widthOf.set(node.id, node.width);
    layerOf.set(node.id, node.partition);
  }

  const currentX = (id: string) => positions.get(id)?.x ?? 0;
  const width = (id: string) => widthOf.get(id) ?? NODE_WIDTH;
  const currentCenter = (id: string) => currentX(id) + width(id) / 2;

  // The ELK box a person maps to: their combined couple node when grouped,
  // otherwise their own person node.
  const personToCoupleNode = new Map<string, string>();
  const coupleByNodeId = new Map<string, CoupleGroup>();
  const groupedUnionToBox = new Map<string, string>();
  for (const couple of couples) {
    personToCoupleNode.set(couple.leftId, couple.nodeId);
    personToCoupleNode.set(couple.rightId, couple.nodeId);
    coupleByNodeId.set(couple.nodeId, couple);
    groupedUnionToBox.set(couple.unionId, couple.nodeId);
  }
  const boxOf = (personId: string) =>
    personToCoupleNode.get(personId) ?? personId;

  // The ELK box that represents a person's parent union (their `famc`), if it is
  // laid out: the combined node when the parents are grouped, else a positioned
  // partner of the loose parent union.
  const parentBoxOfPerson = (personId: string): string | null => {
    const famc = individuals[personId]?.famc;
    if (!famc) return null;
    const grouped = groupedUnionToBox.get(famc);
    if (grouped) return positions.has(grouped) ? grouped : null;
    const union = unions[famc];
    if (!union) return null;
    for (const partnerId of union.partnerIds) {
      const box = boxOf(partnerId);
      if (positions.has(box)) return box;
    }
    return null;
  };

  // Build parent adjacency from the (downward) child edges ELK was given.
  const parentsOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!positions.has(edge.source) || !positions.has(edge.target)) continue;
    const parents = parentsOf.get(edge.target);
    if (parents) parents.push(edge.source);
    else parentsOf.set(edge.target, [edge.source]);
  }

  // A "satellite" is a parentless person box whose spouse, through a loose
  // union, sits in an anchored box (a combined couple, or a partner who has
  // their own parents). Such spouses should follow their partner, not float off
  // among the roots. Map each satellite box to the anchor box it rides with.
  const satelliteAnchor = new Map<string, string>();
  for (const id of positions.keys()) {
    if (parentsOf.has(id)) continue; // has parents → laid out normally
    const person = individuals[id];
    if (!person) continue; // only loose person boxes can be satellites
    let anchor: string | null = null;
    for (const unionId of person.fams ?? []) {
      const union = unions[unionId];
      if (!union) continue;
      for (const partnerId of union.partnerIds) {
        if (partnerId === id) continue;
        const partnerBox = boxOf(partnerId);
        if (partnerBox === id || !positions.has(partnerBox)) continue;
        const partnerIsCouple = partnerBox !== partnerId;
        if (partnerIsCouple || parentsOf.has(partnerBox)) {
          anchor = partnerBox;
          break;
        }
      }
      if (anchor) break;
    }
    if (anchor) satelliteAnchor.set(id, anchor);
  }

  /**
   * For a combined couple box with parents on both partners' sides, the parent
   * box on the side of the partner whose surname the couple's children carry.
   * Returns null when that can't be determined unambiguously (so the caller
   * falls back to the closest-center heuristic).
   */
  const bloodParentBox = (coupleNode: string, pool: string[]): string | null => {
    const couple = coupleByNodeId.get(coupleNode);
    if (!couple) return null;
    const union = unions[couple.unionId];
    if (!union) return null;

    const counts = new Map<string, number>();
    for (const childId of union.childIds) {
      const fam = individuals[childId]?.familyName;
      if (fam) counts.set(fam, (counts.get(fam) ?? 0) + 1);
    }
    let childFamily: string | null = null;
    let bestCount = 0;
    for (const [fam, n] of counts) {
      if (n > bestCount) {
        bestCount = n;
        childFamily = fam;
      }
    }
    if (!childFamily) return null;

    const matching = [couple.leftId, couple.rightId].filter(
      (p) => individuals[p]?.familyName === childFamily,
    );
    if (matching.length !== 1) return null; // ambiguous (same surname, or none)

    const box = parentBoxOfPerson(matching[0]);
    if (box && !satelliteAnchor.has(box) && pool.includes(box)) return box;
    return null;
  };

  // Each box keeps one primary parent. Couples prefer their blood-line side;
  // everything else takes the horizontally closest parent. Satellites are
  // skipped as parents when an anchored alternative exists.
  const primaryParent = new Map<string, string>();
  for (const [child, parents] of parentsOf) {
    const anchored = parents.filter((p) => !satelliteAnchor.has(p));
    const pool = anchored.length > 0 ? anchored : parents;

    let chosen: string | null = null;
    if (pool.length > 1 && coupleByNodeId.has(child)) {
      chosen = bloodParentBox(child, pool);
    }
    if (!chosen) {
      let best = pool[0];
      let bestDistance = Infinity;
      for (const parent of pool) {
        const distance = Math.abs(currentCenter(parent) - currentCenter(child));
        if (distance < bestDistance) {
          bestDistance = distance;
          best = parent;
        }
      }
      chosen = best;
    }
    primaryParent.set(child, chosen);
  }

  const primaryChildren = new Map<string, string[]>();
  for (const id of positions.keys()) primaryChildren.set(id, []);
  for (const [child, parent] of primaryParent) {
    primaryChildren.get(parent)?.push(child);
  }
  // A satellite that nonetheless ended up owning a child (its loose union's only
  // anchor) can't float — promote it back to a normal root.
  for (const [satellite] of satelliteAnchor) {
    if ((primaryChildren.get(satellite)?.length ?? 0) > 0) {
      satelliteAnchor.delete(satellite);
    }
  }
  // Preserve ELK's left-to-right ordering of siblings.
  for (const kids of primaryChildren.values()) {
    kids.sort((a, b) => currentX(a) - currentX(b));
  }

  const newX = new Map<string, number>();

  const layoutSubtree = (
    node: string,
  ): { contour: Contour; members: string[] } => {
    const layer = layerOf.get(node) ?? 0;
    const w = width(node);
    const kids = primaryChildren.get(node) ?? [];

    if (kids.length === 0) {
      newX.set(node, 0);
      return { contour: new Map([[layer, { min: 0, max: w }]]), members: [node] };
    }

    const accum: Contour = new Map();
    const members: string[] = [];
    const childCenters: number[] = [];

    for (const kid of kids) {
      const sub = layoutSubtree(kid);
      const shift = separationShift(accum, sub.contour, gap);
      for (const id of sub.members) newX.set(id, (newX.get(id) ?? 0) + shift);
      mergeContour(accum, sub.contour, shift);
      members.push(...sub.members);
      childCenters.push((newX.get(kid) ?? 0) + width(kid) / 2);
    }

    // Center the parent over the midpoint of its outermost children.
    const center = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    newX.set(node, center - w / 2);
    mergeContour(
      accum,
      new Map([[layer, { min: center - w / 2, max: center + w / 2 }]]),
    );
    members.push(node);

    return { contour: accum, members };
  };

  // Roots are boxes nobody points down to and that aren't satellites; lay them
  // out left-to-right.
  const roots = [...positions.keys()]
    .filter((id) => !primaryParent.has(id) && !satelliteAnchor.has(id))
    .sort((a, b) => currentX(a) - currentX(b));

  const forest: Contour = new Map();
  for (const root of roots) {
    const sub = layoutSubtree(root);
    const shift = separationShift(forest, sub.contour, gap);
    for (const id of sub.members) newX.set(id, (newX.get(id) ?? 0) + shift);
    mergeContour(forest, sub.contour, shift);
  }

  // Slide each satellite by the same amount its anchor moved, keeping the
  // ELK-chosen offset (and thus the adjacency) to its spouse.
  for (const [satellite, anchor] of satelliteAnchor) {
    const anchorNew = newX.get(anchor);
    if (anchorNew === undefined) continue;
    const delta = anchorNew - currentX(anchor);
    newX.set(satellite, currentX(satellite) + delta);
  }

  for (const [id, x] of newX) {
    const pos = positions.get(id);
    if (pos) pos.x = x;
  }
}

/**
 * Run ELK's layered algorithm. Generations become layers (DOWN direction) via
 * partitioning. Each couple is handed to ELK as a single combined node so
 * spouses can never be pulled apart by crossing minimization; afterwards we
 * expand every combined node back into its two partner cards plus a centered
 * marriage anchor dot.
 */
export async function computeLayout(
  options: ElkGraphOptions = {},
): Promise<Map<string, LayoutPosition>> {
  const { nodes, edges, couples } = buildElkGraph(options);
  // Unions rendered as a single combined node; used below to skip them in the
  // loose-anchor pass (their dot is positioned during couple expansion).
  const groupedUnions = new Set(couples.map((c) => c.unionId));

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      // Lay generations out top-to-bottom (ancestors above descendants).
      "elk.direction": "DOWN",
      // Force each generation into its own layer band: `partition` (set per node
      // below) maps 1:1 to a generation, so people never drift across rows.
      "elk.partitioning.activate": "true",
      "elk.layered.spacing.nodeNodeBetweenLayers": String(LAYER_GAP),
      "elk.spacing.nodeNode": "55",
      // Honour the order in which we emit nodes/edges (couples are emitted as a
      // unit), so crossing minimization keeps spouses and siblings together.
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      // Honour our DFS node order within each layer so each branch stays a
      // contiguous block and siblings of different families don't interleave
      // around couples that bridge two branches.
      "elk.layered.crossingMinimization.forceNodeModelOrder": "true",
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

  const positions = new Map<string, LayoutPosition>();
  for (const child of result.children ?? []) {
    positions.set(child.id, {
      id: child.id,
      x: child.x ?? 0,
      y: child.y ?? 0,
    });
  }

  // Optional pass: re-space boxes horizontally so each parent/couple sits over
  // the center of its children. Runs while couples are still single boxes, so a
  // couple's center is exactly the midpoint that later carries the marriage dot.
  if (options.centerParentsOverChildren) {
    centerParentsOverChildren(positions, nodes, edges, couples);
  }

  // Snapshot the combined couple centers before mutating, so they stay usable
  // as parent anchors while we expand the rest of the couples.
  const coupleCenterX = new Map<string, number>();
  for (const couple of couples) {
    const pos = positions.get(couple.nodeId);
    if (pos) coupleCenterX.set(couple.unionId, pos.x + COUPLE_WIDTH / 2);
  }

  /**
   * Horizontal center of a person's parent union (their `famc`), if it is laid
   * out. Used to orient a couple so each partner sits on the side their own
   * parents are on, which keeps the two upward marriage edges from crossing.
   * A grouped parent is found by its combined-node center; a loose parent by
   * its marriage-dot node.
   */
  const parentAnchorX = (personId: string): number | null => {
    const famc = individuals[personId]?.famc;
    if (!famc) return null;
    if (coupleCenterX.has(famc)) return coupleCenterX.get(famc)!;
    const loose = positions.get(famc);
    return loose ? loose.x + UNION_SIZE / 2 : null;
  };

  // Expand each combined couple node into its two partner cards and a marriage
  // anchor dot centered just below them. We no longer force husband-left:
  // whichever partner's parents lie further left is placed on the left, which
  // removes avoidable crossings between the partners' edges to their parents.
  for (const couple of couples) {
    const combined = positions.get(couple.nodeId);
    if (!combined) continue;

    const center =
      coupleCenterX.get(couple.unionId) ?? combined.x + COUPLE_WIDTH / 2;
    const leftAnchor = parentAnchorX(couple.leftId);
    const rightAnchor = parentAnchorX(couple.rightId);

    // Decide whether to flip the default (left = first partner) orientation.
    let swap = false;
    if (leftAnchor !== null && rightAnchor !== null) {
      // Both partners have parents: put the one whose parents are further left
      // on the left, so the two upward edges run "straight" instead of crossing.
      swap = leftAnchor > rightAnchor;
    } else if (leftAnchor !== null) {
      // Only the first partner has parents: keep their edge short by seating
      // them on the side of the couple nearest those parents.
      swap = leftAnchor > center;
    } else if (rightAnchor !== null) {
      // Symmetric case: only the second partner has parents.
      swap = rightAnchor < center;
    }

    const leftPartner = swap ? couple.rightId : couple.leftId;
    const rightPartner = swap ? couple.leftId : couple.rightId;
    // The combined node spans both cards; the right card starts one card width
    // plus the inner gap to the right of the node's left edge.
    const rightX = combined.x + NODE_WIDTH + COUPLE_INNER_GAP;

    positions.set(leftPartner, {
      id: leftPartner,
      x: combined.x,
      y: combined.y,
    });
    positions.set(rightPartner, {
      id: rightPartner,
      x: rightX,
      y: combined.y,
    });
    // Place the marriage dot in the middle of the inner gap (so it reads as the
    // midpoint of the pair) and drop it into the band just below the cards.
    positions.set(couple.unionId, {
      id: couple.unionId,
      x: combined.x + NODE_WIDTH + COUPLE_INNER_GAP / 2 - UNION_SIZE / 2,
      y: combined.y + COUPLE_UNION_DROP,
    });
    // Drop the placeholder combined node now that the real cards exist.
    positions.delete(couple.nodeId);
  }

  // Loose unions (remarriages, single parents) were omitted from the ELK graph,
  // so they have no computed position yet. Synthesize their marriage dot here:
  // centered horizontally over the partner card(s) and dropped into the gap
  // below them, mirroring the grouped-couple dot so both kinds read the same.
  for (const union of Object.values(unions)) {
    if (groupedUnions.has(union.id)) continue;
    const partnerPositions = union.partnerIds
      .map((id) => positions.get(id))
      .filter((pos): pos is LayoutPosition => Boolean(pos));
    if (partnerPositions.length === 0) continue;

    const centerX = average(
      partnerPositions.map((pos) => pos.x + NODE_WIDTH / 2),
    );
    const topY = Math.min(...partnerPositions.map((pos) => pos.y));
    positions.set(union.id, {
      id: union.id,
      x: centerX - UNION_SIZE / 2,
      y: topY + COUPLE_UNION_DROP,
    });
  }

  return positions;
}
