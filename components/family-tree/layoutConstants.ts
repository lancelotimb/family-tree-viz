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

/**
 * How far the marriage anchor dot drops below the top of a grouped couple. Puts
 * the dot in the band between the partners and their children, centered in the
 * inter-layer gap.
 */
export const COUPLE_UNION_DROP = NODE_HEIGHT + (LAYER_GAP - UNION_SIZE) / 2;

/** Multiplier per zoom-in/out button press (React Flow scroll default is ~1.2). */
export const ZOOM_STEP = 1.7;
/** Minimum scale — low enough for wide trees, but not so far that the canvas feels empty. */
export const MIN_ZOOM = 0.02;
export const MAX_ZOOM = 1.8;
