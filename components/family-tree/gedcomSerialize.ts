import type { FamilyGraph, Individual, LifeEvent, Union } from "./types";

const DEFAULT_HEAD = `0 HEAD
1 SOUR family-tree-viz
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8`;

/** Preserve the HEAD block from an existing GEDCOM file when re-serializing. */
export function extractGedcomHead(text: string): string {
  const match = text.match(/^0 @.+ (INDI|FAM)/m);
  if (!match || match.index === undefined) return DEFAULT_HEAD;
  const head = text.slice(0, match.index).trimEnd();
  return head || DEFAULT_HEAD;
}

function pointer(id: string): string {
  return `@${id}@`;
}

function formatGedcomName(individual: Individual): string {
  const given = individual.middleNames
    ? `${individual.firstName} ${individual.middleNames}`
    : individual.firstName;
  return `${given} /${individual.familyName}/`;
}

function writeLifeEvent(lines: string[], level: number, tag: string, event: LifeEvent | null) {
  if (!event) return;
  const hasDate = event.year !== null;
  const hasPlace = Boolean(event.place?.trim());
  if (!hasDate && !hasPlace) return;

  lines.push(`${level} ${tag}`);
  if (hasDate) lines.push(`${level + 1} DATE ${event.year}`);
  if (hasPlace) lines.push(`${level + 1} PLAC ${event.place!.trim()}`);
}

function writeIndividual(lines: string[], individual: Individual) {
  lines.push(`0 ${pointer(individual.id)} INDI`);
  lines.push(`1 NAME ${formatGedcomName(individual)}`);
  lines.push(`1 SEX ${individual.gender === "female" ? "F" : "M"}`);
  writeLifeEvent(lines, 1, "BIRT", individual.birth);
  writeLifeEvent(lines, 1, "DEAT", individual.death);
  if (individual.biography.trim()) {
    lines.push(`1 NOTE ${individual.biography.trim()}`);
  }
  if (individual.avatarUrl.trim()) {
    lines.push(`1 _AVATAR ${individual.avatarUrl.trim()}`);
  }
  for (const photo of individual.gallery) {
    if (photo.caption.trim()) {
      lines.push(`1 _PHOTO ${photo.caption.trim()}`);
    }
  }
  for (const famsId of individual.fams) {
    lines.push(`1 FAMS ${pointer(famsId)}`);
  }
  if (individual.famc) {
    lines.push(`1 FAMC ${pointer(individual.famc)}`);
  }
}

function writeUnion(lines: string[], union: Union, individuals: Record<string, Individual>) {
  lines.push(`0 ${pointer(union.id)} FAM`);

  for (const partnerId of union.partnerIds) {
    const partner = individuals[partnerId];
    const role = partner?.gender === "female" ? "WIFE" : "HUSB";
    lines.push(`1 ${role} ${pointer(partnerId)}`);
  }

  for (const childId of union.childIds) {
    lines.push(`1 CHIL ${pointer(childId)}`);
  }

  writeLifeEvent(lines, 1, "MARR", union.marriage);
  writeLifeEvent(lines, 1, "DIV", union.divorce);
}

/** Serialize a {@link FamilyGraph} back to GEDCOM 5.5.1 text. */
export function serializeGedcom(graph: FamilyGraph, head = DEFAULT_HEAD): string {
  const lines: string[] = [head];

  const sortedIndividuals = Object.values(graph.individuals).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const individual of sortedIndividuals) {
    writeIndividual(lines, individual);
  }

  const sortedUnions = Object.values(graph.unions).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const union of sortedUnions) {
    writeUnion(lines, union, graph.individuals);
  }

  lines.push("0 TRLR");
  return `${lines.join("\n")}\n`;
}
