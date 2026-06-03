/** Family hover (blue) and ancestry-path (green) — shared visual language. */
export const familyHighlight = {
  hover: {
    primary: {
      border: "#5d8eb8",
      stroke: "#4a7399",
      text: "#3d5f78",
      background: "#eef4fa",
      marriageBorder: "#5d8eb8",
      marriageFill: "#d8e8f4",
    },
    related: {
      border: "#8eb0d4",
      stroke: "#6d94b5",
      text: "#4d6d88",
      background: "#f4f8fc",
      marriageBorder: "#8eb0d4",
      marriageFill: "#e4eef6",
    },
    edge: "#7ba3c9",
    edgeWidth: 3,
  },
  path: {
    related: {
      border: "#8eb89e",
      stroke: "#6d947d",
      text: "#4d6d58",
      background: "#f2f8f4",
      marriageBorder: "#8eb89e",
      marriageFill: "#dce8e0",
    },
    edge: "#7ba88a",
    edgeWidth: 3,
  },
} as const;
