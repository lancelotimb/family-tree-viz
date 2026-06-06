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
  {
    stroke: "#7a5a8e",
    border: "#9878a8",
    background: "#eee4f2",
    text: "#4a3858",
  },
  {
    stroke: "#4a7a62",
    border: "#6a9880",
    background: "#e0ede8",
    text: "#304840",
  },
  {
    stroke: "#5a6898",
    border: "#7a88b8",
    background: "#e4eaf2",
    text: "#384058",
  },
  {
    stroke: "#b0a038",
    border: "#ccbc58",
    background: "#f6f0d8",
    text: "#605820",
  },
  {
    stroke: "#8a4858",
    border: "#aa6878",
    background: "#f0e4e8",
    text: "#503038",
  },
  {
    stroke: "#58a088",
    border: "#78c0a8",
    background: "#e4f2ee",
    text: "#385850",
  },
  {
    stroke: "#6878b8",
    border: "#8898d0",
    background: "#e8ecf5",
    text: "#485068",
  },
  {
    stroke: "#784838",
    border: "#986858",
    background: "#f0e8e4",
    text: "#482c20",
  },
  {
    stroke: "#489088",
    border: "#68b0a8",
    background: "#e0f0ee",
    text: "#305850",
  },
  {
    stroke: "#9878b0",
    border: "#b898cc",
    background: "#eee8f2",
    text: "#584868",
  },
  {
    stroke: "#788a50",
    border: "#98aa70",
    background: "#eceee4",
    text: "#485038",
  },
  {
    stroke: "#506890",
    border: "#7088b0",
    background: "#e4eaf0",
    text: "#384058",
  },
  {
    stroke: "#a06840",
    border: "#c08860",
    background: "#f5ece4",
    text: "#603820",
  },
  {
    stroke: "#a06090",
    border: "#c080b0",
    background: "#f2e8f0",
    text: "#603850",
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
