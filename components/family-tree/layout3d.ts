import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceZ,
  type SimulationLink,
  type SimulationNode,
} from "d3-force-3d";
import { individuals, unions } from "./familyGraph";

/**
 * A fresh, self-contained 3D layout for the family tree.
 *
 * The guiding idea: a generation is a *horizontal plane*. Every person in a
 * generation shares the same height (their plane's Y), and the only freedom is
 * where they sit *within* that plane (X / Z). A constrained force simulation
 * then spreads each plane out so relatives cluster together and the parent /
 * child / marriage links cross as little as possible — which is exactly the
 * thing that becomes impossible to achieve in a flat 2D drawing of a large
 * tree.
 *
 * Union ("marriage") nodes live on a half-plane between the partners' plane and
 * their children's plane, mirroring the floating marriage dot of the 2D view.
 *
 * This file is intentionally independent from the ELK-based 2D layout
 * (`elkLayout.ts`); the two are reconciled at the call site, not here.
 */

export type Node3DKind = "person" | "union";

/** A laid-out node. Coordinates use the three.js convention (Y is up). */
export type Layout3DNode = {
  id: string;
  kind: Node3DKind;
  /** Derived generation (smaller = older / closer to the top plane). */
  generation: number;
  x: number;
  y: number;
  z: number;
};

export type Link3DKind = "marriage" | "child";

export type Layout3DLink = {
  sourceId: string;
  targetId: string;
  kind: Link3DKind;
  /** Family name used to colour the link, matching the 2D edge colouring. */
  familyName: string;
};

/** One generation rendered as a translucent disc the nodes rest on. */
export type GenerationPlane = {
  generation: number;
  y: number;
  /** Radius of the populated area on this plane (for drawing the disc). */
  radius: number;
};

export type Layout3DResult = {
  nodes: Layout3DNode[];
  links: Layout3DLink[];
  planes: GenerationPlane[];
  bounds: {
    /** Largest horizontal distance of any node from the vertical axis. */
    radius: number;
    minY: number;
    maxY: number;
  };
};

export type Layout3DOptions = {
  /**
   * When provided, only these people (and the unions linking them) are laid
   * out. Left open for later reconciliation with the 2D focus/branch filters.
   */
  personIds?: Set<string>;
};

/** Vertical distance between two adjacent generation planes (world units). */
export const LAYER_HEIGHT = 78;
/** Collision radius for a person node (keeps cards from overlapping in-plane). */
const PERSON_COLLIDE = 17;
const UNION_COLLIDE = 7;
/** Rest length of the partner→marriage links (tight, so couples read as pairs). */
const MARRIAGE_DISTANCE = 13;
/** Rest length of the marriage→child links (spans one inter-plane gap). */
const CHILD_DISTANCE = 30;
/** Repulsion between every pair of nodes; spreads each plane outward. */
const CHARGE_STRENGTH = -140;
/** Gentle pull toward the central axis, so the cloud stays compact. */
const CENTERING_STRENGTH = 0.045;
/** Number of synchronous simulation steps. The sim is deterministic (seeded). */
const SIMULATION_TICKS = 600;

type SimNode = SimulationNode & {
  id: string;
  kind: Node3DKind;
  generation: number;
  /** Target plane height; pinned via `fy` so the node never leaves its plane. */
  planeY: number;
};

type SimLink = SimulationLink<SimNode> & {
  kind: Link3DKind;
  familyName: string;
};

function unionFamilyName(unionId: string): string {
  const union = unions[unionId];
  if (!union) return "UNKNOWN";
  const childFamily = union.childIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  if (childFamily) return childFamily;
  const partnerFamily = union.partnerIds
    .map((id) => individuals[id]?.familyName)
    .find(Boolean);
  return partnerFamily ?? "UNKNOWN";
}

/**
 * Build the node/link graph, run the constrained simulation, and return final
 * positions. Runs entirely synchronously and is cheap for the tree sizes we
 * deal with (hundreds of nodes), so callers can treat it as a pure function.
 */
