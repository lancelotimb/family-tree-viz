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
  COUPLE_WIDTH,
  H_GAP,
  LAYER_GAP,
  NODE_HEIGHT,
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

type Interval = [number, number];

/** Intersection of two ascending, non-overlapping interval lists. */
function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (lo <= hi) out.push([lo, hi]);
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return out;
}

/**
 * Place a box of width `w` as close to `desired` (a left-edge x) as possible
 * without overlapping any `others` interval, keeping `gap` clearance. `others`
 * must be ascending.
 */
function nearestFreeX(
  desired: number,
  w: number,
  others: Interval[],
  gap: number,
): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  let prevHi = -Infinity;
  for (let i = 0; i <= others.length; i++) {
    const curLo = i < others.length ? others[i][0] : Infinity;
    const gapLo = prevHi === -Infinity ? -Infinity : prevHi + gap;
    const gapHi = curLo === Infinity ? Infinity : curLo - gap;
    if (gapHi - gapLo >= w) {
      const lo = gapLo;
      const hi = Number.isFinite(gapHi) ? gapHi - w : Infinity;
      const cand = Math.max(
        Number.isFinite(lo) ? lo : -Infinity,
        Math.min(Number.isFinite(hi) ? hi : Infinity, desired),
      );
      const resolved = Number.isFinite(cand) ? cand : desired;
      const dist = Math.abs(resolved - desired);
      if (dist < bestDist) {
        bestDist = dist;
        best = resolved;
      }
    }
    if (i < others.length) prevHi = Math.max(prevHi, others[i][1]);
  }
  return best;
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
 * center is closest, keeping the result near ELK's arrangement.
 *
 * Married-in spouses from a *loose* union (a remarriage that wasn't merged into
 * a combined couple box) have no parents of their own, so on their own they
 * would look like independent roots and get packed next to the founding
 * ancestors. We detect them as "satellites" of their anchored partner and slide
 * them along beside that partner after centering.
 *
 * When one child's subtree dwarfs its siblings (a brother with a huge line of
 * descendants next to childless/small siblings), the small siblings otherwise
 * end up stranded at the far edge of the big fan, far from their sibling and
 * joined by a very long edge. `tuckMinorSiblings` pulls those small subtrees
 * back in next to the dominant sibling, slotting them into the open space in its
 * upper generations. It only ever moves a subtree into a position free of node
 * overlaps; descendant *edges* of the big sibling may cross over the tucked-in
 * siblings, which is the accepted trade-off for keeping siblings together.
 * Afterwards `reCenterParents` nudges any parent left stranded well off to the
 * side of its (now moved) children back over their midpoint.
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
  // laid out.
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
  // union, sits in an anchored box. Such spouses should follow their partner.
  const satelliteAnchor = new Map<string, string>();
  for (const id of positions.keys()) {
    if (parentsOf.has(id)) continue;
    const person = individuals[id];
    if (!person) continue;
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
    if (matching.length !== 1) return null;

    const box = parentBoxOfPerson(matching[0]);
    if (box && !satelliteAnchor.has(box) && pool.includes(box)) return box;
    return null;
  };

  // Each box keeps one primary parent. Couples prefer their blood-line side;
  // everything else takes the horizontally closest parent.
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
  for (const [satellite] of satelliteAnchor) {
    if ((primaryChildren.get(satellite)?.length ?? 0) > 0) {
      satelliteAnchor.delete(satellite);
    }
  }
  for (const kids of primaryChildren.values()) {
    kids.sort((a, b) => currentX(a) - currentX(b));
  }

  const anchorToSatellites = new Map<string, string[]>();
  for (const [sat, anchor] of satelliteAnchor) {
    const arr = anchorToSatellites.get(anchor);
    if (arr) arr.push(sat);
    else anchorToSatellites.set(anchor, [sat]);
  }

  const newX = new Map<string, number>();
  // Full set of boxes in each node's subtree (the node plus all descendants),
  // captured during the walk so the tuck pass can move a whole subtree as a unit.
  const subtreeOf = new Map<string, string[]>();

  const layoutSubtree = (
    node: string,
  ): { contour: Contour; members: string[] } => {
    const layer = layerOf.get(node) ?? 0;
    const w = width(node);
    const kids = primaryChildren.get(node) ?? [];

    if (kids.length === 0) {
      newX.set(node, 0);
      subtreeOf.set(node, [node]);
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

    const center = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    newX.set(node, center - w / 2);
    mergeContour(
      accum,
      new Map([[layer, { min: center - w / 2, max: center + w / 2 }]]),
    );
    members.push(node);
    subtreeOf.set(node, members);

    return { contour: accum, members };
  };

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

  for (const [satellite, anchor] of satelliteAnchor) {
    const anchorNew = newX.get(anchor);
    if (anchorNew === undefined) continue;
    const delta = anchorNew - currentX(anchor);
    newX.set(satellite, currentX(satellite) + delta);
  }

  tuckMinorSiblings();
  reCenterParents();

  for (const [id, x] of newX) {
    const pos = positions.get(id);
    if (pos) pos.x = x;
  }

  /** Boxes (excluding `exclude`) currently occupying a given generation layer. */
  function occupantsAtLayer(layer: number, exclude?: Set<string>): Interval[] {
    const out: Interval[] = [];
    for (const b of positions.keys()) {
      if (exclude?.has(b)) continue;
      if ((layerOf.get(b) ?? 0) !== layer) continue;
      const lo = newX.get(b);
      if (lo === undefined) continue;
      out.push([lo, lo + width(b)]);
    }
    out.sort((p, q) => p[0] - q[0]);
    return out;
  }

  /**
   * Pull each parent's much-smaller child subtrees in next to its dominant
   * child, slotting them into the free space in the dominant child's upper
   * generations. Only node-overlap-free placements are used.
   */
  function tuckMinorSiblings(): void {
    const DOMINANT_MIN = 6; // dominant subtree must be at least this many boxes
    const RATIO = 3; // a minor subtree is at most 1/RATIO of the dominant size

    const moveSubtree = (members: string[], delta: number) => {
      for (const b of members) newX.set(b, (newX.get(b) ?? 0) + delta);
    };

    // Process shallow parents first so large upper structures settle before
    // their descendants are considered.
    const parents = [...primaryChildren.keys()]
      .filter((p) => (primaryChildren.get(p)?.length ?? 0) >= 2)
      .sort((a, b) => (layerOf.get(a) ?? 0) - (layerOf.get(b) ?? 0));

    for (const parent of parents) {
      const kids = primaryChildren.get(parent)!;
      const sized = kids.map((k) => ({ k, size: subtreeOf.get(k)?.length ?? 1 }));
      const dominant = sized.reduce((a, b) => (b.size > a.size ? b : a));
      if (dominant.size < DOMINANT_MIN) continue;

      const domX = newX.get(dominant.k) ?? 0;
      const domW = width(dominant.k);

      const minors = sized
        .filter((s) => s.k !== dominant.k && s.size * RATIO <= dominant.size)
        .sort(
          (a, b) =>
            Math.abs((newX.get(a.k) ?? 0) - domX) -
            Math.abs((newX.get(b.k) ?? 0) - domX),
        );
      if (minors.length === 0) continue;

      for (const minor of minors) {
        const members = subtreeOf.get(minor.k) ?? [minor.k];
        const memberSet = new Set(members);
        const mRootX = newX.get(minor.k) ?? 0;
        const mRootW = width(minor.k);
        const isLeft = mRootX < domX;

        // Per-layer footprint of the moving subtree.
        const foot = new Map<number, { lo: number; hi: number }>();
        for (const b of members) {
          const L = layerOf.get(b) ?? 0;
          const lo = newX.get(b) ?? 0;
          const hi = lo + width(b);
          const f = foot.get(L);
          if (!f) foot.set(L, { lo, hi });
          else {
            f.lo = Math.min(f.lo, lo);
            f.hi = Math.max(f.hi, hi);
          }
        }

        // Feasible translations: a delta that keeps every layer's footprint
        // inside a gap (with `gap` clearance) of the other boxes on that layer.
        let feasible: Interval[] | null = null;
        for (const [L, f] of foot) {
          const others = occupantsAtLayer(L, memberSet);
          const w = f.hi - f.lo;
          const allowed: Interval[] = [];
          let prevHi = -Infinity;
          for (let i = 0; i <= others.length; i++) {
            const curLo = i < others.length ? others[i][0] : Infinity;
            const gapLo = prevHi === -Infinity ? -Infinity : prevHi + gap;
            const gapHi = curLo === Infinity ? Infinity : curLo - gap;
            if (gapHi - gapLo >= w) {
              const dLo = gapLo === -Infinity ? -Infinity : gapLo - f.lo;
              const dHi = gapHi === Infinity ? Infinity : gapHi - f.hi;
              allowed.push([dLo, dHi]);
            }
            if (i < others.length) prevHi = Math.max(prevHi, others[i][1]);
          }
          feasible = feasible === null ? allowed : intersectIntervals(feasible, allowed);
          if (feasible.length === 0) break;
        }
        if (!feasible || feasible.length === 0) continue;

        // Desired: minor's near edge just beside the dominant child's trunk.
        const desiredDelta = isLeft
          ? domX - gap - (mRootX + mRootW)
          : domX + domW + gap - mRootX;

        let bestDelta: number | null = null;
        let bestDist = Infinity;
        for (const [lo, hi] of feasible) {
          const cand = Math.max(lo, Math.min(hi, desiredDelta));
          if (!Number.isFinite(cand)) continue;
          const dist = Math.abs(cand - desiredDelta);
          if (dist < bestDist) {
            bestDist = dist;
            bestDelta = cand;
          }
        }
        if (bestDelta === null) continue;
        // Only tuck inward (toward the dominant sibling).
        if (isLeft && bestDelta <= 0) continue;
        if (!isLeft && bestDelta >= 0) continue;

        moveSubtree(members, bestDelta);
      }
    }
  }

  /**
   * Tucking moves a parent's minor children far toward the dominant sibling,
   * which can leave the parent itself stranded well off to the side of its
   * children. Slide such a parent (and any satellite spouses anchored to it)
   * back over the midpoint of its children, to the nearest spot free of overlaps
   * on the parent's row. We only touch parents that are badly off-center, so
   * well-placed parents (and the dominant trunk lines) are left untouched and
   * the layout doesn't re-flow.
   */
  function reCenterParents(): void {
    // Tolerate the small natural offset between a couple's dot and its
    // children's midpoint; only correct genuinely stranded parents.
    const THRESHOLD = COUPLE_WIDTH; // ~ a couple's width

    const parents = [...primaryChildren.keys()]
      .filter((p) => (primaryChildren.get(p)?.length ?? 0) > 0)
      .sort((a, b) => (layerOf.get(b) ?? 0) - (layerOf.get(a) ?? 0)); // deepest first

    for (const parent of parents) {
      const kids = primaryChildren.get(parent)!;
      const centers = kids.map((k) => (newX.get(k) ?? 0) + width(k) / 2);
      const mid = (Math.min(...centers) + Math.max(...centers)) / 2;
      const w = width(parent);
      const curCenter = (newX.get(parent) ?? 0) + w / 2;
      if (Math.abs(curCenter - mid) <= THRESHOLD) continue;

      const sats = anchorToSatellites.get(parent) ?? [];
      const exclude = new Set<string>([parent, ...sats]);
      const others = occupantsAtLayer(layerOf.get(parent) ?? 0, exclude);
      const placed = nearestFreeX(mid - w / 2, w, others, gap);
      if (placed === null) continue;
      const delta = placed - (newX.get(parent) ?? 0);
      if (delta === 0) continue;
      newX.set(parent, placed);
      for (const s of sats) newX.set(s, (newX.get(s) ?? 0) + delta);
    }
  }
}

