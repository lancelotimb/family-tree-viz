/** Ancestry-path highlight — muted for path nodes, warm accent for hover/selection. */
export const pathHighlight = {
  muted: {
    border: "#b8cdb2",
    stroke: "#a3b89e",
    text: "#6a7d66",
    marriageBorder: "#b8cdb2",
    marriageFill: "#dce8d8",
    edge: "#b8cdb2",
    edgeWidth: 2,
  },
  focus: {
    border: "#c4a574",
    stroke: "#a68b58",
    text: "#5e5038",
    marriageBorder: "#c4a574",
    marriageFill: "#ebe2d0",
    edge: "#c4a574",
    edgeWidth: 2.5,
  },
} as const;
