export const NODE_WIDTH = 200;
/**
 * Fixed height of every person card. Sized to hold the avatar, a two-line
 * (clamped) name, and the lifespan, so all nodes are uniform regardless of name
 * length. Kept in sync with the card markup in `FamilyMemberNode`.
 */
export const NODE_HEIGHT = 150;
export const UNION_SIZE = 28;
export const H_GAP = 80;
export const V_GAP = 140;

/**
 * Horizontal gap between the two partner cards of a couple that ELK lays out as
 * a single combined node. Kept small so spouses read as a tight pair.
 */
export const COUPLE_INNER_GAP = 56;

/** Width of the combined couple node handed to ELK (two cards + inner gap). */
export const COUPLE_WIDTH = NODE_WIDTH * 2 + COUPLE_INNER_GAP;

/**
 * Vertical spacing reserved between generation layers. Large enough to fit the
 * marriage anchor dot (which sits just below the couple) and its child edges.
 */
export const LAYER_GAP = 152;

/** Compact person card used when "Show names only" is enabled. */
export const COMPACT_NODE_WIDTH = 180;
export const COMPACT_NODE_HEIGHT = 32;
export const COMPACT_COUPLE_INNER_GAP = 24;
export const COMPACT_LAYER_GAP = 116;

export type LayoutMetrics = {
  nodeWidth: number;
  nodeHeight: number;
  coupleInnerGap: number;
  coupleWidth: number;
  layerGap: number;
};

export function getLayoutMetrics(showNamesOnly: boolean): LayoutMetrics {
  if (showNamesOnly) {
    const coupleWidth = COMPACT_NODE_WIDTH * 2 + COMPACT_COUPLE_INNER_GAP;
    return {
      nodeWidth: COMPACT_NODE_WIDTH,
      nodeHeight: COMPACT_NODE_HEIGHT,
      coupleInnerGap: COMPACT_COUPLE_INNER_GAP,
      coupleWidth,
      layerGap: COMPACT_LAYER_GAP,
    };
  }
  return {
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    coupleInnerGap: COUPLE_INNER_GAP,
    coupleWidth: COUPLE_WIDTH,
    layerGap: LAYER_GAP,
  };
}

/**
 * How far the marriage anchor dot drops below the top of a grouped couple. Puts
 * the dot in the band between the partners and their children, centered in the
 * inter-layer gap.
 */
export const COUPLE_UNION_DROP = NODE_HEIGHT + (LAYER_GAP - UNION_SIZE) / 2;

/** Multiplier per zoom-in/out button press (React Flow scroll default is ~1.2). */
export const ZOOM_STEP = 1.7;
/** Minimum scale — prevents zooming out so far that the tree becomes tiny. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 1.8;

/** Zoom level when centering on a single person (search, profile relatives). */
export const PERSON_FOCUS_ZOOM = 1.4;
export const PERSON_FOCUS_DURATION_MS = 500;
