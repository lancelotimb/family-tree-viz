import type { Edge, Node } from "@xyflow/react";
import { FAMILY_GEDCOM, parseGedcom } from "./gedcom";
import { NODE_HEIGHT, NODE_WIDTH, UNION_SIZE } from "./layoutConstants";
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
    birthYear: p.birth.year,
    deathYear: p.death?.year ?? null,
    gender: p.gender,
    generation: p.generation,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

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

/**
 * Describe the graph for ELK: people and unions are both nodes, partitioned by
 * generation. Edges connect each partner to their union and each union down to
 * its children. Nodes are emitted grouped by couple so ELK's model-order keeps
 * spouses adjacent.
 */
export function buildElkGraph(): {
  nodes: ElkNodeInput[];
  edges: ElkEdgeInput[];
} {
  const nodes: ElkNodeInput[] = [];
  const edges: ElkEdgeInput[] = [];
  const emitted = new Set<string>();

  const addPerson = (id: string) => {
    if (emitted.has(id)) return;
    emitted.add(id);
    nodes.push({
      id: personNodeId(id),
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      partition: individuals[id].generation,
    });
  };

  const orderedUnions = Object.values(unions).sort(
    (a, b) => a.generation - b.generation,
  );

  for (const union of orderedUnions) {
    const [first, second] = union.partnerIds;
    if (first) addPerson(first);
    nodes.push({
      id: unionNodeId(union.id),
      width: UNION_SIZE,
      height: UNION_SIZE,
      partition: union.generation,
    });
    if (second) addPerson(second);

    for (const partnerId of union.partnerIds) {
      edges.push({
        id: `marriage-${union.id}-${partnerId}`,
        source: personNodeId(partnerId),
        target: unionNodeId(union.id),
      });
    }
    for (const childId of union.childIds) {
      edges.push({
        id: `child-${union.id}-${childId}`,
        source: unionNodeId(union.id),
        target: personNodeId(childId),
      });
    }
  }

  for (const id of Object.keys(individuals)) addPerson(id);

  return { nodes, edges };
}

type Positioned = { id: string; x: number; y: number };

function personData(individual: Individual): PersonNodeData {
  return {
    kind: "person",
    name: individual.name,
    birthYear: individual.birth.year,
    deathYear: individual.death?.year ?? null,
    gender: individual.gender,
    generation: individual.generation,
  };
}

function unionData(union: Union): UnionNodeData {
  return {
    kind: "union",
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

const edgeStyle = { stroke: "#c4b49a", strokeWidth: 1.5 };

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
      edges.push({
        id: `marriage-${union.id}-${partnerId}`,
        source: personNodeId(partnerId),
        sourceHandle: "parent-out",
        target: unionId,
        targetHandle: "union-top",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
        style: union.divorce
          ? { ...edgeStyle, strokeDasharray: "5 4" }
          : edgeStyle,
        data: { kind: "marriage" },
      } as Edge);
    }

    for (const childId of union.childIds) {
      edges.push({
        id: `child-${union.id}-${childId}`,
        source: unionId,
        sourceHandle: "union-bottom",
        target: personNodeId(childId),
        targetHandle: "child",
        type: "smoothstep",
        pathOptions: { borderRadius: 12 },
        style: edgeStyle,
        data: { kind: "child" },
      } as Edge);
    }
  }

  return edges;
}
