import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { buildElkGraph, individuals, unions, type ElkGraphOptions } from "./familyGraph";
import {
  COUPLE_INNER_GAP,
  COUPLE_UNION_DROP,
  COUPLE_WIDTH,
  LAYER_GAP,
  NODE_WIDTH,
  UNION_SIZE,
} from "./layoutConstants";

export type LayoutPosition = { id: string; x: number; y: number };

const elk = new ELK();

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

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
