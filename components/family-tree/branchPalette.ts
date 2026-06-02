export type BranchColor = {
  stroke: string;
  border: string;
  background: string;
  text: string;
};

export type FamilyBranch = {
  familyName: string;
  count: number;
  color: BranchColor;
};

export const branchPalette: BranchColor[] = [
  {
    stroke: "#a96f46",
    border: "#c98b63",
    background: "#f7eadf",
    text: "#704326",
  },
  {
    stroke: "#8d7f45",
    border: "#b2a562",
    background: "#f1edd9",
    text: "#5f552b",
  },
  {
    stroke: "#7c8f68",
    border: "#9daf83",
    background: "#edf2e4",
    text: "#53613e",
  },
  {
    stroke: "#b07a6e",
    border: "#c99588",
    background: "#f5e8e3",
    text: "#754f48",
  },
  {
    stroke: "#6f8f88",
    border: "#8fb0aa",
    background: "#e8f0ed",
    text: "#49615d",
  },
  {
    stroke: "#9a7b9a",
    border: "#b596b5",
    background: "#f0e8f0",
    text: "#664f66",
  },
  {
    stroke: "#b48a4a",
    border: "#d0a865",
    background: "#f7edda",
    text: "#74572d",
  },
  {
    stroke: "#8a7260",
    border: "#ad927c",
    background: "#f0e8e1",
    text: "#5e4b3e",
  },
  {
    stroke: "#7f90a8",
    border: "#9caec4",
    background: "#e9edf4",
    text: "#536278",
  },
  {
    stroke: "#9c6d5d",
    border: "#be8d7d",
    background: "#f4e7e1",
    text: "#694638",
  },
];

function hashFamilyName(familyName: string): number {
  let hash = 0;
  for (let i = 0; i < familyName.length; i++) {
    hash = (hash * 31 + familyName.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function colorForFamilyName(familyName: string): BranchColor {
  const index = hashFamilyName(familyName) % branchPalette.length;
  return branchPalette[index];
}
