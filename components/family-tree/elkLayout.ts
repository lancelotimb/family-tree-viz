import ELK, { type ElkNode } from "elkjs/lib/elk.bundled.js";
import { buildElkGraph, unions } from "./familyGraph";
import { NODE_WIDTH, UNION_SIZE } from "./layoutConstants";

export type LayoutPosition = { id: string; x: number; y: number };

const elk = new ELK();

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Run ELK's layered algorithm. Generations become layers (DOWN direction) via
 * partitioning; each union sits in its own band between its partners and their
 * children, so partners connect down to a shared anchor.
 */
export async function computeLayout(): Promise<Map<string, LayoutPosition>> {
  const { nodes, edges } = buildElkGraph();

  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.partitioning.activate": "true",
      "elk.layered.spacing.nodeNodeBetweenLayers": "70",
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

  const positions = new Map<string, LayoutPosition>();
  for (const child of result.children ?? []) {
    positions.set(child.id, {
      id: child.id,
      x: child.x ?? 0,
      y: child.y ?? 0,
    });
  }

  // Cosmetic: horizontally center a couple's union dot between its two partners
  // so the marriage anchor reads as the midpoint of the pair.
  for (const union of Object.values(unions)) {
    if (union.partnerIds.length !== 2) continue;
    const unionPos = positions.get(union.id);
    const partnerPositions = union.partnerIds
      .map((id) => positions.get(id))
      .filter((pos): pos is LayoutPosition => Boolean(pos));
    if (!unionPos || partnerPositions.length !== 2) continue;

    unionPos.x =
      average(partnerPositions.map((pos) => pos.x + NODE_WIDTH / 2)) -
      UNION_SIZE / 2;
  }

  return positions;
}
