import type { Edge, Node } from "@xyflow/react";
import { colorForFamilyName, type FamilyBranch } from "./branchPalette";
import { FAMILY_GEDCOM, parseGedcom } from "./gedcom";
import {
  COUPLE_WIDTH,
  NODE_HEIGHT,
  NODE_WIDTH,
  UNION_SIZE,
} from "./layoutConstants";
import type {
  FamilyGraph,
  FamilyNodeData,
  Individual,
  PersonNodeData,
  Union,
  UnionNodeData,
} from "./types";

/**
 * Assign every individual and union a layer index. Children sit one layer below
 * their union, and married-in partners are pulled down to match their partner's
 * generation so couples share a row. Computed as a fixpoint relaxation, which
 * naturally handles multi-marriages and half-siblings.
 */
function deriveGenerations(graph: FamilyGraph): void {
  const { individuals, unions } = graph;
  const gen: Record<string, number> = {};
  for (const id of Object.keys(individuals)) gen[id] = 0;

  const partnerGenerationOf = (union: Union) =>
    union.partnerIds.length
      ? Math.max(...union.partnerIds.map((p) => gen[p] ?? 0))
      : 0;

  const maxIterations =
    Object.keys(individuals).length + Object.keys(unions).length + 1;

  for (let i = 0; i < maxIterations; i++) {
    let changed = false;

    for (const union of Object.values(unions)) {
      const partnerGen = partnerGenerationOf(union);

      for (const partnerId of union.partnerIds) {
        if ((gen[partnerId] ?? 0) < partnerGen) {
          gen[partnerId] = partnerGen;
          changed = true;
        }
      }

      for (const childId of union.childIds) {
        if ((gen[childId] ?? 0) < partnerGen + 1) {
          gen[childId] = partnerGen + 1;
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  for (const individual of Object.values(individuals)) {
    individual.generation = gen[individual.id] ?? 0;
  }
  for (const union of Object.values(unions)) {
    union.generation = partnerGenerationOf(union);
  }
}

/** Order each union's children by birth year so siblings render left-to-right. */
function sortChildren(graph: FamilyGraph): void {
  const yearOf = (id: string) => graph.individuals[id]?.birth.year ?? 0;
  for (const union of Object.values(graph.unions)) {
    union.childIds = [...union.childIds].sort((a, b) => yearOf(a) - yearOf(b));
  }
}

function buildGraph(): FamilyGraph {
  const graph = parseGedcom(FAMILY_GEDCOM);
  deriveGenerations(graph);
  sortChildren(graph);
  return graph;
}

export const graph = buildGraph();
export const individuals = graph.individuals;
export const unions = graph.unions;

export function getIndividual(id: string | null): Individual | null {
  if (!id) return null;
  return individuals[id] ?? null;
}

/** Distinct spouses/partners of a person across all of their unions. */
export function getSpouses(id: string): Individual[] {
  const person = individuals[id];
  if (!person) return [];
  const seen = new Set<string>();
  const result: Individual[] = [];
  for (const unionId of person.fams) {
    for (const partnerId of unions[unionId]?.partnerIds ?? []) {
      if (partnerId !== id && !seen.has(partnerId) && individuals[partnerId]) {
        seen.add(partnerId);
        result.push(individuals[partnerId]);
      }
    }
  }
  return result;
}

/** All children of a person, gathered across every union they belong to. */
export function getChildren(id: string): Individual[] {
  const person = individuals[id];
  if (!person) return [];
  const seen = new Set<string>();
  const result: Individual[] = [];
  for (const unionId of person.fams) {
    for (const childId of unions[unionId]?.childIds ?? []) {
      if (!seen.has(childId) && individuals[childId]) {
        seen.add(childId);
        result.push(individuals[childId]);
      }
    }
  }
  return result.sort((a, b) => (a.birth.year ?? 0) - (b.birth.year ?? 0));
}

export const searchIndex = Object.values(individuals)
  .map((p) => ({
    id: p.id,
    name: p.name,
    familyName: p.familyName,
    birthYear: p.birth.year,
    deathYear: p.death?.year ?? null,
    gender: p.gender,
    generation: p.generation,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const familyBranches: FamilyBranch[] = Array.from(
  Object.values(individuals).reduce((counts, individual) => {
    counts.set(individual.familyName, (counts.get(individual.familyName) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()),
)
  .map(([familyName, count]) => ({
    familyName,
    count,
    color: colorForFamilyName(familyName),
  }))
  .sort((a, b) => b.count - a.count || a.familyName.localeCompare(b.familyName));

export const maxGeneration = Math.max(
  ...Object.values(individuals).map((p) => p.generation),
);

export const personNodeId = (id: string) => id;
export const unionNodeId = (id: string) => id;

export type ElkNodeInput = {
  id: string;
  width: number;
  height: number;
  partition: number;
};

export type ElkEdgeInput = { id: string; source: string; target: string };

/** A couple that ELK lays out as one combined node, expanded after layout. */
export type CoupleGroup = {
  unionId: string;
  /** ELK node id standing in for the whole couple. */
  nodeId: string;
  /** Partner placed on the left / right half of the combined node. */
  leftId: string;
  rightId: string;
};

export const coupleNodeId = (unionId: string) => `couple:${unionId}`;

/**
 * Decide which unions become a single combined "couple" node. Each person can
 * only belong to one combined couple, so for the rare remarriage we keep the
 * earliest union grouped and let the others fall back to the loose edge layout.
 */
function planCouples(): {
  couples: CoupleGroup[];
  groupedUnions: Set<string>;
  personToUnion: Record<string, string>;
} {
  const couples: CoupleGroup[] = [];
  const groupedUnions = new Set<string>();
  // Records which combined couple a person already belongs to, so nobody is
  // grouped twice.
  const personToUnion: Record<string, string> = {};

  // Process oldest generation first, and within a generation the earliest
  // marriage first. This makes the "first marriage wins" tie-break for a
  // remarried person deterministic.
  const ordered = Object.values(unions).sort((a, b) => {
    if (a.generation !== b.generation) return a.generation - b.generation;
    return (a.marriage?.year ?? Infinity) - (b.marriage?.year ?? Infinity);
  });

  for (const union of ordered) {
    // Only two-partner marriages can be merged into one node.
    if (union.partnerIds.length !== 2) continue;
    const [left, right] = union.partnerIds;
    // If either partner is already in a couple (a remarriage), this union stays
    // loose so the person isn't claimed by two combined nodes.
    if (personToUnion[left] || personToUnion[right]) continue;
    groupedUnions.add(union.id);
    personToUnion[left] = union.id;
    personToUnion[right] = union.id;
    couples.push({
      unionId: union.id,
      nodeId: coupleNodeId(union.id),
      leftId: left,
      rightId: right,
    });
  }

  return { couples, groupedUnions, personToUnion };
}

/**
 * Describe the graph for ELK, partitioned by generation. Each two-partner
 * couple collapses into a single node so ELK can never split spouses apart;
 * everyone else (single parents, remarried partners) stays a plain person node
 * connected through a marriage anchor. Edges connect partners to their union
 * and unions down to their children. The combined couple nodes are expanded
 * back into two partner positions after layout (see `computeLayout`).
 */
export function buildElkGraph(): {
  nodes: ElkNodeInput[];
  edges: ElkEdgeInput[];
  couples: CoupleGroup[];
} {
  const nodes: ElkNodeInput[] = [];
  const edges: ElkEdgeInput[] = [];
  // Guards against emitting the same ELK node twice (a person can be referenced
  // as a partner and as a child).
  const emitted = new Set<string>();

  const { couples, groupedUnions, personToUnion } = planCouples();

  /**
   * Map a person to the ELK node that represents them: their combined couple
   * node when grouped, otherwise their own person node. All edges go through
   * this so a grouped partner's edges attach to the couple node.
   */
  const nodeOf = (id: string) =>
    personToUnion[id] ? coupleNodeId(personToUnion[id]) : personNodeId(id);

  const addPersonNode = (id: string) => {
    const groupUnion = personToUnion[id];
    const nodeId = nodeOf(id);
    if (emitted.has(nodeId)) return;
    emitted.add(nodeId);
    if (groupUnion) {
      // One wide node standing in for both spouses; placed on the partners'
      // generation row.
      nodes.push({
        id: nodeId,
        width: COUPLE_WIDTH,
        height: NODE_HEIGHT,
        partition: unions[groupUnion].generation,
      });
    } else {
      nodes.push({
        id: nodeId,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        partition: individuals[id].generation,
      });
    }
  };

  const orderedUnions = Object.values(unions).sort(
    (a, b) => a.generation - b.generation,
  );

  for (const union of orderedUnions) {
    if (groupedUnions.has(union.id)) {
      // Partners live inside one combined node; the partner→marriage edges are
      // implicit (internal to the node), so we only emit the node once (via
      // either partner) and the downward edges to the children.
      addPersonNode(union.partnerIds[0]);
      for (const childId of union.childIds) {
        edges.push({
          id: `child-${union.id}-${childId}`,
          source: coupleNodeId(union.id),
          target: nodeOf(childId),
        });
      }
      continue;
    }

    // Loose layout: partners around an explicit marriage anchor, emitted in
    // order (partner, anchor, partner) so ELK's model order keeps a single
    // parent next to their anchor.
    const [first, second] = union.partnerIds;
    if (first) addPersonNode(first);
    nodes.push({
      id: unionNodeId(union.id),
      width: UNION_SIZE,
      height: UNION_SIZE,
      partition: union.generation,
    });
    if (second) addPersonNode(second);

    for (const partnerId of union.partnerIds) {
      edges.push({
        id: `marriage-${union.id}-${partnerId}`,
        source: nodeOf(partnerId),
        target: unionNodeId(union.id),
      });
    }
    for (const childId of union.childIds) {
      edges.push({
        id: `child-${union.id}-${childId}`,
        source: unionNodeId(union.id),
        target: nodeOf(childId),
      });
    }
  }

  // Emit anyone not reached above (people with no union at all) so every
  // individual still gets a node and a position.
  for (const id of Object.keys(individuals)) addPersonNode(id);

  return { nodes, edges, couples };
}

type Positioned = { id: string; x: number; y: number };

function personData(individual: Individual): PersonNodeData {
  const branchColor = colorForFamilyName(individual.familyName);
  return {
    kind: "person",
    name: individual.name,
    familyName: individual.familyName,
    branchColor,
    birthYear: individual.birth.year,
    deathYear: individual.death?.year ?? null,
    gender: individual.gender,
    generation: individual.generation,
  };
}

function unionFamilyName(union: Union): string {
  const childFamilyName = union.childIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  if (childFamilyName) return childFamilyName;
  const partnerFamilyName = union.partnerIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  return partnerFamilyName ?? "UNKNOWN";
}

function unionData(union: Union): UnionNodeData {
  const familyName = unionFamilyName(union);
  return {
    kind: "union",
    familyName,
    branchColor: colorForFamilyName(familyName),
    marriageYear: union.marriage?.year ?? null,
    divorced: union.divorce !== null,
    singleParent: union.partnerIds.length < 2,
  };
}

export function buildFlowNodes(
  positions: Map<string, Positioned>,
): Node<FamilyNodeData>[] {
  const nodes: Node<FamilyNodeData>[] = [];

  for (const individual of Object.values(individuals)) {
    const pos = positions.get(personNodeId(individual.id));
    if (!pos) continue;
    nodes.push({
      id: personNodeId(individual.id),
      type: "familyMember",
      position: { x: pos.x, y: pos.y },
      data: personData(individual),
    });
  }

  for (const union of Object.values(unions)) {
    const pos = positions.get(unionNodeId(union.id));
    if (!pos) continue;
    nodes.push({
      id: unionNodeId(union.id),
      type: "union",
      position: { x: pos.x, y: pos.y },
      data: unionData(union),
      draggable: false,
      selectable: false,
    });
  }

  return nodes;
}

function edgeStyleForFamily(familyName: string) {
  return {
    stroke: colorForFamilyName(familyName).stroke,
    strokeWidth: 1.7,
  };
}

/**
 * Build render edges: each partner connects down to their union anchor, and the
 * union branches down to every child. Both edge kinds mirror the graph
 * connectivity, so shortest-path queries traverse the union nodes naturally.
 */
export function buildFlowEdges(_positions: Map<string, Positioned>): Edge[] {
  void _positions;
  const edges: Edge[] = [];

  for (const union of Object.values(unions)) {
    const unionId = unionNodeId(union.id);

    for (const partnerId of union.partnerIds) {
      const familyName = individuals[partnerId]?.familyName ?? unionFamilyName(union);
      edges.push({
        id: `marriage-${union.id}-${partnerId}`,
        source: personNodeId(partnerId),
        sourceHandle: "parent-out",
        target: unionId,
        targetHandle: "union-top",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
        style: union.divorce
          ? { ...edgeStyleForFamily(familyName), strokeDasharray: "5 4" }
          : edgeStyleForFamily(familyName),
        data: { kind: "marriage", familyName },
      } as Edge);
    }

    for (const childId of union.childIds) {
      const familyName = individuals[childId]?.familyName ?? unionFamilyName(union);
      edges.push({
        id: `child-${union.id}-${childId}`,
        source: unionId,
        sourceHandle: "union-bottom",
        target: personNodeId(childId),
        targetHandle: "child",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
        style: edgeStyleForFamily(familyName),
        data: { kind: "child", familyName },
      } as Edge);
    }
  }

  return edges;
}