/**
 * For every union with exactly one laid-out child, slide the parents (their
 * partner cards and marriage dot) horizontally so the dot sits directly above
 * that child's own card — not above the midpoint of the child and their spouse.
 * Processed deepest-child-first so a chain of single children lines up, and only
 * applied when the parents stay clear of other cards on their row.
 */
function alignSingleChildParents(positions: Map<string, LayoutPosition>): void {
  const gap = H_GAP;

  const onlyChildUnions = Object.values(unions)
    .map((u) => ({
      u,
      kids: u.childIds.filter((c) => positions.has(c)),
      partners: u.partnerIds.filter((p) => positions.has(p)),
    }))
    .filter((e) => e.kids.length === 1 && e.partners.length > 0);

  // Deepest child first, so single-child chains settle bottom-up.
  onlyChildUnions.sort(
    (a, b) => positions.get(b.kids[0])!.y - positions.get(a.kids[0])!.y,
  );

  for (const { u, kids, partners } of onlyChildUnions) {
    // Skip if a parent belongs to another laid-out union (e.g. a remarriage);
    // moving them would disturb that union.
    const entangled = partners.some(
      (p) =>
        (individuals[p]?.fams ?? []).filter(
          (f) => f !== u.id && positions.has(f),
        ).length > 0,
    );
    if (entangled) continue;

    const child = kids[0];
    const dot = positions.get(u.id);
    const targetX = positions.get(child)!.x + NODE_WIDTH / 2;
    const parentCenter = dot
      ? dot.x + UNION_SIZE / 2
      : average(partners.map((p) => positions.get(p)!.x + NODE_WIDTH / 2));
    const desired = targetX - parentCenter;
    if (Math.abs(desired) < 1) continue;

    // Footprint of the parent cards and the other cards sharing their row.
    const y = Math.round(positions.get(partners[0])!.y);
    const lefts = partners.map((p) => positions.get(p)!.x);
    const lo = Math.min(...lefts);
    const hi = Math.max(...lefts) + NODE_WIDTH;
    const partnerSet = new Set(partners);
    const others: Interval[] = [];
    for (const [id, p] of positions) {
      if (!individuals[id] || partnerSet.has(id)) continue;
      if (Math.round(p.y) !== y) continue;
      others.push([p.x, p.x + NODE_WIDTH]);
    }
    others.sort((a, b) => a[0] - b[0]);

    const placedLeft = nearestFreeX(lo + desired, hi - lo, others, gap);
    if (placedLeft === null) continue;
    const applied = placedLeft - lo;
    // Only move if it brings the parents closer to sitting over the child.
    if (
      Math.abs(parentCenter + applied - targetX) >=
      Math.abs(parentCenter - targetX)
    ) {
      continue;
    }

    for (const p of partners) positions.get(p)!.x += applied;
    if (dot) dot.x += applied;
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
  const focusedLayout = Boolean(options.personIds);
  const layerSpacing = focusedLayout
    ? Math.max(Math.round(LAYER_GAP * 0.72), NODE_HEIGHT + UNION_SIZE + 20)
    : LAYER_GAP;
  const nodeSpacing = focusedLayout ? 38 : 55;
  const unionDrop = NODE_HEIGHT + (layerSpacing - UNION_SIZE) / 2;
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
      "elk.layered.spacing.nodeNodeBetweenLayers": String(layerSpacing),
      "elk.spacing.nodeNode": String(nodeSpacing),
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
      y: combined.y + unionDrop,
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
      y: topY + unionDrop,
    });
  }

  // Optional refinement: when parents have a single child, slide the parents so
  // their marriage dot sits directly over that child's card (rather than over
  // the midpoint of the child and their spouse). Runs on the expanded cards.
  if (options.centerParentsOverChildren) {
    alignSingleChildParents(positions);
  }

  return positions;
}
