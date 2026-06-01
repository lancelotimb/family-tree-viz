import type { Edge } from "@xyflow/react";

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