export function computeLayout3D(options: Layout3DOptions = {}): Layout3DResult {
  const personFilter = options.personIds;
  const includesPerson = (id: string) =>
    (!personFilter || personFilter.has(id)) && Boolean(individuals[id]);

  // --- Generation → plane height -------------------------------------------
  const presentGenerations = new Set<number>();
  for (const person of Object.values(individuals)) {
    if (includesPerson(person.id)) presentGenerations.add(person.generation);
  }
  if (presentGenerations.size === 0) {
    return {
      nodes: [],
      links: [],
      planes: [],
      bounds: { radius: 1, minY: 0, maxY: 0 },
    };
  }
  const maxGen = Math.max(...presentGenerations);
  const minGen = Math.min(...presentGenerations);
  // Centre the stack vertically around y = 0 and put older generations on top
  // (larger Y), so the tree reads ancestors-up like the 2D view.
  const midGen = (maxGen + minGen) / 2;
  const planeY = (generation: number) => (midGen - generation) * LAYER_HEIGHT;
  // Unions sit halfway between their partners' plane and their children's.
  const unionPlaneY = (generation: number) => planeY(generation) - LAYER_HEIGHT / 2;

  // --- Nodes ----------------------------------------------------------------
  const nodes: SimNode[] = [];
  const nodeById = new Map<string, SimNode>();

  const addNode = (id: string, kind: Node3DKind, generation: number, y: number) => {
    if (nodeById.has(id)) return;
    const node: SimNode = { id, kind, generation, planeY: y, fy: y };
    nodes.push(node);
    nodeById.set(id, node);
  };

  for (const person of Object.values(individuals)) {
    if (!includesPerson(person.id)) continue;
    addNode(person.id, "person", person.generation, planeY(person.generation));
  }

  const includedUnions = Object.values(unions).filter((union) => {
    const partners = union.partnerIds.filter(includesPerson);
    const children = union.childIds.filter(includesPerson);
    // Keep a union only when it actually connects two visible nodes.
    return partners.length + children.length >= 2 || partners.length >= 1;
  });

  for (const union of includedUnions) {
    addNode(union.id, "union", union.generation, unionPlaneY(union.generation));
  }

  // --- Links ----------------------------------------------------------------
  const links: SimLink[] = [];
  for (const union of includedUnions) {
    const familyName = unionFamilyName(union.id);
    for (const partnerId of union.partnerIds) {
      if (!nodeById.has(partnerId) || !nodeById.has(union.id)) continue;
      links.push({ source: partnerId, target: union.id, kind: "marriage", familyName });
    }
    for (const childId of union.childIds) {
      if (!nodeById.has(childId) || !nodeById.has(union.id)) continue;
      links.push({ source: union.id, target: childId, kind: "child", familyName });
    }
  }

  // --- Deterministic initial spread -----------------------------------------
  // Seed each node on a spiral within its plane (grouped by generation), so the
  // simulation starts from an already-spread state and converges to a tidy,
  // repeatable result instead of unwinding from a single clump.
  const perGenerationCount = new Map<number, number>();
  const angleStep = Math.PI * (3 - Math.sqrt(5)); // golden-angle spiral
  for (const node of nodes) {
    const key = node.kind === "union" ? node.generation + 0.5 : node.generation;
    const i = perGenerationCount.get(key) ?? 0;
    perGenerationCount.set(key, i + 1);
    const radius = 12 + 11 * Math.sqrt(i);
    const angle = i * angleStep + key * 1.7;
    node.x = radius * Math.cos(angle);
    node.z = radius * Math.sin(angle);
    node.y = node.planeY;
  }

  // --- Constrained force simulation -----------------------------------------
  const simulation = forceSimulation<SimNode>(nodes, 3)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((node) => node.id)
        .distance((link) =>
          link.kind === "marriage" ? MARRIAGE_DISTANCE : CHILD_DISTANCE,
        )
        .strength((link) => (link.kind === "marriage" ? 0.9 : 0.5)),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength(CHARGE_STRENGTH).distanceMax(420),
    )
    .force(
      "collide",
      forceCollide<SimNode>((node) =>
        node.kind === "person" ? PERSON_COLLIDE : UNION_COLLIDE,
      ).iterations(2),
    )
    .force("x", forceX<SimNode>(0).strength(CENTERING_STRENGTH))
    .force("z", forceZ<SimNode>(0).strength(CENTERING_STRENGTH))
    .stop();

  for (let i = 0; i < SIMULATION_TICKS; i++) simulation.tick();

  // --- Collect results ------------------------------------------------------
  const resultNodes: Layout3DNode[] = nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    generation: node.generation,
    x: node.x ?? 0,
    y: node.planeY,
    z: node.z ?? 0,
  }));

  const resultLinks: Layout3DLink[] = links.map((link) => ({
    sourceId: typeof link.source === "object" ? link.source.id : String(link.source),
    targetId: typeof link.target === "object" ? link.target.id : String(link.target),
    kind: link.kind,
    familyName: link.familyName,
  }));

  // Per-plane radius (for the translucent generation discs) and overall bounds.
  const planeRadius = new Map<number, number>();
  let boundsRadius = 1;
  for (const node of resultNodes) {
    if (node.kind !== "person") continue;
    const r = Math.hypot(node.x, node.z);
    boundsRadius = Math.max(boundsRadius, r);
    planeRadius.set(node.generation, Math.max(planeRadius.get(node.generation) ?? 0, r));
  }

  const planes: GenerationPlane[] = [...presentGenerations]
    .sort((a, b) => a - b)
    .map((generation) => ({
      generation,
      y: planeY(generation),
      radius: (planeRadius.get(generation) ?? 30) + PERSON_COLLIDE * 1.5,
    }));

  return {
    nodes: resultNodes,
    links: resultLinks,
    planes,
    bounds: {
      radius: boundsRadius,
      minY: planeY(maxGen),
      maxY: planeY(minGen),
    },
  };
}
