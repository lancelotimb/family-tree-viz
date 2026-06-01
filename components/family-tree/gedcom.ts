import type {
  FamilyGraph,
  Individual,
  LifeEvent,
  MemberGender,
  Union,
} from "./types";

import familyGedcom from "@/data/family-tree.ged";

/**
 * Canonical family data, defined as a GEDCOM document in `data/family-tree.ged`.
 * `INDI` records are people and `FAM` records are marriage/union nodes
 * (`HUSB`/`WIFE` are the partners, `CHIL` the children). The parser below turns
 * it into the {@link FamilyGraph} the app renders.
 *
 * Custom tags: `_PHOTO` holds an archival gallery caption. Biographies use the
 * standard `NOTE` tag.
 */
export const FAMILY_GEDCOM = familyGedcom;

type GedcomNode = {
  level: number;
  xref?: string;
  tag: string;
  value?: string;
  children: GedcomNode[];
};

function tokenizeLine(raw: string): Omit<GedcomNode, "children"> | null {
  const line = raw.replace(/\r$/, "").trimEnd();
  if (!line.trim()) return null;

  const levelMatch = line.match(/^(\d+)\s+(.*)$/);
  if (!levelMatch) return null;

  const level = Number(levelMatch[1]);
  const rest = levelMatch[2];

  if (rest.startsWith("@")) {
    const m = rest.match(/^(@[^@]+@)\s+(\S+)(?:\s(.*))?$/);
    if (!m) return null;
    return { level, xref: stripPointer(m[1]), tag: m[2], value: m[3] };
  }

  const m = rest.match(/^(\S+)(?:\s(.*))?$/);
  if (!m) return null;
  return { level, tag: m[1], value: m[2] };
}

function stripPointer(value: string): string {
  return value.replace(/^@/, "").replace(/@$/, "");
}

/** Build the level-based record tree from raw GEDCOM lines. */
function parseRecords(text: string): GedcomNode[] {
  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];

  for (const rawLine of text.split("\n")) {
    const token = tokenizeLine(rawLine);
    if (!token) continue;

    const node: GedcomNode = { ...token, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

const child = (node: GedcomNode, tag: string) =>
  node.children.find((c) => c.tag === tag);

const childrenWith = (node: GedcomNode, tag: string) =>
  node.children.filter((c) => c.tag === tag);

function parseYear(node: GedcomNode | undefined): number | null {
  const date = child(node ?? ({ children: [] } as unknown as GedcomNode), "DATE");
  const value = date?.value ?? node?.value;
  if (!value) return null;
  const matches = value.match(/\d{4}/g);
  return matches ? Number(matches[matches.length - 1]) : null;
}

function parseEvent(node: GedcomNode | undefined): LifeEvent | null {
  if (!node) return null;
  return { year: parseYear(node), place: child(node, "PLAC")?.value };
}

function parseName(node: GedcomNode): string {
  const raw = child(node, "NAME")?.value ?? "Unknown";
  return raw.replace(/\//g, "").replace(/\s+/g, " ").trim();
}

function parseGender(node: GedcomNode): MemberGender {
  return child(node, "SEX")?.value?.toUpperCase() === "F" ? "female" : "male";
}

function parseIndividual(node: GedcomNode): Individual {
  const birthNode = child(node, "BIRT");
  const deathNode = child(node, "DEAT");

  return {
    id: node.xref!,
    name: parseName(node),
    gender: parseGender(node),
    birth: parseEvent(birthNode) ?? { year: null },
    death: deathNode ? (parseEvent(deathNode) ?? { year: null }) : null,
    biography: childrenWith(node, "NOTE")
      .map((n) => n.value ?? "")
      .join(" ")
      .trim(),
    avatarUrl: child(node, "_AVATAR")?.value ?? "",
    gallery: childrenWith(node, "_PHOTO").map((photo, index) => ({
      id: `${node.xref}-photo-${index}`,
      caption: photo.value ?? "",
    })),
    fams: childrenWith(node, "FAMS").map((c) => stripPointer(c.value ?? "")),
    famc: child(node, "FAMC")?.value
      ? stripPointer(child(node, "FAMC")!.value!)
      : null,
    generation: 0,
  };
}

function parseUnion(node: GedcomNode): Union {
  const partnerIds = [
    ...childrenWith(node, "HUSB"),
    ...childrenWith(node, "WIFE"),
  ].map((c) => stripPointer(c.value ?? ""));

  return {
    id: node.xref!,
    partnerIds,
    childIds: childrenWith(node, "CHIL").map((c) => stripPointer(c.value ?? "")),
    marriage: parseEvent(child(node, "MARR")),
    divorce: parseEvent(child(node, "DIV")),
    generation: 0,
  };
}

function applyFamilyRoleGenders(
  fam: GedcomNode,
  individuals: Record<string, Individual>,
  indiNodes: Record<string, GedcomNode>,
): void {
  const setGender = (id: string, gender: MemberGender) => {
    const person = individuals[id];
    const node = indiNodes[id];
    if (!person || !node || child(node, "SEX")) return;
    person.gender = gender;
  };

  for (const h of childrenWith(fam, "HUSB")) {
    setGender(stripPointer(h.value ?? ""), "male");
  }
  for (const w of childrenWith(fam, "WIFE")) {
    setGender(stripPointer(w.value ?? ""), "female");
  }
}

/** Parse a GEDCOM document into a {@link FamilyGraph} (generations unset). */
export function parseGedcom(text: string): FamilyGraph {
  const individuals: Record<string, Individual> = {};
  const unions: Record<string, Union> = {};
  const indiNodes: Record<string, GedcomNode> = {};
  const records = parseRecords(text);

  for (const record of records) {
    if (!record.xref) continue;
    if (record.tag === "INDI") {
      indiNodes[record.xref] = record;
      individuals[record.xref] = parseIndividual(record);
    } else if (record.tag === "FAM") {
      unions[record.xref] = parseUnion(record);
    }
  }

  for (const record of records) {
    if (record.tag === "FAM" && record.xref) {
      applyFamilyRoleGenders(record, individuals, indiNodes);
    }
  }

  return { individuals, unions };
}
