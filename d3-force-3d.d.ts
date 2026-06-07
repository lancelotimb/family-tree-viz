/**
 * Minimal type declarations for `d3-force-3d` (the package ships no types).
 * Only the subset of the API used by the 3D family-tree layout is described.
 */
declare module "d3-force-3d" {
  export interface SimulationNode {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLink<N extends SimulationNode> {
    source: string | number | N;
    target: string | number | N;
  }

  export interface Force {
    (alpha: number): void;
    initialize?: (nodes: SimulationNode[], random: () => number, nDim: number) => void;
  }

  export interface Simulation<N extends SimulationNode> {
    tick(iterations?: number): this;
    nodes(): N[];
    nodes(nodes: N[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(min: number): this;
    alphaDecay(decay: number): this;
    alphaTarget(target: number): this;
    velocityDecay(decay: number): this;
    force(name: string): Force | undefined;
    force(name: string, force: Force | null): this;
    stop(): this;
    restart(): this;
    on(typenames: string, listener: (() => void) | null): this;
  }

  export function forceSimulation<N extends SimulationNode>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N>;

  export interface LinkForce<N extends SimulationNode, L extends SimulationLink<N>>
    extends Force {
    links(): L[];
    links(links: L[]): this;
    id(id: (node: N, i: number, nodes: N[]) => string | number): this;
    distance(distance: number | ((link: L, i: number, links: L[]) => number)): this;
    strength(strength: number | ((link: L, i: number, links: L[]) => number)): this;
    iterations(iterations: number): this;
  }

  export function forceLink<N extends SimulationNode, L extends SimulationLink<N>>(
    links?: L[],
  ): LinkForce<N, L>;

  export interface ManyBodyForce<N extends SimulationNode> extends Force {
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
    distanceMin(distance: number): this;
    distanceMax(distance: number): this;
    theta(theta: number): this;
  }

  export function forceManyBody<N extends SimulationNode>(): ManyBodyForce<N>;

  export interface CollideForce<N extends SimulationNode> extends Force {
    radius(radius: number | ((node: N, i: number, nodes: N[]) => number)): this;
    strength(strength: number): this;
    iterations(iterations: number): this;
  }

  export function forceCollide<N extends SimulationNode>(
    radius?: number | ((node: N, i: number, nodes: N[]) => number),
  ): CollideForce<N>;

  export interface PositionForce<N extends SimulationNode> extends Force {
    x?(x: number | ((node: N, i: number, nodes: N[]) => number)): this;
    y?(y: number | ((node: N, i: number, nodes: N[]) => number)): this;
    z?(z: number | ((node: N, i: number, nodes: N[]) => number)): this;
    strength(strength: number | ((node: N, i: number, nodes: N[]) => number)): this;
  }

  export function forceX<N extends SimulationNode>(
    x?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;
  export function forceY<N extends SimulationNode>(
    y?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;
  export function forceZ<N extends SimulationNode>(
    z?: number | ((node: N, i: number, nodes: N[]) => number),
  ): PositionForce<N>;

  export function forceCenter(x?: number, y?: number, z?: number): Force;

  export function forceRadial<N extends SimulationNode>(
    radius: number | ((node: N, i: number, nodes: N[]) => number),
    x?: number,
    y?: number,
    z?: number,
  ): Force;
}
