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
    stroke: "#b5764a",
    border: "#d49158",
    background: "#f8ebe0",
    text: "#6b3f22",
  },
  {
    stroke: "#978742",
    border: "#bcae58",
    background: "#f2eed8",
    text: "#5a501f",
  },
  {
    stroke: "#6f9160",
    border: "#96b07a",
    background: "#edf3e2",
    text: "#4d5c36",
  },
  {
    stroke: "#ba7468",
    border: "#d49182",
    background: "#f6e9e4",
    text: "#704842",
  },
  {
    stroke: "#659890",
    border: "#86b5ad",
    background: "#e7f1ee",
    text: "#435c58",
  },
  {
    stroke: "#a374a3",
    border: "#bd91bd",
    background: "#f1e9f1",
    text: "#604760",
  },
  {
    stroke: "#c08e42",
    border: "#dcb062",
    background: "#f8eedb",
    text: "#6f501f",
  },
  {
    stroke: "#946e58",
    border: "#b89178",
    background: "#f1e9e2",
    text: "#584536",
  },
  {
    stroke: "#778eaf",
    border: "#94b0cb",
    background: "#e8edf5",
    text: "#4d5c72",
  },
  {
    stroke: "#a66856",
    border: "#c88876",
    background: "#f5e8e2",
    text: "#633f30",
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
