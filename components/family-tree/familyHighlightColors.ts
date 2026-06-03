/** Family hover (blue) and ancestry-path (green) — shared visual language. */
export const familyHighlight = {
  hover: {
    primary: {
      border: "#4a7fc4",
      stroke: "#3568a8",
      text: "#2d5270",
      background: "#e3effa",
      marriageBorder: "#4a7fc4",
      marriageFill: "#c8ddf2",
    },
    related: {
      border: "#6a9fd4",
      stroke: "#5080b0",
      text: "#3a6080",
      background: "#ebf3fc",
      marriageBorder: "#6a9fd4",
      marriageFill: "#d4e6f6",
    },
    edge: "#5a94cc",
    edgeWidth: 3,
  },
  path: {
    related: {
      border: "#6aad7e",
      stroke: "#4d8f62",
      text: "#3a6b48",
      background: "#e6f4ea",
      marriageBorder: "#6aad7e",
      marriageFill: "#c8e6d0",
    },
    edge: "#5a9e72",
    edgeWidth: 3,
  },
} as const;
