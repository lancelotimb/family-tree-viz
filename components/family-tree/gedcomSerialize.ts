import type { FamilyGraph, Individual, LifeEvent, MediaItem, Union } from "./types";
import { writeMultilineText } from "./gedcomText";

const DEFAULT_HEAD = `0 HEAD
1 SOUR family-tree-viz
1 GEDC
2 VERS 5.5.1
2 FORM LINEAGE-LINKED
1 CHAR UTF-8`;

/** Preserve the HEAD block from an existing GEDCOM file when re-serializing. */
export function extractGedcomHead(text: string): string {
  const match = text.match(/^0 @.+ (INDI|FAM|OBJE)/m);
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
  const dateValue =
    event.date?.trim() || (event.year !== null ? String(event.year) : "");
  const hasPlace = Boolean(event.place?.trim());
  if (!dateValue && !hasPlace) return;

  lines.push(`${level} ${tag}`);
  if (dateValue) lines.push(`${level + 1} DATE ${dateValue}`);
  if (hasPlace) lines.push(`${level + 1} PLAC ${event.place!.trim()}`);
}

function writeIndividual(
  lines: string[],
  individual: Individual,
  media: Record<string, MediaItem>,
) {
  lines.push(`0 ${pointer(individual.id)} INDI`);
  lines.push(`1 NAME ${formatGedcomName(individual)}`);
  lines.push(`1 SEX ${individual.gender === "female" ? "F" : "M"}`);
  writeLifeEvent(lines, 1, "BIRT", individual.birth);
  writeLifeEvent(lines, 1, "DEAT", individual.death);
  writeMultilineText(lines, 1, "NOTE", individual.biography);
  if (individual.avatarUrl.trim()) {
    lines.push(`1 _AVATAR ${individual.avatarUrl.trim()}`);
  }
  for (const item of Object.values(media)) {
    if (item.taggedPersonIds.includes(individual.id)) {
      lines.push(`1 OBJE ${pointer(item.id)}`);
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

function imageFormatFromUrl(url: string): string {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "gif") return "gif";
  if (ext === "jpg" || ext === "jpeg") return "jpeg";
  return "webp";
}

function writeMedia(lines: string[], item: MediaItem) {
  if (!item.url.trim()) return;
  lines.push(`0 ${pointer(item.id)} OBJE`);
  lines.push(`1 FILE ${item.url.trim()}`);
  lines.push(`2 FORM ${imageFormatFromUrl(item.url)}`);
  writeMultilineText(lines, 1, "NOTE", item.legend);
  for (const personId of item.taggedPersonIds) {
    lines.push(`1 _TAG ${pointer(personId)}`);
  }
}

/** Serialize a {@link FamilyGraph} back to GEDCOM 5.5.1 text. */
export function serializeGedcom(graph: FamilyGraph, head = DEFAULT_HEAD): string {
  const lines: string[] = [head];

  const sortedIndividuals = Object.values(graph.individuals).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const individual of sortedIndividuals) {
    writeIndividual(lines, individual, graph.media);
  }

  const sortedUnions = Object.values(graph.unions).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const union of sortedUnions) {
    writeUnion(lines, union, graph.individuals);
  }

  const sortedMedia = Object.values(graph.media).sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  for (const item of sortedMedia) {
    writeMedia(lines, item);
  }

  lines.push("0 TRLR");
  return `${lines.join("\n")}\n`;
}
