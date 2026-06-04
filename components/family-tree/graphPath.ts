import type { Edge } from "@xyflow/react";
import type { Individual, Union } from "./types";

type BranchEdgeData = {
  familyName?: string;
};

function edgeFamilyName(edge: Edge): string | null {
  return (edge.data as BranchEdgeData | undefined)?.familyName ?? null;
}

export function buildAdjacencyList(edges: Edge[]): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();

  const addNeighbor = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };

  for (const edge of edges) {
    addNeighbor(edge.source, edge.target);
    addNeighbor(edge.target, edge.source);
  }

  return adjacency;
}

/** Shortest path between two nodes (BFS on undirected graph). */
export function findShortestPath(
  fromId: string,
  toId: string,
  adjacency: Map<string, Set<string>>,
): string[] | null {
  if (fromId === toId) return [fromId];
  if (!adjacency.has(fromId) || !adjacency.has(toId)) return null;

  const queue: string[] = [fromId];
  const visited = new Set<string>([fromId]);
  const previous = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      const path: string[] = [toId];
      let node = toId;
      while (previous.has(node)) {
        const prev = previous.get(node)!;
        path.unshift(prev);
        node = prev;
      }
      return path;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      previous.set(neighbor, current);
      queue.push(neighbor);
    }
  }

  return null;
}

function edgeConnects(edge: Edge, a: string, b: string): boolean {
  return (
    (edge.source === a && edge.target === b) ||
    (edge.source === b && edge.target === a)
  );
}

export function pathEdgeIds(path: string[], edges: Edge[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    for (const edge of edges) {
      if (edgeConnects(edge, a, b)) {
        ids.add(edge.id);
      }
    }
  }
  return ids;
}

function familyNameForNode(
  nodeId: string,
  individuals: Record<string, Individual>,
  unions: Record<string, Union>,
): string | null {
  const person = individuals[nodeId];
  if (person) return person.familyName;

  const union = unions[nodeId];
  if (!union) return null;

  const childFamilyName = union.childIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  if (childFamilyName) return childFamilyName;

  const partnerFamilyName = union.partnerIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  return partnerFamilyName ?? null;
}

export function findConnectedComponents(
  adjacency: Map<string, Set<string>>,
): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;

    const component = new Set<string>();
    const queue = [start];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.add(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }

    components.push(component);
  }

  return components;
}

function selectMainComponent(
  components: Set<string>[],
  individuals: Record<string, Individual>,
): Set<string> {
  if (components.length === 0) return new Set();
  if (components.length === 1) return components[0];

  const foundingIds = new Set(
    Object.values(individuals)
      .filter((person) => !person.famc)
      .map((person) => person.id),
  );

  const withFoundingRoots = components.filter((component) =>
    [...component].some((nodeId) => foundingIds.has(nodeId)),
  );

  const candidates = withFoundingRoots.length > 0 ? withFoundingRoots : components;

  return candidates.reduce((largest, component) =>
    component.size > largest.size ? component : largest,
  );
}

function familyNamesInComponent(
  component: Set<string>,
  individuals: Record<string, Individual>,
  unions: Record<string, Union>,
): Set<string> {
  const familyNames = new Set<string>();
  for (const nodeId of component) {
    const familyName = familyNameForNode(nodeId, individuals, unions);
    if (familyName) familyNames.add(familyName);
  }
  return familyNames;
}

/**
 * After hiding family branches, drop any remaining visible surnames that no
 * longer belong to the main connected tree (largest component, preferring the
 * one that contains founding ancestors).
 */
export function pruneOrphanedFamilyNames(
  visibleFamilyNames: Set<string>,
  edges: Edge[],
  individuals: Record<string, Individual>,
  unions: Record<string, Union>,
): Set<string> {
  if (visibleFamilyNames.size === 0) return visibleFamilyNames;

  const visibleEdges = edges.filter((edge) => {
    const familyName = edgeFamilyName(edge);
    return familyName !== null && visibleFamilyNames.has(familyName);
  });

  const adjacency = buildAdjacencyList(visibleEdges);
  const components = findConnectedComponents(adjacency);

  if (components.length <= 1) return visibleFamilyNames;

  const mainComponent = selectMainComponent(components, individuals);
  const connectedFamilyNames = familyNamesInComponent(
    mainComponent,
    individuals,
    unions,
  );

  const pruned = new Set<string>();
  for (const familyName of visibleFamilyNames) {
    if (connectedFamilyNames.has(familyName)) {
      pruned.add(familyName);
    }
  }
  return pruned;
}
