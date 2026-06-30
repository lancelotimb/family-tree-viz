import type {
  FamilyGraph,
  Individual,
  LifeEvent,
  MediaItem,
  MemberGender,
  Union,
} from "./types";
import { parseMultilineText } from "./gedcomText";

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
  const date = child(node, "DATE")?.value?.trim();
  return {
    date: date || undefined,
    year: parseYear(node),
    place: child(node, "PLAC")?.value,
  };
}

function fallbackFamilyName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts[parts.length - 1]?.toUpperCase() ?? "UNKNOWN";
}

/** Split a GEDCOM given-name string into first and middle name parts. */
export function splitGivenName(given: string): {
  firstName: string;
  middleNames: string;
} {
  const normalized = given.replace(/\s+/g, " ").trim();
  if (!normalized) return { firstName: "", middleNames: "" };

  const primary = normalized.split(",")[0]?.trim() ?? normalized;
  const parts = primary.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: primary, middleNames: "" };
  }

  return {
    firstName: parts[0]!,
    middleNames: parts.slice(1).join(" "),
  };
}

/** First name + surname for tree card labels (middle names omitted). */
export function treeCardName(firstName: string, familyName: string): string {
  return `${firstName} ${familyName}`;
}

function parseName(node: GedcomNode): {
  name: string;
  firstName: string;
  middleNames: string;
  familyName: string;
} {
  const nameNode = child(node, "NAME");
  const raw = nameNode?.value ?? "Unknown";
  const name = raw.replace(/\//g, "").replace(/\s+/g, " ").trim();

  let givenPart = raw.split("/")[0]?.trim() ?? "";
  const givn = nameNode ? child(nameNode, "GIVN")?.value?.trim() : undefined;
  if (givn) givenPart = givn;

  const { firstName: parsedFirst, middleNames } = splitGivenName(givenPart);
  const firstName =
    parsedFirst || name.split(/\s+/).filter(Boolean)[0] || "Unknown";

  const familyName = raw.match(/\/([^/]+)\//)?.[1]?.trim().toUpperCase();
  return {
    name,
    firstName,
    middleNames,
    familyName: familyName || fallbackFamilyName(name),
  };
}

function parseGender(node: GedcomNode): MemberGender {
  return child(node, "SEX")?.value?.toUpperCase() === "F" ? "female" : "male";
}

function parseIndividual(node: GedcomNode): Individual {
  const birthNode = child(node, "BIRT");
  const deathNode = child(node, "DEAT");
  const { name, firstName, middleNames, familyName } = parseName(node);

  return {
    id: node.xref!,
    name,
    firstName,
    middleNames,
    familyName,
    gender: parseGender(node),
    birth: parseEvent(birthNode) ?? { year: null },
    death: deathNode ? (parseEvent(deathNode) ?? { year: null }) : null,
    biography: childrenWith(node, "NOTE")
      .map((n) => parseMultilineText(n))
      .join(" ")
      .trim(),
    avatarUrl: child(node, "_AVATAR")?.value ?? "",
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

function parseMedia(node: GedcomNode): MediaItem {
  const fileNode = child(node, "FILE");
  return {
    id: node.xref!,
    url: fileNode?.value?.trim() ?? "",
    legend: parseMultilineText(child(node, "NOTE")),
    taggedPersonIds: childrenWith(node, "_TAG").map((tag) =>
      stripPointer(tag.value ?? ""),
    ),
  };
}

function migrateLegacyPhotos(
  records: GedcomNode[],
  media: Record<string, MediaItem>,
): void {
  for (const record of records) {
    if (record.tag !== "INDI" || !record.xref) continue;
    const personId = record.xref;
    childrenWith(record, "_PHOTO").forEach((photo, index) => {
      const id = `legacy-${personId}-photo-${index}`;
      if (media[id]) return;
      media[id] = {
        id,
        url: "",
        legend: photo.value ?? "",
        taggedPersonIds: [personId],
      };
    });
  }
}

function syncMediaTagsFromIndividuals(
  records: GedcomNode[],
  media: Record<string, MediaItem>,
): void {
  for (const record of records) {
    if (record.tag !== "INDI" || !record.xref) continue;
    for (const obje of childrenWith(record, "OBJE")) {
      const mediaId = stripPointer(obje.value ?? "");
      const item = media[mediaId];
      if (!item) continue;
      if (!item.taggedPersonIds.includes(record.xref)) {
        item.taggedPersonIds.push(record.xref);
      }
    }
  }
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

/** Back-fill missing FAMC pointers from FAM `CHIL` links (common GEDCOM omission). */
function linkChildrenToBirthFamilies(
  unions: Record<string, Union>,
  individuals: Record<string, Individual>,
): void {
  for (const union of Object.values(unions)) {
    for (const childId of union.childIds) {
      const child = individuals[childId];
      if (child && !child.famc) {
        child.famc = union.id;
      }
    }
  }
}

/** Parse a GEDCOM document into a {@link FamilyGraph} (generations unset). */
export function parseGedcom(text: string): FamilyGraph {
  const individuals: Record<string, Individual> = {};
  const unions: Record<string, Union> = {};
  const media: Record<string, MediaItem> = {};
  const indiNodes: Record<string, GedcomNode> = {};
  const records = parseRecords(text);

  for (const record of records) {
    if (!record.xref) continue;
    if (record.tag === "INDI") {
      indiNodes[record.xref] = record;
      individuals[record.xref] = parseIndividual(record);
    } else if (record.tag === "FAM") {
      unions[record.xref] = parseUnion(record);
    } else if (record.tag === "OBJE") {
      media[record.xref] = parseMedia(record);
    }
  }

  migrateLegacyPhotos(records, media);
  syncMediaTagsFromIndividuals(records, media);

  for (const record of records) {
    if (record.tag === "FAM" && record.xref) {
      applyFamilyRoleGenders(record, individuals, indiNodes);
    }
  }

  linkChildrenToBirthFamilies(unions, individuals);

  return { individuals, unions, media };
}
