export type GedcomTextNode = {
  tag: string;
  value?: string;
  children: GedcomTextNode[];
};

/** Parse GEDCOM NOTE/TITL value with CONC/CONT continuations into a single string. */
export function parseMultilineText(node: GedcomTextNode | undefined): string {
  if (!node) return "";
  let text = node.value ?? "";
  for (const child of node.children) {
    if (child.tag === "CONC") text += child.value ?? "";
    if (child.tag === "CONT") text += `\n${child.value ?? ""}`;
  }
  return text;
}

/** Emit a GEDCOM text tag with CONT lines for each additional line break. */
export function writeMultilineText(
  lines: string[],
  level: number,
  tag: string,
  text: string,
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const parts = trimmed.split("\n");
  const first = parts[0] ?? "";
  lines.push(`${level} ${tag} ${first}`);
  for (let i = 1; i < parts.length; i++) {
    lines.push(`${level + 1} CONT ${parts[i]}`);
  }
}
