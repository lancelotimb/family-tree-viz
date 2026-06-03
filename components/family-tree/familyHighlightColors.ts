/** Family hover (blue) and ancestry-path (green) — shared visual language. */
export const familyHighlight = {
  hover: {
    primary: {
      border: "#3d75c0",
      stroke: "#2d5fa0",
      text: "#254f68",
      background: "#dceaf8",
      marriageBorder: "#3d75c0",
      marriageFill: "#b8d4f0",
    },
    related: {
      border: "#5a94d0",
      stroke: "#4578b5",
      text: "#325878",
      background: "#e5f1fb",
      marriageBorder: "#5a94d0",
      marriageFill: "#c0daf2",
    },
    edge: "#4a8ac8",
    edgeWidth: 3,
  },
  path: {
    related: {
      border: "#52a56a",
      stroke: "#3d8750",
      text: "#326840",
      background: "#dcf0e2",
      marriageBorder: "#52a56a",
      marriageFill: "#b4dfc0",
    },
    edge: "#48a066",
    edgeWidth: 3,
  },
} as const;
