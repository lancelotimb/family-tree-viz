import type { Edge, Node } from "@xyflow/react";
import { colorForFamilyName, type FamilyBranch } from "./branchPalette";
import { FAMILY_GEDCOM, parseGedcom } from "./gedcom";
import { COUPLE_WIDTH, NODE_HEIGHT, NODE_WIDTH } from "./layoutConstants";
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
 *
 * Generations model *contemporaneity*, not raw ancestral depth: a married
 * couple share a row, so when someone marries into a deeper branch they are
 * pulled down to their spouse's generation. To keep their birth family
 * consistent we also pull a union down to sit one row above its *deepest* child
 * (the `gen[childId] - 1` term below). That deepest child then drags the union,
 * which in turn lifts every sibling onto the same row and propagates up the
 * branch — so a short branch that marries into a deep one slides down as a unit
 * instead of leaving the married-in member stranded generations below their
 * parents and siblings.
 */
function deriveGenerations(graph: FamilyGraph): void {
  const { individuals, unions } = graph;
  const gen: Record<string, number> = {};
  for (const id of Object.keys(individuals)) gen[id] = 0;

  // A union sits as deep as the lower of: its own partners, or one row above its
  // deepest child (so a child pulled down by their marriage drags the family).
  const unionGenerationOf = (union: Union) => {
    let result = union.partnerIds.length
      ? Math.max(...union.partnerIds.map((p) => gen[p] ?? 0))
      : 0;
    for (const childId of union.childIds) {
      result = Math.max(result, (gen[childId] ?? 0) - 1);
    }
    return result;
  };

  const maxIterations =
    Object.keys(individuals).length + Object.keys(unions).length + 1;

  for (let i = 0; i < maxIterations; i++) {
    let changed = false;

    for (const union of Object.values(unions)) {
      const partnerGen = unionGenerationOf(union);

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
    union.generation = unionGenerationOf(union);
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

/** Parents of a person via their birth union (GEDCOM FAMC). */
export function getParents(id: string): Individual[] {
  const person = individuals[id];
  if (!person?.famc) return [];
  const union = unions[person.famc];
  if (!union) return [];
  return union.partnerIds
    .map((partnerId) => individuals[partnerId])
    .filter((individual): individual is Individual => individual !== undefined);
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
 * remarried partners and single parents stay plain person nodes. Only downward
 * child edges are emitted (marriage anchors are positioned after layout), and
 * the nodes are listed in a family-tree DFS order so ELK keeps each branch a
 * contiguous block. The combined couple nodes are expanded back into two
 * partner positions after layout (see `computeLayout`).
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

  // ---- Node emission order (model order) ----
  // ELK's `forceNodeModelOrder` (set in computeLayout) makes it honour the
  // order in which we list nodes within each generation. We emit them in a
  // family-tree DFS: each founding union first, then recursively every child's
  // own union(s), so a whole branch forms one contiguous left-to-right block.
  // This stops siblings of different families from interleaving around a couple
  // that bridges two branches (which previously produced overlapping sibling
  // edges).
  const visitedUnions = new Set<string>();
  const unionsHeadedBy = (id: string) =>
    (individuals[id]?.fams ?? [])
      .filter((famId) => unions[famId])
      .sort(
        (a, b) =>
          (unions[a].marriage?.year ?? Infinity) -
          (unions[b].marriage?.year ?? Infinity),
      );

  const visitUnion = (union: Union) => {
    if (visitedUnions.has(union.id)) return;
    visitedUnions.add(union.id);

    // Pull in each partner's *other* (loose) unions — i.e. remarriages where a
    // partner is grouped into this couple but married again elsewhere. We emit
    // the remarriage spouse on the outer side (before this couple) and merge the
    // half-siblings into one birth-sorted group. This keeps a remarriage's
    // children next to their half-siblings instead of letting them drift into a
    // neighbouring branch, which otherwise creates a crossing sibling edge.
    const mergedChildren = [...union.childIds];
    for (const partnerId of union.partnerIds) {
      for (const otherId of unionsHeadedBy(partnerId)) {
        if (otherId === union.id || groupedUnions.has(otherId)) continue;
        if (visitedUnions.has(otherId)) continue;
        const other = unions[otherId];
        const otherSpouses = other.partnerIds.filter((id) => id !== partnerId);
        // Only fold in a simple remarriage: the extra spouse(s) must be plain
        // married-in people, not themselves grouped into another couple, so we
        // never drag an unrelated branch into this position.
        if (otherSpouses.some((id) => personToUnion[id])) continue;
        visitedUnions.add(otherId);
        for (const spouseId of otherSpouses) addPersonNode(spouseId);
        mergedChildren.push(...other.childIds);
      }
    }

    for (const partnerId of union.partnerIds) addPersonNode(partnerId);

    mergedChildren.sort(
      (a, b) =>
        (individuals[a]?.birth.year ?? 0) - (individuals[b]?.birth.year ?? 0),
    );
    for (const childId of mergedChildren) {
      const childUnions = unionsHeadedBy(childId);
      if (childUnions.length > 0) {
        for (const famId of childUnions) visitUnion(unions[famId]);
      } else {
        addPersonNode(childId);
      }
    }
  };

  // Start from founding unions (partners with no recorded parents); document
  // order anchors each branch's relative left-to-right placement.
  for (const union of Object.values(unions)) {
    if (union.partnerIds.every((id) => !individuals[id]?.famc)) {
      visitUnion(union);
    }
  }
  // Defensive: visit anything unreachable from a founding union (cycles), then
  // emit any remaining person who belongs to no union at all.
  for (const union of Object.values(unions)) visitUnion(union);
  for (const id of Object.keys(individuals)) addPersonNode(id);

  // ---- Child edges (their order does not affect the forced node order) ----
  for (const union of Object.values(unions)) {
    if (groupedUnions.has(union.id)) {
      // Partners share one combined node, so we only emit the downward edges to
      // the children.
      for (const childId of union.childIds) {
        edges.push({
          id: `child-${union.id}-${childId}`,
          source: coupleNodeId(union.id),
          target: nodeOf(childId),
        });
      }
      continue;
    }

    // Loose unions (remarriages, single parents) have no anchor node; route the
    // child edges straight from each partner. A partner may be grouped into a
    // couple node, so two partners can map to the same ELK node — dedupe.
    const emittedChildEdges = new Set<string>();
    for (const childId of union.childIds) {
      for (const partnerId of union.partnerIds) {
        const source = nodeOf(partnerId);
        const target = nodeOf(childId);
        const key = `${source}->${target}`;
        if (emittedChildEdges.has(key)) continue;
        emittedChildEdges.add(key);
        edges.push({
          id: `child-${union.id}-${partnerId}-${childId}`,
          source,
          target,
        });
      }
    }
  }

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

/** Nodes and edges connecting a person to their parents, children, and spouses. */
export function getFamilyHighlight(personId: string): {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
} {
  const person = individuals[personId];
  if (!person) return { nodeIds: new Set(), edgeIds: new Set() };

  const nodeIds = new Set<string>([personNodeId(personId)]);
  const edgeIds = new Set<string>();

  const addUnion = (unionId: string) => {
    const union = unions[unionId];
    if (!union) return;
    nodeIds.add(unionNodeId(unionId));
    for (const partnerId of union.partnerIds) {
      nodeIds.add(personNodeId(partnerId));
      edgeIds.add(`marriage-${unionId}-${partnerId}`);
    }
    for (const childId of union.childIds) {
      nodeIds.add(personNodeId(childId));
      edgeIds.add(`child-${unionId}-${childId}`);
    }
  };

  for (const unionId of person.fams) addUnion(unionId);

  if (person.famc) {
    const union = unions[person.famc];
    if (union) {
      nodeIds.add(unionNodeId(person.famc));
      for (const partnerId of union.partnerIds) {
        nodeIds.add(personNodeId(partnerId));
        edgeIds.add(`marriage-${person.famc}-${partnerId}`);
      }
      edgeIds.add(`child-${person.famc}-${personId}`);
    }
  }

  return { nodeIds, edgeIds };
}

/** Every blood ancestor and descendant of a person (the person is included). */
export function getLineagePersonIds(personId: string): Set<string> {
  const result = new Set<string>();

  const visitAscendants = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    const person = individuals[id];
    if (!person?.famc) return;
    const union = unions[person.famc];
    if (!union) return;
    for (const parentId of union.partnerIds) {
      visitAscendants(parentId);
    }
  };

  const visitDescendants = (id: string) => {
    const person = individuals[id];
    if (!person) return;
    for (const unionId of person.fams) {
      const union = unions[unionId];
      if (!union) continue;
      for (const childId of union.childIds) {
        if (result.has(childId)) continue;
        result.add(childId);
        visitDescendants(childId);
      }
    }
  };

  visitAscendants(personId);
  visitDescendants(personId);

  return result;
}

export function unionInLineage(unionId: string, lineagePersonIds: Set<string>): boolean {
  const union = unions[unionId];
  if (!union) return false;
  return (
    union.partnerIds.some((id) => lineagePersonIds.has(id)) ||
    union.childIds.some((id) => lineagePersonIds.has(id))
  );
}
